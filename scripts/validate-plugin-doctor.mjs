#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";

const scriptPath = "scripts/plugin-doctor.mjs";
const script = await readFile(scriptPath, "utf8");
const failures = [];
for (const item of [
  "DSH 插件实验前置检查",
  "pnpm",
  "npm install --global pnpm",
  "node scripts/plugin-doctor.mjs",
  "labs/hello-plugin/verify.mjs",
  "--network",
  "npm registry 可达",
  "网络、DNS、代理或防火墙",
]) {
  if (!script.includes(item)) failures.push(`missing ${item}`);
}
if (/sk-[A-Za-z0-9]{20,}/.test(script)) failures.push("possible API key pattern");

const normal = execFileSync(process.execPath, [scriptPath], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (!normal.includes("PASS 可以进入 hello-plugin 安装实验")) failures.push("runtime success path missing");

try {
  execFileSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: { ...process.env, PATH: "/usr/bin:/bin" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  failures.push("missing pnpm path unexpectedly passed");
} catch (error) {
  const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  for (const item of ["FAIL pnpm 未找到", "DSH 的 plugin 子命令", "npm install --global pnpm"]) {
    if (!output.includes(item)) failures.push(`missing failure guidance ${item}`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS ${scriptPath} checks=12`);
