#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";

const scriptPath = "scripts/code-mode-args-doctor.mjs";
const source = await readFile(scriptPath, "utf8");
const failures = [];
for (const item of [
  "run_code.arguments.description",
  "tools.bash",
  "LOCAL_ONLY",
  "不联网",
  "不调用模型",
  "疑似包含凭据",
]) {
  if (!source.includes(item)) failures.push(`missing ${item}`);
}
if (/sk-[A-Za-z0-9]{20,}/.test(source)) failures.push("possible API key pattern");

const safeEnv = { ...process.env };
delete safeEnv.DEEPSEEK_API_KEY;
delete safeEnv.DEEPSEEK_API_KEY_ENV;
const fixtureRoot = await mkdtemp(join(tmpdir(), "dsh-learn-code-mode-doctor-"));
const validPath = join(fixtureRoot, "valid.json");
const missingOuterPath = join(fixtureRoot, "missing-outer.json");
const missingInnerPath = join(fixtureRoot, "missing-inner.json");
const base = {
  outer: {
    tool: "run_code",
    arguments: {
      code: "const result = await tools.bash({ command: \"pwd\", description: \"Show the current directory\" }); return result;",
      description: "Check the current directory",
    },
  },
  nested: [{
    tool: "bash",
    arguments: { command: "pwd", description: "Show the current directory" },
  }],
};
await writeFile(validPath, JSON.stringify(base), "utf8");
await writeFile(missingOuterPath, JSON.stringify({
  ...base,
  outer: { ...base.outer, arguments: { ...base.outer.arguments, description: "" } },
}), "utf8");
await writeFile(missingInnerPath, JSON.stringify({
  ...base,
  nested: [{ tool: "bash", arguments: { command: "pwd" } }],
}), "utf8");

function run(path) {
  return execFileSync(process.execPath, [scriptPath, path], {
    encoding: "utf8",
    env: safeEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  const valid = run(validPath);
  if (!valid.includes("PASS 外层 run_code 参数") || !valid.includes("PASS 内层 bash 参数")) {
    failures.push("valid fixture success path missing");
  }

  for (const [path, expected] of [
    [missingOuterPath, "外层 run_code.arguments.description"],
    [missingInnerPath, "内层 tools.bash[0].arguments.description"],
  ]) {
    try {
      run(path);
      failures.push(`${path} unexpectedly passed`);
    } catch (error) {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
      if (!output.includes(expected) || !output.includes("LOCAL_ONLY")) {
        failures.push(`${path} did not identify ${expected}`);
      }
    }
  }
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`FAIL ${scriptPath} ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS ${scriptPath} checks=9`);
