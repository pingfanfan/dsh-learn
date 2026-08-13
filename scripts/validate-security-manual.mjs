#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/validate-security-manual.mjs <markdown-file>");
  process.exit(2);
}
const text = await readFile(path, "utf8");
const required = [
  "read-only", "workspace-write", "danger-full-access", "网络和进程可见性",
  "full", "partial", "SANDBOX_UNAVAILABLE", "runner failure", "denial",
  "安全测试矩阵", "插件作者安全审查清单", "NOT_RUN",
];
const missing = required.filter((item) => !text.includes(item));
const fences = (text.match(/^```/gm) ?? []).length;
const links = [...text.matchAll(/\[[^\]]+\]\([^)]+\)/g)].length;
const secretLike = /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b|-----BEGIN [A-Z ]+ PRIVATE KEY-----/.test(text);
const personalUserPath = ["/", "Users", "/"].join("");
const personalHomePath = ["/", "home", "/"].join("");
const temporaryWechatPath = ["xwechat", "files"].join("_");
const dangerousAbsolute = text.includes("~/") || text.includes(personalUserPath) || text.includes(personalHomePath) || text.includes(temporaryWechatPath);
const errors = [];
if (missing.length) errors.push(`missing required terms: ${missing.join(", ")}`);
if (fences === 0 || fences % 2) errors.push(`unbalanced code fences: ${fences}`);
if (links < 4) errors.push(`expected at least 4 links, found ${links}`);
if (secretLike) errors.push("secret-like value detected");
if (dangerousAbsolute) errors.push("dangerous real-user path appears in probe instructions");
if (errors.length) {
  console.error(`FAIL ${path}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${path} terms=${required.length} links=${links} fences=${fences}`);
