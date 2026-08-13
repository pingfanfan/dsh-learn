#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const path = process.argv[2];
const svgPath = process.argv[3];
if (!path) {
  console.error("usage: node scripts/validate-extension-map.mjs <markdown-file> [svg-file]");
  process.exit(2);
}
const text = await readFile(path, "utf8");
const required = [
  "需求到扩展点决策树",
  "ctx.llm",
  "ctx.tools",
  "ctx.fs",
  "ctx.jobs",
  "ctx.commands",
  "agent/*",
  "tools/*",
  "session/event",
  "waterfall",
  "serial",
  "parallel",
  "ctx.effect()",
  "PREVIEW_VOLATILE",
  "RUNTIME_SMOKE",
  "无 Key",
];
const missing = required.filter((item) => !text.includes(item));
const fences = (text.match(/^```/gm) ?? []).length;
const links = [...text.matchAll(/\[[^\]]+\]\([^)]+\)/g)].length;
const secretLike = /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b|-----BEGIN [A-Z ]+ PRIVATE KEY-----/.test(text);
const errors = [];
if (missing.length) errors.push(`missing required terms: ${missing.join(", ")}`);
if (fences === 0 || fences % 2) errors.push(`unbalanced code fences: ${fences}`);
if (links < 4) errors.push(`expected at least 4 links, found ${links}`);
if (secretLike) errors.push("secret-like value detected");
if (svgPath) {
  const svg = await readFile(svgPath, "utf8");
  if (!svg.includes("<svg") || !svg.includes("xmlns=\"http://www.w3.org/2000/svg\"")) errors.push("SVG root is incomplete");
  if (!svg.includes("viewBox=\"0 0 1440 900\"")) errors.push("SVG viewBox is missing or unexpected");
  if (/<svg[^>]+\s(?:width|height)=/.test(svg)) errors.push("SVG must remain responsive without fixed width/height");
  if (!svg.includes("CORDIS") || !svg.includes("ctx.tools") || !svg.includes("SandboxMode")) errors.push("SVG misses core map labels");
}
if (errors.length) {
  console.error(`FAIL ${path}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS ${path} terms=${required.length} links=${links} fences=${fences}${svgPath ? " svg=checked" : ""}`);
