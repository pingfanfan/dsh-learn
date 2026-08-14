#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dshVersion = "0.1.0-rc.6";
const dshArgs = ["--yes", `@deepseek-ai/dsh@${dshVersion}`, "web", ...process.argv.slice(2)];

function npxExecutable() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function nodeMeetsDshRequirement(version) {
  const [major, minor] = version.split(".").map(Number);
  return major >= 24 || (major === 22 && minor >= 19);
}

function safeEnv() {
  const env = {
    ...process.env,
    NPM_CONFIG_FETCH_RETRIES: "0",
    NPM_CONFIG_FETCH_TIMEOUT: "10000",
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: "1000",
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: "2000",
  };
  delete env.DEEPSEEK_API_KEY;
  delete env.DEEPSEEK_API_KEY_ENV;
  return env;
}

function hasNpx() {
  try {
    const version = execFileSync(npxExecutable(), ["--version"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return Boolean(version);
  } catch {
    return false;
  }
}

function isNetworkFailure(output) {
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|fetch failed|network request|registry\.npmjs\.org/i.test(output);
}

function guidance(output) {
  if (isNetworkFailure(output)) {
    return "BLOCKED_NETWORK 无法从 npm registry 下载 DSH。请先检查网络、DNS、代理或防火墙，恢复后重新运行 node scripts/beginner-start.mjs。";
  }
  if (/EBADENGINE|Unsupported engine|requires a different node version/i.test(output)) {
    return "FAIL_NODE_VERSION 当前 Node.js 版本不满足 DSH 要求。请安装 22.19.0+ 的 22.x，或 24.x 及以上版本，再重新打开终端。";
  }
  if (/EADDRINUSE|address already in use|port.*(?:in use|occupied)/i.test(output)) {
    return "FAIL_PORT DSH 默认端口可能已经被占用。先关闭另一个 DSH 进程，或查看终端提示后使用一个空闲端口重新启动。";
  }
  return "FAIL_DSH_START DSH 没有启动成功。请保留上方最后几行输出，并先运行 node scripts/beginner-doctor.mjs 检查 Node.js、npm、npx 和路径。";
}

if (!nodeMeetsDshRequirement(process.versions.node)) {
  console.error(`FAIL_NODE_VERSION 当前 Node.js ${process.versions.node} 不满足 DSH 要求，需要 22.19.0+ 的 22.x，或 24.x 及以上版本。`);
  process.exit(1);
}
if (!hasNpx()) {
  console.error("FAIL_NPX 找不到 npx，请重新安装 Node.js，然后重新打开终端。没有发起网络请求，也没有读取 API Key。");
  process.exit(1);
}

console.log(`DSH 新手启动入口：固定使用 @deepseek-ai/dsh@${dshVersion}`);
console.log("启动期间请保持这个终端窗口打开，浏览器访问 http://127.0.0.1:3080。按 Ctrl-C 可以停止 DSH。");

const child = spawn(npxExecutable(), dshArgs, {
  cwd: root,
  env: safeEnv(),
  stdio: ["inherit", "pipe", "pipe"],
});
let output = "";
const forward = (stream, target) => {
  stream.on("data", (chunk) => {
    const text = String(chunk);
    output += text;
    target.write(text);
  });
};
forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`\n${guidance(String(error))}`);
  process.exitCode = 1;
});
child.once("close", (code, signal) => {
  if (signal === "SIGINT" || signal === "SIGTERM" || code === 0) {
    process.exitCode = 0;
    return;
  }
  console.error(`\n${guidance(output)}`);
  process.exitCode = 1;
});
