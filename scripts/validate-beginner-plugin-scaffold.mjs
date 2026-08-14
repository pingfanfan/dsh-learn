#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";

const generator = resolve("scripts/create-beginner-plugin.mjs");
const home = await mkdtemp(join(tmpdir(), "dsh-learn-plugin-scaffold-"));
const generated = join(home, "my-first-plugin");
const failures = [];
try {
  const output = execFileSync(process.execPath, [generator, "my-first-plugin"], {
    cwd: home,
    encoding: "utf8",
  });
  for (const marker of ["PASS 已创建 ./my-first-plugin", "node labs/hello-plugin/verify.mjs ./my-first-plugin", "不联网"]) {
    if (!output.includes(marker)) failures.push(`generator output missing ${marker}`);
  }

  const packageText = await readFile(join(generated, "package.json"), "utf8");
  const packageJson = JSON.parse(packageText);
  const source = await readFile(join(generated, "index.js"), "utf8");
  const patch = await readFile(join(generated, "cordis.patch.yml"), "utf8");
  const readme = await readFile(join(generated, "README.md"), "utf8");
  if (packageJson.name !== "dsh-my-first-plugin") failures.push("package name mismatch");
  if (packageJson.dsh?.bundle?.patch !== "./cordis.patch.yml") failures.push("missing bundle patch");
  for (const marker of ["export const name = \"my-first-plugin\"", "ctx.effect", "loaded", "unloaded"]) {
    if (!source.includes(marker)) failures.push(`index missing ${marker}`);
  }
  for (const marker of ["id: my-first-plugin", "name: dsh-my-first-plugin"]) {
    if (!patch.includes(marker)) failures.push(`patch missing ${marker}`);
  }
  for (const marker of ["临时 DSH_HOME", "verify.mjs ./my-first-plugin", "不发起模型请求"]) {
    if (!readme.includes(marker)) failures.push(`README missing ${marker}`);
  }

  try {
    execFileSync(process.execPath, [generator, "my-first-plugin"], { cwd: home, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    failures.push("generator overwrote an existing directory");
  } catch {
    // Existing targets must fail closed.
  }
  try {
    execFileSync(process.execPath, [generator, "../escape"], { cwd: home, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    failures.push("generator accepted path traversal");
  } catch {
    // Slug validation must reject path traversal.
  }
  if (/sk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----/.test(`${packageText}\n${source}\n${patch}\n${readme}`)) {
    failures.push("secret-like token detected");
  }
} finally {
  await rm(home, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("FAIL beginner plugin scaffold");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS beginner plugin scaffold checks=13");
