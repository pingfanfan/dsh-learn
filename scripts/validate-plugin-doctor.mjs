#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

const fakeBin = await mkdtemp(join(tmpdir(), "dsh-learn-plugin-doctor-"));
try {
  const fakeNpm = join(fakeBin, process.platform === "win32" ? "npm.cmd" : "npm");
  const fakeNpmScript = process.platform === "win32"
    ? "@echo off\r\nif \"%1\"==\"--version\" echo 99.0.0\r\nif \"%1\"==\"view\" echo 0.1.0-rc.6\r\n"
    : "#!/bin/sh\ncase \"$1\" in\n  --version) echo 99.0.0 ;;\n  view) echo 0.1.0-rc.6 ;;\n  *) exit 1 ;;\nesac\n";
  await writeFile(fakeNpm, fakeNpmScript, "utf8");
  if (process.platform !== "win32") await chmod(fakeNpm, 0o755);
  const fakeNetwork = execFileSync(process.execPath, [scriptPath, "--network"], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${fakeBin}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!fakeNetwork.includes("PASS npm registry 可达")) failures.push("npm registry success path missing");
} catch (error) {
  const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  failures.push(`npm registry success path failed: ${output.trim().split("\n").at(-1) ?? "unknown"}`);
} finally {
  await rm(fakeBin, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`FAIL ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS ${scriptPath} checks=12`);
