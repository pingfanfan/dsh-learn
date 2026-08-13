import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join, relative } from "node:path";

const execFileAsync = promisify(execFile);

export interface PublicFinding {
  path: string;
  reason: string;
}

export interface PublicAuditResult {
  ok: boolean;
  files: number;
  findings: PublicFinding[];
}

const HIGH_CONFIDENCE_SECRETS = [
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /(?:手机(?:号)?|联系电话|电话|phone|mobile)\s*[:：=]?\s*1[3-9]\d{9}(?!\d)/gi,
  /(?:身份证(?:号)?|公民身份号码|id(?:entity)?\s*(?:number|no))\s*[:：=]?\s*\d{17}[\dXx](?!\d)/gi,
];

const PERSONAL_PATHS = [
  /\/Users\/[^\s`)>]+/g,
  /\/home\/[^\s`)>]+/g,
  /xwechat_files/g,
  /com\.tencent\.xinWeChat/g,
];

export function auditPublicText(path: string, content: string): PublicFinding[] {
  const findings: PublicFinding[] = [];
  if (PERSONAL_PATHS.some((pattern) => testAndReset(pattern, content))) {
    findings.push({ path, reason: "personal or temporary absolute path" });
  }
  if (HIGH_CONFIDENCE_SECRETS.some((pattern) => testAndReset(pattern, content))) {
    findings.push({ path, reason: "high-confidence credential, private key, or personal identifier" });
  }
  return findings;
}

export async function auditPublicFiles(root: string): Promise<PublicAuditResult> {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  const paths = String(stdout).split("\0").filter(Boolean);
  const findings: PublicFinding[] = [];
  for (const path of paths) {
    // The scanner implementation and its deliberate fake-secret fixtures are test machinery,
    // not user content. They are covered by auditPublicText unit tests instead.
    if (path === "src/public-audit.ts" || path.startsWith("test/")) continue;
    const absolute = join(root, path);
    let content: string;
    try {
      content = await readFile(absolute, "utf8");
    } catch {
      continue;
    }
    findings.push(...auditPublicText(relative(root, absolute), content));
  }
  return { ok: findings.length === 0, files: paths.length, findings };
}

function testAndReset(pattern: RegExp, content: string): boolean {
  pattern.lastIndex = 0;
  const matched = pattern.test(content);
  pattern.lastIndex = 0;
  return matched;
}
