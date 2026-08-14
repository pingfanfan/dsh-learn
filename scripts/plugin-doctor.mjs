#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

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
  const registry = "https://registry.npmjs.org";
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const configDir = await mkdtemp(resolve(tmpdir(), "dsh-learn-npm-check-"));
  const userConfig = resolve(configDir, "empty.npmrc");
  try {
    // Use the same npm client that npx will use for the real experiment. An
    // isolated empty config prevents a user's private .npmrc from becoming
    // part of this preflight or its output.
    await writeFile(userConfig, "", "utf8");
    const output = execFileSync(npm, [
      "view",
      "@deepseek-ai/dsh@0.1.0-rc.6",
      "version",
      "--registry",
      registry,
      "--userconfig",
      userConfig,
      "--fetch-retries=0",
      "--fetch-timeout=5000",
      "--fetch-retry-mintimeout=1000",
      "--fetch-retry-maxtimeout=2000",
      "--audit=false",
      "--fund=false",
    ], {
      cwd: root,
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NPM_CONFIG_USERCONFIG: userConfig,
        NPM_CONFIG_REGISTRY: registry,
        NPM_CONFIG_AUDIT: "false",
        NPM_CONFIG_FUND: "false",
      },
    });
    if (!output.trim().split(/\s+/).includes("0.1.0-rc.6")) {
      throw new Error("npm did not return the requested DSH version");
    }
    console.log("PASS npm registry 可达");
    return true;
  } catch (error) {
    const rawDetail = error instanceof Error && "stderr" in error && typeof error.stderr === "string"
      ? error.stderr
      : error instanceof Error ? error.message : String(error);
    const detail = rawDetail.trim().split("\n").find((line) =>
      /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|npm error code|npm error network request|fetch failed/i.test(line),
    ) ?? rawDetail.trim().split("\n").at(-1);
    console.log(`FAIL npm registry 不可达：${detail || "npm view failed"}`);
    console.log("这通常是网络、DNS、代理或防火墙问题，不代表插件代码失败。恢复后再运行：node labs/hello-plugin/verify.mjs");
    return false;
  } finally {
    await rm(configDir, { recursive: true, force: true });
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
