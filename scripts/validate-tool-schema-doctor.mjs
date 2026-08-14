#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";

const scriptPath = "scripts/tool-schema-doctor.mjs";
const source = await readFile(scriptPath, "utf8");
const failures = [];
for (const item of [
  "parameters.type !== \"object\"",
  "plugin.inject.includes(\"tools\")",
  "LOCAL_ONLY",
  "不调用模型",
  "插件自身导入代码的副作用",
]) {
  if (!source.includes(item)) failures.push(`missing ${item}`);
}
if (/sk-[A-Za-z0-9]{20,}/.test(source)) failures.push("possible API key pattern");

const safeEnv = { ...process.env };
delete safeEnv.DEEPSEEK_API_KEY;
delete safeEnv.DEEPSEEK_API_KEY_ENV;
const fixtureRoot = await mkdtemp(join(tmpdir(), "dsh-learn-tool-schema-doctor-"));
const goodPath = join(fixtureRoot, "good.mjs");
const badPath = join(fixtureRoot, "bad.mjs");
await writeFile(goodPath, `export const inject = ["tools"];
export function apply(ctx) {
  ctx.tools.register({
    name: "good",
    parameters: { type: "object", properties: {} },
    execute() { return "ok"; },
  });
}
`, "utf8");
await writeFile(badPath, `export const inject = ["tools"];
export function apply(ctx) {
  ctx.tools.register({
    name: "bad",
    parameters: { properties: {} },
    execute() { return "bad"; },
  });
}
`, "utf8");

try {
  const good = execFileSync(process.execPath, [scriptPath, goodPath], {
    encoding: "utf8",
    env: safeEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!good.includes("PASS 工具 schema 体检") || !good.includes("parameters.type = object")) {
    failures.push("good fixture success path missing");
  }

  try {
    execFileSync(process.execPath, [scriptPath, badPath], {
      encoding: "utf8",
      env: safeEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    failures.push("bad fixture unexpectedly passed");
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (!output.includes("parameters.type") || !output.includes("JSON Schema")) {
      failures.push("bad fixture did not explain the object-root failure");
    }
  }
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`FAIL ${scriptPath} ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS ${scriptPath} checks=7`);
