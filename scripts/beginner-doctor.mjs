#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportRequested = process.argv.includes("--report");
const requiredFiles = [
  "package.json",
  "scripts/beginner-start.mjs",
  "labs/hello-plugin/verify.mjs",
  "content/canonical/dsh-zero-to-first-plugin-rc6.md",
];
const beginnerScreenshots = [
  "01-official-run-readme.jpg",
  "02-official-plugin-publish.jpg",
  "03-terminal-node-version.svg",
  "04-terminal-dsh-web.svg",
  "05-terminal-plugin.svg",
  "06-terminal-beginner-doctor.svg",
  "07-dsh-first-run-api-key-prompt.jpg",
  "08-dsh-web-ui-no-key.jpg",
  "09-nodejs-download-page.jpg",
  "10-github-download-zip.jpg",
  "11-plugin-edit-indexjs.jpg",
];

function versionOf(command) {
  const executable = process.platform === "win32" && command === "npx" ? "npx.cmd" : command;
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

function nodeMeetsDshRequirement(version) {
  const [major, minor] = version.split(".").map(Number);
  return major >= 24 || (major === 22 && minor >= 19);
}

const nodeVersion = process.versions.node;
const npmVersion = versionOf("npm");
const npxVersion = versionOf("npx");
const warnings = [];
const failures = [];

console.log("DSH 新手环境检查");

if (nodeMeetsDshRequirement(nodeVersion)) {
  console.log(`PASS Node.js ${nodeVersion}`);
} else {
  failures.push(`Node.js ${nodeVersion} 不满足 DSH 要求，需要 22.19.0+ 的 22.x，或 24.x 及以上版本`);
  console.log(`FAIL Node.js ${nodeVersion}`);
}

if (npmVersion) console.log(`PASS npm ${npmVersion}`);
else {
  failures.push("找不到 npm，请重新安装 Node.js");
  console.log("FAIL npm");
}

if (npxVersion) console.log(`PASS npx ${npxVersion}`);
else {
  failures.push("找不到 npx，请重新安装 Node.js");
  console.log("FAIL npx");
}

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
if (missing.length === 0) console.log("PASS dsh-learn 练习文件");
else {
  failures.push(`缺少练习文件：${missing.join(", ")}`);
  console.log(`FAIL dsh-learn 练习文件：${missing.join(", ")}`);
}

const missingScreenshots = beginnerScreenshots.filter((file) =>
  !existsSync(resolve(root, "content/assets/dsh-beginner", file)),
);
if (missingScreenshots.length === 0) {
  console.log(`PASS 新手截图资源 ${beginnerScreenshots.length} 张`);
} else {
  failures.push(`缺少新手截图：${missingScreenshots.join(", ")}`);
  console.log(`FAIL 新手截图资源：缺少 ${missingScreenshots.join(", ")}`);
}

const currentPath = resolve(root);
if (/[^\\x00-\\x7F]/.test(currentPath)) {
  warnings.push("当前路径含有非 ASCII 字符，遇到插件路径问题时请把项目移到只含英文和数字的短路径");
}
if (currentPath.length > 120) {
  warnings.push("当前路径较长，遇到 Windows 路径错误时请把项目移到更短的目录");
}
for (const warning of warnings) console.log(`WARN ${warning}`);

if (failures.length > 0) {
  console.log("\n请先处理上面的 FAIL，再运行 DSH。这个检查没有联网，也没有读取或发送任何 API Key。");
  process.exitCode = 1;
} else {
  console.log("\nPASS 环境可以进入 DSH 启动步骤");
  console.log("下一步：");
  console.log("node scripts/beginner-start.mjs");
  console.log("底层命令：npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web");
}

if (reportRequested) {
  const pnpmVersion = versionOf("pnpm");
  console.log("\n--- DSH 新手诊断回执（可粘贴，不含凭据） ---");
  console.log("DSH_VERSION=0.1.0-rc.6");
  console.log(`NODE_VERSION=${nodeVersion}`);
  console.log(`NPM_VERSION=${npmVersion ?? "not_found"}`);
  console.log(`NPX_VERSION=${npxVersion ?? "not_found"}`);
  console.log(`PNPM_VERSION=${pnpmVersion ?? "not_found"}`);
  console.log(`PLATFORM=${process.platform}`);
  console.log(`ARCH=${process.arch}`);
  console.log(`PROJECT_FILES=${missing.length === 0 ? "PASS" : "FAIL"}`);
  console.log(`SCREENSHOTS=${missingScreenshots.length === 0 ? "PASS" : "FAIL"}`);
  console.log(`SCREENSHOT_COUNT=${beginnerScreenshots.length - missingScreenshots.length}/${beginnerScreenshots.length}`);
  console.log("PATH=redacted");
  console.log("NETWORK=not_checked");
  console.log("KEY_STATUS=not_read");
  console.log("WEB=not_started");
  console.log("PLUGIN=not_started");
  console.log("--- DSH 新手诊断回执结束 ---");
}
