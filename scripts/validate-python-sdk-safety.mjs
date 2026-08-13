#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const [jsonPath, markdownPath, pythonPath] = process.argv.slice(2);
if (!jsonPath || !markdownPath || !pythonPath) {
  console.error("usage: node scripts/validate-python-sdk-safety.mjs <matrix.json> <README.md> <preflight.py>");
  process.exit(2);
}

const matrix = JSON.parse(await readFile(jsonPath, "utf8"));
const markdown = await readFile(markdownPath, "utf8");
const python = await readFile(pythonPath, "utf8");
const errors = [];
if (matrix.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (matrix.dshBaseline?.commit !== "47f943859bef60e4160492346772ded9b24f765a") errors.push("baseline commit is not pinned");
for (const name of ["official-install-shape", "isolated-workspace", "session-log-boundary", "danger-full-access", "model-request", "provider-keyed-smoke", "headless-acp-runtime"]) {
  if (!matrix.checks?.some((check) => check.name === name)) errors.push(`missing check: ${name}`);
}
for (const section of ["官方示例里最值得先处理的三个事实", "先跑无 Key 前置检查", "有授权后再接官方 SDK", "配方状态矩阵", "生产前最小清单"]) {
  if (!markdown.includes(section)) errors.push(`README missing section: ${section}`);
}
for (const marker of ["DEEPSEEK_API_KEY", "BLOCKED_NO_CREDENTIAL", "session-root", "0o700", "model request was attempted"]) {
  if (!python.includes(marker)) errors.push(`preflight missing marker: ${marker}`);
}
if (/sk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}/.test(`${markdown}\n${python}`)) {
  errors.push("secret-like token detected");
}
if (markdown.includes("DEEPSEEK_API_KEY=")) errors.push("README must not include a literal credential assignment");
if (errors.length) {
  console.error(`FAIL ${markdownPath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${markdownPath} checks=${matrix.checks.length}`);
