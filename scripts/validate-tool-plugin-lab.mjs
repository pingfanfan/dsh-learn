#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const paths = process.argv.slice(2);
if (paths.length !== 6) {
  console.error("usage: validate-tool-plugin-lab.mjs compatibility.json README.md package.json index.js cordis.patch.yml verify.mjs");
  process.exit(2);
}

const [compatibilityPath, readmePath, packagePath, indexPath, patchPath, verifyPath] = paths;
const [compatibility, readme, packageText, index, patch, verify] = await Promise.all([
  readFile(compatibilityPath, "utf8"),
  readFile(readmePath, "utf8"),
  readFile(packagePath, "utf8"),
  readFile(indexPath, "utf8"),
  readFile(patchPath, "utf8"),
  readFile(verifyPath, "utf8"),
]);
const manifest = JSON.parse(packageText);
const facts = JSON.parse(compatibility);
const required = [
  [manifest.name === "dsh-greet-tool", "package name"],
  [manifest?.dsh?.bundle?.patch === "./cordis.patch.yml", "bundle manifest"],
  [index.includes('export const inject = ["tools"]'), "tools injection"],
  [index.includes('ctx.tools.register({'), "tools registration"],
  [index.includes('name: "greet"'), "greet name"],
  [index.includes('required: ["name"]'), "required parameter"],
  [index.includes('schema: { type: "string" }'), "output schema"],
  [index.includes('[greet-tool] registered'), "registration sentinel"],
  [patch.includes("name: dsh-greet-tool"), "patch package reference"],
  [verify.includes("DEEPSEEK_API_KEY"), "no-key environment boundary"],
  [verify.includes("model invocation NOT_RUN"), "model boundary"],
  [facts.apiKey === "NOT_REQUIRED" && facts.toolInvocation === "NOT_RUN", "compatibility boundaries"],
  [readme.includes("defineTool") && readme.includes("NOT_RUN"), "README boundary"],
];
const failures = required.filter(([, label]) => !required.find(([ok, currentLabel]) => currentLabel === label && ok)).map(([, label]) => label);
if (failures.length > 0) {
  console.error(`FAIL ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS ${readmePath} checks=${required.length}`);
