#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const requestedPath = process.argv[2] ?? "./labs/tool-plugin/index.js";
const requestedAbsolutePath = resolve(process.cwd(), requestedPath);
const failures = [];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeErrorLabel(error) {
  if (error instanceof Error && error.name) return error.name;
  return "UnknownError";
}

let pluginPath = requestedAbsolutePath;
try {
  if ((await stat(pluginPath)).isDirectory()) pluginPath = resolve(pluginPath, "index.js");
} catch {
  failures.push("找不到本地插件入口");
}

let plugin;
if (failures.length === 0) {
  try {
    plugin = await import(pathToFileURL(pluginPath).href);
  } catch (error) {
    failures.push(`插件加载失败（${safeErrorLabel(error)}）`);
  }
}

const registered = [];
if (failures.length === 0) {
  if (!Array.isArray(plugin.inject) || !plugin.inject.includes("tools")) {
    failures.push("插件没有声明 inject = [\"tools\"]");
  }
  if (typeof plugin.apply !== "function") {
    failures.push("插件没有导出 apply(ctx)");
  } else {
    try {
      await plugin.apply({
        tools: {
          register(definition) {
            registered.push(definition);
          },
          schemas() {
            return registered;
          },
        },
      });
    } catch (error) {
      failures.push(`插件注册失败（${safeErrorLabel(error)}）`);
    }
  }
}

if (registered.length === 0) failures.push("没有注册任何工具");

for (const [index, tool] of registered.entries()) {
  const label = isObject(tool) && typeof tool.name === "string" && tool.name
    ? `工具 ${tool.name}`
    : `第 ${index + 1} 个工具`;
  if (!isObject(tool)) {
    failures.push(`${label}不是对象`);
    continue;
  }
  if (typeof tool.name !== "string" || !tool.name.trim()) {
    failures.push(`${label}缺少 name`);
  }
  if (!isObject(tool.parameters) || tool.parameters.type !== "object") {
    failures.push(`${label}的 parameters.type 必须是 "object"；请使用 JSON Schema 的对象根`);
  }
  if (typeof tool.execute !== "function") {
    failures.push(`${label}缺少 execute(args)`);
  }
}

if (failures.length > 0) {
  console.error("FAIL 工具 schema 体检未通过");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("这只是本地注册检查，不会调用模型；修复后重新运行同一条命令。");
  process.exit(1);
}

console.log(`PASS 工具 schema 体检：${registered.length} 个工具`);
console.log("PASS parameters.type = object");
console.log("LOCAL_ONLY 不联网、不调用模型；插件自身导入代码的副作用仍需先审阅");
