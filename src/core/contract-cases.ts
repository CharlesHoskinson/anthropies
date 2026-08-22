/** Sprint 0 contract fixture case ids in inventory order. */
export const CONTRACT_CASES = [
  "available",
  "unavailable",
  "degraded",
  "incompatible",
  "timeout",
  "malformed-output",
  "conflicting-owner"
] as const

export type ContractCaseId = (typeof CONTRACT_CASES)[number]
