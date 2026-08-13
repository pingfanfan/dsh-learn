import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { containsPotentialSecret } from "./risk.ts";

export function resolvePublicFile(root: string, path: string): string {
  const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path);
  const offset = relative(root, absolute);
  if (offset === "" || offset.startsWith("..") || isAbsolute(offset)) {
    throw new Error(`Path is outside project root: ${path}`);
  }
  return absolute;
}

export async function resolvePublicReadableFile(root: string, path: string): Promise<string> {
  const lexical = resolvePublicFile(root, path);
  const [rootReal, targetReal] = await Promise.all([realpath(root), realpath(lexical)]);
  assertInside(rootReal, targetReal, path);
  return targetReal;
}

export async function resolvePublicWriteFile(root: string, path: string): Promise<string> {
  const lexical = resolvePublicFile(root, path);
  const rootReal = await realpath(root);
  let ancestor = dirname(lexical);
  while (true) {
    try {
      await lstat(ancestor);
      break;
    } catch (error) {
      if (!isCode(error, "ENOENT")) throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw new Error(`Cannot resolve output parent: ${path}`);
      ancestor = parent;
    }
  }
  assertInside(rootReal, await realpath(ancestor), path);
  await mkdir(dirname(lexical), { recursive: true });
  assertInside(rootReal, await realpath(dirname(lexical)), path);
  const targetStat = await lstat(lexical).catch((error: unknown) => {
    if (isCode(error, "ENOENT")) return null;
    throw error;
  });
  if (targetStat?.isSymbolicLink()) throw new Error(`Output path cannot be a symbolic link: ${path}`);
  if (targetStat) assertInside(rootReal, await realpath(lexical), path);
  return lexical;
}

export async function readPublicContent(root: string, path: string): Promise<{
  content: string;
  hash: string;
  absolutePath: string;
  relativePath: string;
}> {
  const [rootReal, absolutePath] = await Promise.all([realpath(root), resolvePublicReadableFile(root, path)]);
  const content = await readFile(absolutePath, "utf8");
  if (containsPotentialSecret(content)) throw new Error(`Refusing to use content with a potential secret: ${path}`);
  return {
    content,
    hash: createHash("sha256").update(content).digest("hex"),
    absolutePath,
    relativePath: relative(rootReal, absolutePath),
  };
}

function assertInside(rootReal: string, targetReal: string, label: string): void {
  const offset = relative(rootReal, targetReal);
  if (offset.startsWith("..") || isAbsolute(offset)) {
    throw new Error(`Resolved path is outside project root: ${label}`);
  }
}

function isCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
