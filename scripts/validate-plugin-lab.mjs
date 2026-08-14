#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const [compatibilityPath, readmePath, packagePath, sourcePath, patchPath, probePath] = process.argv.slice(2);
if ([compatibilityPath, readmePath, packagePath, sourcePath, patchPath, probePath].some((value) => !value)) {
  console.error("usage: node scripts/validate-plugin-lab.mjs <compatibility.json> <README.md> <package.json> <index.js> <cordis.patch.yml> <verify.mjs>");
  process.exit(2);
}

const [compatibility, readme, packageText, source, patch, probe] = await Promise.all([
  readFile(compatibilityPath, "utf8").then(JSON.parse),
  readFile(readmePath, "utf8"),
  readFile(packagePath, "utf8").then(JSON.parse),
  readFile(sourcePath, "utf8"),
  readFile(patchPath, "utf8"),
  readFile(probePath, "utf8"),
]);
const errors = [];
if (compatibility.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (compatibility.dshBaseline?.commit !== "47f943859bef60e4160492346772ded9b24f765a") errors.push("baseline commit is not pinned");
if (compatibility.dshBaseline?.version !== "0.1.0-rc.6") errors.push("package version is not pinned");
for (const name of ["version", "profile-init", "profile-install", "dump-config", "plugin-load", "plugin-remove", "no-api-key"]) {
  if (!compatibility.checks?.some((check) => check.name === name && check.status === "PASS")) errors.push(`missing PASS check: ${name}`);
}
if (packageText.name !== "dsh-hello-plugin") errors.push("package name mismatch");
if (packageText.dsh?.bundle?.patch !== "./cordis.patch.yml") errors.push("missing dsh.bundle.patch");
for (const marker of ["DSH_HOME", "dsh plugin", "dump-config", "loaded", "remove", "没有 API Key", "没有启动 Web UI"]) {
  if (!readme.includes(marker)) errors.push(`README missing marker: ${marker}`);
}
for (const marker of ["export const name", "ctx.effect", "loaded", "unloaded"]) {
  if (!source.includes(marker)) errors.push(`plugin source missing marker: ${marker}`);
}
for (const marker of ["dsh-hello-plugin", "id: hello-plugin"]) {
  if (!patch.includes(marker)) errors.push(`patch missing marker: ${marker}`);
}
for (const marker of ["DSH_HOME", "plugin", "dump-config", "remove", "DEEPSEEK_API_KEY", "BLOCKED_NETWORK", "plugin-doctor.mjs --network", "网络、DNS、代理或防火墙"]) {
  if (!probe.includes(marker)) errors.push(`probe missing marker: ${marker}`);
}
if (/sk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}/.test(`${readme}\n${packageText}\n${source}\n${patch}\n${probe}`)) {
  errors.push("secret-like token detected");
}
if (errors.length) {
  console.error(`FAIL ${readmePath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${readmePath} checks=${compatibility.checks.length}`);
