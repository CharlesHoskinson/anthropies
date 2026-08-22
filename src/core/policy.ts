import type { Channel } from "../report.js"
import type { Kind } from "../kind.js"
import { fileCapBytes as registryFileCapBytes } from "../formats/registry.js"
import { zipExpansionCapBytes as zipFileCapBytes } from "../formats/zip.js"
import type { AvailabilityReasonCode, MarkClass } from "./domain.js"
import type { CapabilityManifest } from "./capability.js"

export const fileCapBytes: number = registryFileCapBytes
export const zipExpansionCapBytes: number = zipFileCapBytes

export const isOptionalFailSoft = (
  manifest: CapabilityManifest,
  requireCapability: ReadonlyArray<string>
): boolean =>
  manifest.distribution === "optional" && !requireCapability.includes(manifest.id)

export const isCertificationChannel = (channel: Channel): boolean =>
  channel === "deterministic" || channel === "c2pa"

export const isCertificationFailClosed = (
  channel: Channel,
  reason: AvailabilityReasonCode
): boolean =>
  isCertificationChannel(channel) &&
  (reason === "kernel-mismatch" || reason === "protocol-mismatch")

export const shouldPreserveOriginal = (reason: AvailabilityReasonCode): boolean =>
  reason === "timeout" ||
  reason === "malformed-output" ||
  reason === "conflict" ||
  reason === "probe-failed" ||
  reason === "resource-exceeded"

export type OwnerTuple = {
  readonly artifactKind: Kind
  readonly markClass: MarkClass
  readonly operation: "inspect" | "remove" | "rewrite" | "score" | "audit"
}

export type SelectOwnerResult =
  | { readonly ok: true; readonly owner: CapabilityManifest }
  | { readonly ok: false; readonly code: "conflict" | "none" }

const claimsTuple = (manifest: CapabilityManifest, tuple: OwnerTuple): boolean =>
  manifest.artifactKinds.includes(tuple.artifactKind) &&
  manifest.markClasses.includes(tuple.markClass) &&
  manifest.operations.includes(tuple.operation)

export const selectOwner = (
  candidates: ReadonlyArray<CapabilityManifest>,
  tuple: OwnerTuple
): SelectOwnerResult => {
  const claimants = candidates.filter((manifest) => claimsTuple(manifest, tuple))
  if (claimants.length === 0) {
    return { ok: false, code: "none" }
  }
  if (claimants.length > 1) {
    return { ok: false, code: "conflict" }
  }
  return { ok: true, owner: claimants[0]! }
}
