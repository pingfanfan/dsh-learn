import type { OpportunityStatus } from "./types.ts";

const ALLOWED: Record<OpportunityStatus, ReadonlySet<OpportunityStatus>> = {
  DISCOVERED: new Set(["TRIAGED", "DUPLICATE", "BLOCKED_RISK", "ARCHIVED"]),
  TRIAGED: new Set(["CLAIMED", "DUPLICATE", "BLOCKED_RISK", "ARCHIVED"]),
  CLAIMED: new Set(["VERIFIED", "TRIAGED", "BLOCKED_RISK", "ARCHIVED"]),
  VERIFIED: new Set(["BUILDING", "READY", "TRIAGED", "BLOCKED_RISK", "ARCHIVED"]),
  BUILDING: new Set(["READY", "TRIAGED", "BLOCKED_RISK", "ARCHIVED"]),
  READY: new Set(["RELEASED", "BLOCKED_RISK", "TRIAGED", "ARCHIVED"]),
  RELEASED: new Set(["ARCHIVED", "TRIAGED"]),
  ARCHIVED: new Set(["TRIAGED"]),
  BLOCKED_RISK: new Set(["TRIAGED", "ARCHIVED"]),
  DUPLICATE: new Set(["TRIAGED", "ARCHIVED"]),
};

export function canTransition(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return from === to || ALLOWED[from].has(to);
}

export function assertTransition(from: OpportunityStatus, to: OpportunityStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid opportunity transition: ${from} -> ${to}`);
  }
}
