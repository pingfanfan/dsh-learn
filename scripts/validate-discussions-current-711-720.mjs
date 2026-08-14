#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const path = process.argv[2];
if (!path) throw new Error("usage: node scripts/validate-discussions-current-711-720.mjs <markdown>");
const markdown = await readFile(path, "utf8");
const required = [
  "# DSH Discussions #711–#720",
  "#711",
  "#712",
  "#713",
  "#714",
  "#715",
  "#716",
  "#717",
  "#718",
  "#719",
  "#720",
  "用户报告、Ideas、Q&A 或 Show and tell",
  "没有下载、安装或运行这两个插件",
  "没有调用模型 API",
  "不使用、不保存、不展示 API Key",
  "知乎发布必须经过主理人明确同意",
];
const failures = required.filter((item) => !markdown.includes(item));
if (/sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----|\/Users\//.test(markdown)) {
  failures.push("secret or private path pattern");
}
if (failures.length > 0) {
  console.error(`FAIL ${path}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS ${path} checks=${required.length + 1}`);
