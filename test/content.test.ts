import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readPublicContent, resolvePublicWriteFile } from "../src/content.ts";

test("public content cannot follow a symlink outside the project", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-content-root-"));
  const outside = await mkdtemp(join(tmpdir(), "dsh-learn-content-outside-"));
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(outside, { recursive: true, force: true }),
  ]));
  await writeFile(join(outside, "private.md"), "private material\n");
  await symlink(join(outside, "private.md"), join(root, "leak.md"));

  await assert.rejects(readPublicContent(root, "leak.md"), /outside project root/);
});

test("render output cannot overwrite an external file through a symlink", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-output-root-"));
  const outside = await mkdtemp(join(tmpdir(), "dsh-learn-output-outside-"));
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(outside, { recursive: true, force: true }),
  ]));
  const external = join(outside, "external.md");
  await writeFile(external, "keep\n");
  await symlink(external, join(root, "output.md"));

  await assert.rejects(resolvePublicWriteFile(root, "output.md"), /symbolic link/);
});
