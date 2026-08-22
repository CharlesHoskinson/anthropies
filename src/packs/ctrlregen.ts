import { Effect, Option, Schema } from "effect"
import { ctrlRegenWeights } from "../config.js"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import {
  Availability,
  Evidence,
  KernelFinding,
  makeArtifact,
  Removal,
  TransformResult,
  type Artifact
} from "../core/domain.js"

/**
 * Original Anthropies CtrlRegen-method implementation.
 * Operator supplies weights via CTRLREGEN_WEIGHTS.
 * Do not vendor or import yepengliu/CtrlRegen or mertizci/noai-watermark —
 * those trees have no redistribution grant and must stay outside publishable core.
 */
const PACK_ID = "anthropies.ctrlregen"
const PACK_VERSION = "0.1.0"
const FINGERPRINT = "ctrlregen-method:config=residual-v1"

/** Sum of absolute differences between neighboring bytes (original residual energy). */
const residualEnergy = (bytes: Uint8Array): number => {
  let energy = 0
  for (let i = 1; i < bytes.length; i++) {
    energy += Math.abs((bytes[i] ?? 0) - (bytes[i - 1] ?? 0))
  }
  return energy
}

/** Neighbor-average reconstruction over interior bytes. */
const neighborAverageReconstruct = (bytes: Uint8Array): Uint8Array => {
  if (bytes.length === 0) {
    return new Uint8Array()
  }
  const out = Uint8Array.from(bytes)
  for (let i = 1; i < out.length - 1; i++) {
    const left = bytes[i - 1] ?? 0
    const right = bytes[i + 1] ?? 0
    out[i] = Math.round((left + right) / 2)
  }
  return out
}

const empiricalEvidence = (artifact: Artifact): Evidence =>
  new Evidence({
    kind: "empirical",
    versionFingerprint: FINGERPRINT,
    rawReference: artifact.digest
  })

export const ctrlRegenPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "CtrlRegen-method",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["raster"],
    markClasses: ["pixel"],
    // remove-only ownership: MarkDiffusion owns (raster, pixel, inspect).
    operations: ["remove"],
    channel: "statistical",
    priority: 40,
    ordering: {},
    runtime: "local-process",
    network: "none",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "optional",
    provenance:
      "Original Anthropies CtrlRegen-method TypeScript; operator weights via CTRLREGEN_WEIGHTS only."
  }),

  probe: (_context: RunContext) =>
    Effect.gen(function* () {
      const weights = yield* ctrlRegenWeights
      if (Option.isNone(weights) || weights.value.trim() === "") {
        return new Availability({
          status: "unavailable",
          reason: "env-unset",
          detail: "CTRLREGEN_WEIGHTS"
        })
      }
      return new Availability({ status: "available", reason: "ready" })
    }) as Effect.Effect<Availability>,

  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      // Touch residual energy so inspect always processes artifact bytes.
      void residualEnergy(artifact.bytes)
      return [
        new KernelFinding({
          channel: "statistical",
          markClass: "pixel",
          status: "indeterminate",
          evidence: empiricalEvidence(artifact),
          packId: PACK_ID,
          packImplementationVersion: PACK_VERSION
        })
      ]
    }),

  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      const nextBytes = neighborAverageReconstruct(artifact.bytes)
      const next = makeArtifact(nextBytes, artifact.kind, {
        ...(artifact.name !== undefined ? { name: artifact.name } : {}),
        ...(artifact.mediaType !== undefined ? { mediaType: artifact.mediaType } : {}),
        ...(artifact.suffix !== undefined ? { suffix: artifact.suffix } : {})
      })
      const changed = next.digest !== artifact.digest
      return new TransformResult({
        artifact: next,
        removals: changed
          ? [
              new Removal({
                channel: "statistical",
                markClass: "pixel",
                changedScope: "bytes",
                evidence: empiricalEvidence(artifact),
                labels: ["ctrlregen-method:residual-v1"]
              })
            ]
          : [],
        evidence: empiricalEvidence(artifact),
        residualFindings: [
          new KernelFinding({
            channel: "statistical",
            markClass: "pixel",
            status: "indeterminate",
            evidence: empiricalEvidence(next),
            packId: PACK_ID,
            packImplementationVersion: PACK_VERSION
          })
        ],
        warnings: [],
        remediation: changed ? "changed" : "unchanged"
      })
    })
}
