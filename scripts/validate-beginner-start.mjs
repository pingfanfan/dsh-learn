import { readFile } from "node:fs/promises";
import process from "node:process";

const path = "scripts/beginner-start.mjs";
const source = await readFile(path, "utf8");
const required = [
  "@deepseek-ai/dsh@${dshVersion}",
  "http://127.0.0.1:3080",
  "DEEPSEEK_API_KEY",
  "BLOCKED_NETWORK",
  "FAIL_NODE_VERSION",
  "FAIL_PORT",
  "beginner-doctor.mjs",
  "NPM_CONFIG_FETCH_RETRIES",
];
const failures = [];
for (const item of required) if (!source.includes(item)) failures.push(`missing ${item}`);
if (/sk-[A-Za-z0-9]{20,}/.test(source)) failures.push("possible API key pattern");
if (failures.length > 0) {
  console.error(`FAIL ${path}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS ${path} checks=${required.length + 1}`);
