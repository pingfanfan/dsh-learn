#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/validate-discussion-kit.mjs <markdown-file>");
  process.exit(2);
}

const text = await readFile(path, "utf8");
const required = [
  "适用基线",
  "固定版本与环境",
  "最小复现",
  "脱敏",
  "中文 Discussion 模板",
  "英文转述模板",
  "回答他人问题时的中文首响",
  "发帖前检查表",
  "CONTRIBUTING.md",
  "官方 README",
  "官方 Discussions",
];
const missing = required.filter((item) => !text.includes(item));
const fenceCount = (text.match(/^```/gm) ?? []).length;
const links = [...text.matchAll(/https:\/\/[^)\s]+/g)].map((match) => match[0]);
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{12,}/i,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
];
const secretLike = secretPatterns.some((pattern) => pattern.test(text));
const absolutePrivatePath = /\/(?:Users|home|private|var)\/[^\s`)>]+/.test(text);
const errors = [];
if (missing.length > 0) errors.push(`missing sections: ${missing.join(", ")}`);
if (fenceCount === 0 || fenceCount % 2 !== 0) errors.push(`unbalanced fenced code blocks: ${fenceCount}`);
if (links.length < 4) errors.push(`expected at least 4 HTTPS links, found ${links.length}`);
if (secretLike) errors.push("secret-like token detected");
if (absolutePrivatePath) errors.push("absolute private path detected");

if (errors.length > 0) {
  console.error(`FAIL ${path}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS ${path} sections=${required.length} links=${links.length} fences=${fenceCount}`);
