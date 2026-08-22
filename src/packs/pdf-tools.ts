import { Effect, Schema } from "effect"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import {
  Availability,
  CapabilityFailure,
  Evidence,
  makeArtifact,
  Removal,
  TransformResult,
  type Artifact
} from "../core/domain.js"
import { PdfTools } from "../formats/pdf.js"

const PACK_ID = "anthropies.pdf-tools"
const PACK_VERSION = "0.4.0"
const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

const missingWarnings = (labels: ReadonlyArray<string>): ReadonlyArray<string> =>
  labels.filter((label) => label === "missing:qpdf" || label === "missing:exiftool")

export const pdfToolsPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "PDF tools",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["pdf"],
    markClasses: ["provenance-metadata"],
    operations: ["remove"],
    channel: "c2pa",
    priority: 80,
    ordering: {},
    runtime: "native-ts",
    network: "none",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "core"
  }),

  probe: (_context: RunContext) =>
    Effect.gen(function* () {
      const pdf = yield* PdfTools
      const inspected = yield* pdf.inspect(new Uint8Array())
      if (inspected.degraded) {
        return new Availability({ status: "degraded", reason: "tool-missing" })
      }
      return new Availability({ status: "available", reason: "ready" })
    }) as Effect.Effect<Availability>,

  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([]),

  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const pdf = yield* PdfTools
      const path = artifact.name ?? "owned.pdf"
      const stripped = yield* pdf.strip(artifact.bytes, path).pipe(
        Effect.mapError(
          (error) =>
            new CapabilityFailure({
              code: "decode",
              packId: PACK_ID,
              reason: "malformed-output",
              diagnostics: error.reason
            })
        )
      )
      const next = makeArtifact(stripped.bytes, "pdf", {
        ...(artifact.name !== undefined ? { name: artifact.name } : {})
      })
      const warnings = stripped.degraded ? [...missingWarnings(stripped.labels)] : []
      return new TransformResult({
        artifact: next,
        removals:
          stripped.removed
            ? [
                new Removal({
                  channel: "c2pa",
                  markClass: "provenance-metadata",
                  changedScope: "metadata",
                  evidence: contractEvidence(),
                  labels: [...stripped.labels]
                })
              ]
            : [],
        evidence: contractEvidence(),
        residualFindings: [],
        warnings,
        remediation: next.digest === artifact.digest ? "unchanged" : "changed"
      })
    }) as Effect.Effect<TransformResult, CapabilityFailure>
}
