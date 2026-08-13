import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Channel } from "../types.ts";
import { AgentBridgeAdapter } from "./agent-bridge.ts";
import { LocalAdapter } from "./local.ts";
import type { ChannelAdapter, ChannelConfig } from "./types.ts";

type ChannelConfigFile = Partial<Record<Exclude<Channel, "local">, ChannelConfig>>;

export async function loadAdapters(root: string): Promise<Map<Channel, ChannelAdapter>> {
  const path = join(root, "ops", "channels.json");
  const raw = await readFile(path, "utf8");
  const config = parseChannelConfig(JSON.parse(raw));
  const adapters = new Map<Channel, ChannelAdapter>();
  adapters.set("local", new LocalAdapter(root));
  for (const channel of ["github", "weibo", "zhihu", "wechat", "x"] as const) {
    const value = config[channel] ?? { enabled: false, mode: "DISABLED", reason: "未配置" };
    adapters.set(channel, new AgentBridgeAdapter(channel, root, value));
  }
  return adapters;
}

function parseChannelConfig(value: unknown): ChannelConfigFile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("channel config must be an object");
  }
  const object = value as Record<string, unknown>;
  const allowedChannels = new Set(["github", "weibo", "zhihu", "wechat", "x"]);
  const unknownChannels = Object.keys(object).filter((key) => !allowedChannels.has(key));
  if (unknownChannels.length > 0) throw new Error(`channel config contains unknown channels: ${unknownChannels.join(", ")}`);
  const result: ChannelConfigFile = {};
  for (const channel of allowedChannels) {
    const raw = object[channel];
    if (raw === undefined) continue;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error(`channel ${channel} config must be an object`);
    const item = raw as Record<string, unknown>;
    const unknown = Object.keys(item).filter((key) => !["enabled", "mode", "requiresApproval", "reason"].includes(key));
    if (unknown.length > 0) throw new Error(`channel ${channel} contains unknown fields: ${unknown.join(", ")}`);
    if (typeof item.enabled !== "boolean") throw new Error(`channel ${channel} enabled must be boolean`);
    if (typeof item.mode !== "string" || !["DRAFT_ONLY", "UNAVAILABLE", "DISABLED"].includes(item.mode)) {
      throw new Error(`channel ${channel} mode is invalid`);
    }
    if (item.requiresApproval !== undefined && typeof item.requiresApproval !== "boolean") {
      throw new Error(`channel ${channel} requiresApproval must be a boolean`);
    }
    if (item.reason !== undefined && typeof item.reason !== "string") throw new Error(`channel ${channel} reason must be a string`);
    if (item.mode !== "DRAFT_ONLY" && item.enabled) throw new Error(`channel ${channel} cannot be enabled in ${item.mode} mode`);
    result[channel as Exclude<Channel, "local">] = {
      enabled: item.enabled,
      mode: item.mode as ChannelConfig["mode"],
      requiresApproval: item.requiresApproval === true,
      reason: item.reason as string | undefined,
    };
  }
  return result;
}
