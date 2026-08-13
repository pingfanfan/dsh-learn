import { createHash, randomUUID } from "node:crypto";

export function makeId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function fingerprint(parts: string[]): string {
  return createHash("sha256")
    .update(parts.map((part) => part.trim().toLowerCase()).join("\u0000"))
    .digest("hex");
}
