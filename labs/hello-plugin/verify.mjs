#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const dshVersion = "0.1.0-rc.6";
const profileName = "demo";
const pluginPath = "./labs/hello-plugin";

function assertPnpmAvailable() {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  try {
    const version = execFileSync(executable, ["--version"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!version) throw new Error("empty version");
  } catch {
    throw new Error("找不到 pnpm。请先运行 node scripts/plugin-doctor.mjs，按提示安装 pnpm，再重新运行这个实验。Web UI 启动本身不需要 pnpm。");
  }
}

function safeEnv(home) {
  const env = {
    ...process.env,
    DSH_HOME: home,
    // npm can retry DNS failures for a long time. The lab should fail fast and
    // tell a beginner that the registry is unreachable, instead of looking
    // like the plugin itself is frozen.
    NPM_CONFIG_FETCH_RETRIES: "0",
    NPM_CONFIG_FETCH_TIMEOUT: "10000",
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: "1000",
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: "2000",
  };
  delete env.DEEPSEEK_API_KEY;
  delete env.DEEPSEEK_API_KEY_ENV;
  return env;
}

function runDsh(home, args, { timeoutMs = 60000 } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("npx", ["--yes", `@deepseek-ai/dsh@${dshVersion}`, ...args], {
      cwd: root,
      env: safeEnv(home),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      rejectRun(new Error(`command timed out: ${args.join(" ")}; npm registry may be unreachable, check network and npm registry before retrying`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolveRun({ code, signal, stdout, stderr });
    });
  });
}

function runUntilLoaded(home) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("npx", ["--yes", `@deepseek-ai/dsh@${dshVersion}`, "--profile", profileName], {
      cwd: root,
      env: safeEnv(home),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) rejectRun(error);
      else resolveRun(result);
    };
    const onChunk = (chunk) => {
      output += chunk;
      if (output.includes("[hello-plugin] loaded")) {
        child.kill("SIGINT");
        finish(null, { output, loaded: true });
      }
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error("profile boot did not load hello-plugin before timeout"));
    }, 30000);
    child.stdout.on("data", onChunk);
    child.stderr.on("data", onChunk);
    child.once("error", (error) => finish(error));
    child.once("close", (code, signal) => {
      if (output.includes("[hello-plugin] loaded")) {
        finish(null, { output, code, signal, loaded: true });
      } else {
        finish(new Error(`profile boot did not load hello-plugin (exit=${code ?? "null"}, signal=${signal ?? "none"})`));
      }
    });
  });
}

function assertIncludes(value, needle, label) {
  if (!value.includes(needle)) {
    throw new Error(`${label} missing ${needle}`);
  }
}

function isNetworkFailure(value) {
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|fetch failed|network request|registry\.npmjs\.org/i.test(value);
}

function networkBlockedMessage() {
  return "BLOCKED_NETWORK 无法连接 npm registry，插件代码尚未进入安装验证。请先运行 node scripts/plugin-doctor.mjs --network，检查网络、DNS、代理或防火墙，恢复后再运行 node labs/hello-plugin/verify.mjs。";
}

function commandFailure(label, result) {
  const output = `${result.stderr}\n${result.stdout}`;
  if (isNetworkFailure(output)) throw new Error(networkBlockedMessage());
  throw new Error(`${label} 未完成（退出码 ${result.code ?? "未知"}）。请查看上方步骤并重试。`);
}

const home = await mkdtemp(join(tmpdir(), "dsh-learn-plugin-"));
try {
  assertPnpmAvailable();
  const version = await runDsh(home, ["--version"]);
  if (version.code !== 0) commandFailure("DSH 版本检查", version);
  assertIncludes(version.stdout, dshVersion, "version output");

  const installed = await runDsh(home, ["plugin", "--profile", profileName, "add", pluginPath]);
  if (installed.code !== 0) commandFailure("插件安装", installed);

  const manifestPath = join(home, "profiles", profileName, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const bundles = manifest?.dsh?.profile?.bundles ?? [];
  if (!bundles.includes("dsh-hello-plugin")) {
    throw new Error("profile manifest does not include dsh-hello-plugin");
  }

  const dump = await runDsh(home, ["--profile", profileName, "--dump-config"]);
  if (dump.code !== 0) commandFailure("配置导出", dump);
  assertIncludes(`${dump.stdout}\n${dump.stderr}`, "dsh-hello-plugin", "config dump");
  assertIncludes(`${dump.stdout}\n${dump.stderr}`, "hello-plugin", "config dump");

  await runUntilLoaded(home);

  const removed = await runDsh(home, ["plugin", "--profile", profileName, "remove", "dsh-hello-plugin"]);
  if (removed.code !== 0) commandFailure("插件移除", removed);
  const removedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const remaining = removedManifest?.dsh?.profile?.bundles ?? [];
  if (remaining.includes("dsh-hello-plugin")) {
    throw new Error("profile manifest still includes dsh-hello-plugin after remove");
  }

  console.log("PASS hello-plugin install/load/remove without API key");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("BLOCKED_NETWORK")) {
    console.error(message);
  } else {
    console.error(`FAIL ${message}`);
  }
  process.exitCode = 1;
} finally {
  await rm(home, { recursive: true, force: true });
}
