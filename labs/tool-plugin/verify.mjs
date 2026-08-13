#!/usr/bin/env node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const dshVersion = "0.1.0-rc.6";
const profileName = "demo";
const pluginPath = "./labs/tool-plugin";

function safeEnv(home) {
  const env = { ...process.env, DSH_HOME: home };
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
      rejectRun(new Error(`command timed out: ${args.join(" ")}`));
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

function runUntilRegistered(home) {
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
      if (output.includes("[greet-tool] registered greet")) {
        child.kill("SIGINT");
        finish(null, { output, loaded: true });
      }
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error("profile boot did not register greet before timeout"));
    }, 30000);
    child.stdout.on("data", onChunk);
    child.stderr.on("data", onChunk);
    child.once("error", (error) => finish(error));
    child.once("close", (code, signal) => {
      if (output.includes("[greet-tool] registered greet")) {
        finish(null, { output, code, signal, loaded: true });
      } else {
        finish(new Error(`profile boot did not register greet (exit=${code ?? "null"}, signal=${signal ?? "none"})`));
      }
    });
  });
}

function assertIncludes(value, needle, label) {
  if (!value.includes(needle)) throw new Error(`${label} missing ${needle}`);
}

const home = await mkdtemp(join(tmpdir(), "dsh-learn-tool-plugin-"));
try {
  const version = await runDsh(home, ["--version"]);
  if (version.code !== 0) throw new Error(`version command failed: ${version.stderr}`);
  assertIncludes(version.stdout, dshVersion, "version output");

  const installed = await runDsh(home, ["plugin", "--profile", profileName, "add", pluginPath]);
  if (installed.code !== 0) throw new Error(`plugin install failed: ${installed.stderr || installed.stdout}`);

  const manifestPath = join(home, "profiles", profileName, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const bundles = manifest?.dsh?.profile?.bundles ?? [];
  if (!bundles.includes("dsh-greet-tool")) throw new Error("profile manifest does not include dsh-greet-tool");

  const dump = await runDsh(home, ["--profile", profileName, "--dump-config"]);
  if (dump.code !== 0) throw new Error(`config dump failed: ${dump.stderr || dump.stdout}`);
  assertIncludes(`${dump.stdout}\n${dump.stderr}`, "dsh-greet-tool", "config dump");
  assertIncludes(`${dump.stdout}\n${dump.stderr}`, "greet-tool", "config dump");

  await runUntilRegistered(home);

  const removed = await runDsh(home, ["plugin", "--profile", profileName, "remove", "dsh-greet-tool"]);
  if (removed.code !== 0) throw new Error(`plugin remove failed: ${removed.stderr || removed.stdout}`);
  const removedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const remaining = removedManifest?.dsh?.profile?.bundles ?? [];
  if (remaining.includes("dsh-greet-tool")) throw new Error("profile manifest still includes dsh-greet-tool after remove");

  console.log("PASS tool-plugin register/schema/remove without API key; model invocation NOT_RUN");
} finally {
  await rm(home, { recursive: true, force: true });
}
