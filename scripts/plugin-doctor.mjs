#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const checkNetwork = process.argv.includes("--network");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "labs/hello-plugin/verify.mjs",
  "labs/hello-plugin/package.json",
  "labs/hello-plugin/index.js",
  "labs/hello-plugin/cordis.patch.yml",
];

function versionOf(command) {
  const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  try {
    return execFileSync(executable, ["--version"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

async function checkNpmRegistry() {
  const url = "https://registry.npmjs.org/@deepseek-ai%2fdsh";
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log("PASS npm registry 可达");
    return true;
  } catch (error) {
    console.log(`FAIL npm registry 不可达：${error instanceof Error ? error.message : String(error)}`);
    console.log("这通常是网络、DNS、代理或防火墙问题，不代表插件代码失败。恢复后再运行：node labs/hello-plugin/verify.mjs");
    return false;
  }
}

console.log("DSH 插件实验前置检查");

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
if (missing.length === 0) console.log("PASS hello-plugin 练习文件");
else console.log(`FAIL hello-plugin 练习文件：${missing.join(", ")}`);

const pnpmVersion = versionOf("pnpm");
if (pnpmVersion) {
  console.log(`PASS pnpm ${pnpmVersion}`);
} else {
  console.log("FAIL pnpm 未找到");
  console.log("DSH 的 plugin 子命令会在 profile 目录中调用 pnpm；Web UI 不需要 pnpm，但插件安装需要。");
  console.log("安装命令：npm install --global pnpm");
  console.log("安装完成后重新打开终端，再运行：node scripts/plugin-doctor.mjs");
  process.exitCode = 1;
}

if (missing.length > 0) process.exitCode = 1;
if (checkNetwork && !(await checkNpmRegistry())) process.exitCode = 1;
if (!process.exitCode) {
  console.log("PASS 可以进入 hello-plugin 安装实验");
  console.log("下一步：node labs/hello-plugin/verify.mjs");
}
