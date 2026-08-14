#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const script = new URL("./win32-path-doctor.mjs", import.meta.url);
const scriptPath = fileURLToPath(script);
const source = await readFile(scriptPath, "utf8");
const required = [
  "Buffer.from",
  "utf16le",
  "bytes[end] !== 0",
  "bytes[end] === 0 && bytes[end + 1] === 0",
  "LOCAL_ONLY",
];

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`缺少离线回归标记: ${marker}`);
}
if (/sk-[A-Za-z0-9]{20,}/.test(source) || /DEEPSEEK_API_KEY/.test(source)) {
  throw new Error("工具脚本包含凭据模式");
}

const { stdout } = await exec(process.execPath, [scriptPath], { env: { PATH: process.env.PATH } });
for (const marker of [
  "PASS 正确的 UTF-16 NUL 判定保留完整路径",
  "PASS 检出低字节为 0 时的提前截断风险",
  "LOCAL_ONLY",
]) {
  if (!stdout.includes(marker)) throw new Error(`默认夹具未通过: ${marker}`);
}

const custom = await exec(process.execPath, [scriptPath, "--path", "C:\\工作区\\项目\\开发"], { env: { PATH: process.env.PATH } });
if (!custom.stdout.includes("CORRECT_UTF16_RESULT=C:\\工作区\\项目\\开发")) {
  throw new Error("自定义中文路径没有被完整保留");
}

console.log("PASS scripts/win32-path-doctor.mjs checks=8");
