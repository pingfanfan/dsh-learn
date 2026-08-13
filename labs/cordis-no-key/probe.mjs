#!/usr/bin/env node
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const packageSpec = "@deepseek-ai/dsh@0.1.0-rc.6";
const isolatedHome = await mkdtemp(join(tmpdir(), "dsh-learn-cordis-"));

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", packageSpec, ...args], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR ?? tmpdir(),
        DSH_HOME: isolatedHome,
        npm_config_yes: "true",
        npm_config_fetch_timeout: "10000",
        npm_config_fetch_retries: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, 20000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ args, code, signal, stdout, stderr, timedOut });
    });
  });
}

try {
  const results = [];
  for (const args of [
    ["--version"],
    ["plugin", "--profile", "demo", "--help"],
    ["--profile", "demo", "--dump-config"],
  ]) {
    const result = await run(args);
    results.push(result);
    process.stdout.write(`$ npx --yes ${packageSpec} ${args.join(" ")}\n`);
    process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.code !== 0) {
      const suffix = result.timedOut ? " (timed out after 20s)" : "";
      throw new Error(`command failed: ${args.join(" ")}${suffix}`);
    }
  }

  const version = results[0].stdout.trim();
  if (version !== "0.1.0-rc.6") throw new Error(`unexpected version: ${version}`);
  const config = results[2].stdout;
  for (const marker of ["@deepseek-ai/dsh-base", "llm", "session", "sandbox"]) {
    if (!config.includes(marker)) throw new Error(`dump-config missing marker: ${marker}`);
  }

  const profileFiles = ["package.json", "cordis.patch.yml", "pnpm-workspace.yaml"];
  for (const file of profileFiles) {
    await readFile(join(isolatedHome, "profiles", "demo", file), "utf8");
  }
  console.log(`PASS isolated profile: ${isolatedHome}/profiles/demo`);
  console.log("PASS no-key CLI/profile/config smoke; no model request was made");
} finally {
  await rm(isolatedHome, { recursive: true, force: true });
}
