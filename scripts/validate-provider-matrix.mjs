#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const [jsonPath, markdownPath] = process.argv.slice(2);
if (!jsonPath || !markdownPath) {
  console.error("usage: node scripts/validate-provider-matrix.mjs <compatibility.json> <README.md>");
  process.exit(2);
}

const matrix = JSON.parse(await readFile(jsonPath, "utf8"));
const markdown = await readFile(markdownPath, "utf8");
const errors = [];
const requiredProviders = ["DeepSeek", "Hunyuan", "Qwen", "Kimi", "GLM", "Doubao", "Ollama"];
const requiredStatuses = ["DOC_CONFIRMED", "PROVIDER_SPECIFIC_UNCONFIRMED", "NOT_RUN"];
if (matrix.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (!matrix.dshBaseline?.commit || matrix.dshBaseline.commit.length !== 40) errors.push("missing pinned DSH commit");
if (!matrix.dshBaseline?.version) errors.push("missing pinned package version");
if (!Array.isArray(matrix.entries) || matrix.entries.length < requiredProviders.length) errors.push("provider entries are incomplete");
for (const provider of requiredProviders) {
  const entry = matrix.entries?.find((item) => item.provider === provider);
  if (!entry) errors.push(`missing provider: ${provider}`);
  else {
    if (!requiredStatuses.includes(entry.status)) errors.push(`${provider} has unknown status`);
    if (entry.keyedSmoke !== "NOT_RUN") errors.push(`${provider} must remain NOT_RUN without keyed evidence`);
  }
}
for (const section of ["先看结论", "当前矩阵", "脱敏配置卡", "每个 provider 的最小测试卡", "什么时候不能继续自动测试"]) {
  if (!markdown.includes(section)) errors.push(`README missing section: ${section}`);
}
if (/sk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}/.test(markdown)) {
  errors.push("secret-like token detected in README");
}
if (/apiKey:\s*['\"]?[^<$\s][^\s'\"]{8,}/i.test(markdown)) errors.push("literal apiKey value detected");
if (errors.length > 0) {
  console.error(`FAIL ${jsonPath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${jsonPath} entries=${matrix.entries.length}`);
