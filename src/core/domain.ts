import { createHash } from "node:crypto"
import { Schema } from "effect"
import { Kind } from "../kind.js"
import { Channel } from "../report.js"

export const kernelApiVersion = "1.0.0" as const

const excessPropertyError = {
  parseOptions: { onExcessProperty: "error" as const }
}

/** Lowercase sha256 hex digest with no algorithm prefix. */
const Sha256Hex = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/))

const digestMatches = (a: { readonly bytes: Uint8Array; readonly digest: string }): boolean =>
  createHash("sha256").update(a.bytes).digest("hex") === a.digest

const ArtifactFields = Schema.Struct({
  bytes: Schema.Uint8ArrayFromBase64,
  kind: Kind,
  digest: Sha256Hex,
  name: Schema.optionalWith(Schema.String, { exact: true }),
  mediaType: Schema.optionalWith(Schema.String, { exact: true }),
  suffix: Schema.optionalWith(Schema.String, { exact: true })
})
  .annotations(excessPropertyError)
  .pipe(
    Schema.filter((a) => digestMatches(a), {
      message: () => "digest does not match bytes"
    })
  )

export class Artifact extends Schema.Class<Artifact>("Artifact")(ArtifactFields) {}

export const makeArtifact = (
  bytes: Uint8Array,
  kind: Kind,
  opts?: {
    readonly name?: string
    readonly mediaType?: string
    readonly suffix?: string
  }
): Artifact => {
  const copy = Uint8Array.from(bytes)
  return new Artifact({
    bytes: copy,
    kind,
    digest: createHash("sha256").update(copy).digest("hex"),
    ...(opts?.name !== undefined ? { name: opts.name } : {}),
    ...(opts?.mediaType !== undefined ? { mediaType: opts.mediaType } : {}),
    ...(opts?.suffix !== undefined ? { suffix: opts.suffix } : {})
  })
}

export const MarkClass = Schema.Literal(
  "invisible-unicode",
  "agent-trailer",
  "generated-banner",
  "provenance-metadata",
  "c2pa-manifest",
  "keyed-text",
  "pixel",
  "soft-binding"
)
export type MarkClass = typeof MarkClass.Type

export const ExecutionOutcome = Schema.Literal("success", "error")
export type ExecutionOutcome = typeof ExecutionOutcome.Type

export const CapabilityStatus = Schema.Literal(
  "available",
  "unavailable",
  "incompatible",
  "degraded"
)
export type CapabilityStatus = typeof CapabilityStatus.Type

export const KernelFindingStatus = Schema.Literal("present", "absent", "indeterminate")
export type KernelFindingStatus = typeof KernelFindingStatus.Type

export const Remediation = Schema.Literal("changed", "unchanged", "partial")
export type Remediation = typeof Remediation.Type

export const EvidenceKind = Schema.Literal("contract", "empirical")
export type EvidenceKind = typeof EvidenceKind.Type

export const AvailabilityReasonCode = Schema.Literal(
  "ready",
  "optional-absent",
  "tool-missing",
  "env-unset",
  "kernel-mismatch",
  "protocol-mismatch",
  "license-blocked",
  "resource-exceeded",
  "privacy-denied",
  "conflict",
  "timeout",
  "malformed-output",
  "probe-failed"
)
export type AvailabilityReasonCode = typeof AvailabilityReasonCode.Type

export class Availability extends Schema.Class<Availability>("Availability")(
  {
    status: CapabilityStatus,
    reason: AvailabilityReasonCode,
    detail: Schema.optionalWith(Schema.String, { exact: true })
  },
  [undefined, undefined, excessPropertyError]
) {}

export class Evidence extends Schema.Class<Evidence>("Evidence")(
  {
    kind: EvidenceKind,
    rawReference: Schema.optionalWith(Schema.String, { exact: true }),
    versionFingerprint: Schema.optionalWith(Schema.String, { exact: true })
  },
  [undefined, undefined, excessPropertyError]
) {}

export class KernelFinding extends Schema.Class<KernelFinding>("KernelFinding")(
  {
    channel: Channel,
    markClass: MarkClass,
    status: KernelFindingStatus,
    evidence: Evidence,
    packId: Schema.String,
    packImplementationVersion: Schema.String
  },
  [undefined, undefined, excessPropertyError]
) {}

export class Removal extends Schema.Class<Removal>("Removal")(
  {
    channel: Channel,
    markClass: MarkClass,
    changedScope: Schema.Literal("bytes", "metadata", "text-layer"),
    evidence: Evidence,
    labels: Schema.Array(Schema.String)
  },
  [undefined, undefined, excessPropertyError]
) {}

export class TransformResult extends Schema.Class<TransformResult>("TransformResult")(
  {
    artifact: Artifact,
    removals: Schema.Array(Removal),
    evidence: Evidence,
    residualFindings: Schema.Array(KernelFinding),
    warnings: Schema.Array(Schema.String),
    remediation: Remediation
  },
  [undefined, undefined, excessPropertyError]
) {}

export class CapabilityFailure extends Schema.TaggedError<CapabilityFailure>()(
  "CapabilityFailure",
  {
    code: Schema.Literal(
      "unavailable",
      "incompatible",
      "timeout",
      "malformed-output",
      "resource-exceeded",
      "probe-failed",
      "conflict",
      "decode"
    ),
    packId: Schema.String,
    reason: AvailabilityReasonCode,
    diagnostics: Schema.optionalWith(Schema.String, { exact: true })
  },
  [undefined, undefined, excessPropertyError]
) {}
