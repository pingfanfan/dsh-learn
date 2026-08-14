#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";

const doctorPath = "scripts/beginner-doctor.mjs";
const doctor = await readFile(doctorPath, "utf8");
const failures = [];
const required = [
  "nodeMeetsDshRequirement",
  "22.19.0",
  "PASS Node.js",
  "PASS npm",
  "PASS npx",
  "labs/hello-plugin/verify.mjs",
  "scripts/beginner-start.mjs",
  "npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web",
  "没有联网，也没有读取或发送任何 API Key",
  "reportRequested",
  "PATH=redacted",
  "KEY_STATUS=not_read",
];
for (const item of required) {
  if (!doctor.includes(item)) failures.push(`missing ${item}`);
}
if (/sk-[A-Za-z0-9]{20,}/.test(doctor)) failures.push("possible API key pattern");

const result = execFileSync(process.execPath, [doctorPath], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
for (const item of ["PASS Node.js", "PASS npm", "PASS npx", "PASS 环境可以进入 DSH 启动步骤", "node scripts/beginner-start.mjs"]) {
  if (!result.includes(item)) failures.push(`runtime missing ${item}`);
}

const report = execFileSync(process.execPath, [doctorPath, "--report"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
for (const item of ["DSH_VERSION=0.1.0-rc.6", "PATH=redacted", "NETWORK=not_checked", "KEY_STATUS=not_read", "WEB=not_started", "PLUGIN=not_started"]) {
  if (!report.includes(item)) failures.push(`report missing ${item}`);
}
const personalPathMarkers = [["/", "Users", "/"].join(""), ["/", "home", "/"].join(""), ["\\\\", "Users", "\\\\"].join("")];
if (personalPathMarkers.some((marker) => report.includes(marker))) failures.push("report leaks a home path");

if (failures.length > 0) {
  console.error(`FAIL ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS ${doctorPath} checks=${required.length + 1}`);
