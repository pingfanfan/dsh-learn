import type { RiskLevel } from "./types.ts";

export type ActionKind =
  | "research"
  | "build"
  | "publish"
  | "correct"
  | "delete"
  | "spend"
  | "credential"
  | "security-disclosure"
  | "legal-position"
  | "personal-commitment";

export interface RiskAssessment {
  level: RiskLevel;
  requiresUser: boolean;
  reasons: string[];
}

const HIGH_RISK_ACTIONS = new Set<ActionKind>([
  "delete",
  "spend",
  "credential",
  "security-disclosure",
  "legal-position",
  "personal-commitment",
]);

const SECRET_PATTERNS = [
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/gi,
  /\b(?:api[_-]?key|access[_-]?token|secret)\s*[:=]\s*[^\s,;]+/gi,
  /\b[A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PASSWORD|PASSWD|PRIVATE_KEY)\s*[:=]\s*[^\s,;]+/gi,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /(?:手机(?:号)?|联系电话|电话|phone|mobile)\s*[:：=]?\s*1[3-9]\d{9}(?!\d)/gi,
  /(?:身份证(?:号)?|公民身份号码|id(?:entity)?\s*(?:number|no))\s*[:：=]?\s*\d{17}[\dXx](?!\d)/gi,
];

export function containsPotentialSecret(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function redactSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((result, pattern) => {
    pattern.lastIndex = 0;
    return result.replace(pattern, "[REDACTED]");
  }, text);
}

export function assessRisk(action: ActionKind, text = ""): RiskAssessment {
  const reasons: string[] = [];
  if (HIGH_RISK_ACTIONS.has(action)) reasons.push(`动作 ${action} 需要主理人确认`);
  if (containsPotentialSecret(text)) reasons.push("内容疑似包含凭据或秘密值");
  const requiresUser = reasons.length > 0;
  return {
    level: requiresUser ? "HIGH" : action === "publish" || action === "correct" ? "MEDIUM" : "LOW",
    requiresUser,
    reasons,
  };
}
