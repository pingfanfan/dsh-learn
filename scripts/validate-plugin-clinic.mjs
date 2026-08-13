#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/validate-plugin-clinic.mjs <markdown-file>");
  process.exit(2);
}
const text = await readFile(path, "utf8");
const required = [
  "`.dsh-plugin`",
  "profile 组合包",
  "dsh plugin --profile <name> add <package-or-git-spec>",
  "dsh.bundle.patch",
  "干净 profile",
  "迁移报告",
  "没有声称任何具体插件已经成功迁移",
  "凭据",
  "固定 commit",
];
const missing = required.filter((item) => !text.includes(item));
const fences = (text.match(/^```/gm) ?? []).length;
const links = [...text.matchAll(/\[[^\]]+\]\([^)]+\)/g)].length;
const secretLike = /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b|-----BEGIN [A-Z ]+ PRIVATE KEY-----/.test(text);
const errors = [];
if (missing.length) errors.push(`missing required terms: ${missing.join(", ")}`);
if (fences === 0 || fences % 2) errors.push(`unbalanced code fences: ${fences}`);
if (links < 4) errors.push(`expected at least 4 official or local links, found ${links}`);
if (secretLike) errors.push("secret-like value detected");
if (errors.length) {
  console.error(`FAIL ${path}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${path} terms=${required.length} links=${links} fences=${fences}`);
