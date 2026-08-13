#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const [jsonPath, markdownPath, probePath] = process.argv.slice(2);
if (!jsonPath || !markdownPath || !probePath) {
  console.error("usage: node scripts/validate-cordis-lab.mjs <compatibility.json> <README.md> <probe.mjs>");
  process.exit(2);
}

const matrix = JSON.parse(await readFile(jsonPath, "utf8"));
const markdown = await readFile(markdownPath, "utf8");
const probe = await readFile(probePath, "utf8");
const errors = [];
if (matrix.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (matrix.dshBaseline?.commit !== "47f943859bef60e4160492346772ded9b24f765a") errors.push("baseline commit is not pinned");
if (matrix.dshBaseline?.version !== "0.1.0-rc.6") errors.push("package version is not pinned");
for (const name of ["version", "profile-init", "dump-config", "model-request", "third-party-plugin", "runtime-seam"]) {
  if (!matrix.checks?.some((check) => check.name === name)) errors.push(`missing check: ${name}`);
}
for (const section of ["固定基线", "运行实验", "你应该看到什么", "这个实验没有证明什么", "继续练习"]) {
  if (!markdown.includes(section)) errors.push(`README missing section: ${section}`);
}
for (const marker of ["DSH_HOME", "dump-config", "@deepseek-ai/dsh@0.1.0-rc.6", "profiles", "no model request"]) {
  if (!probe.includes(marker)) errors.push(`probe missing marker: ${marker}`);
}
if (/sk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}/.test(`${markdown}\n${probe}`)) {
  errors.push("secret-like token detected");
}
if (errors.length) {
  console.error(`FAIL ${markdownPath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${markdownPath} checks=${matrix.checks.length}`);
