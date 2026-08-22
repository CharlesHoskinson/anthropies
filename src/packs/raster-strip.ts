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
import { stripRasterBytes } from "../formats/raster.js"

const PACK_ID = "anthropies.raster-strip"
const PACK_VERSION = "0.4.0"
const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

export const rasterStripPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Raster strip",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["raster"],
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
    Effect.succeed(new Availability({ status: "available", reason: "ready" })),

  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([]),

  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const stripped = stripRasterBytes(artifact.bytes)
      if (!stripped.ok) {
        return yield* Effect.fail(
          new CapabilityFailure({
            code: "decode",
            packId: PACK_ID,
            reason: "malformed-output",
            diagnostics: stripped.reason
          })
        )
      }
      const next = makeArtifact(stripped.bytes, "raster", {
        ...(artifact.name !== undefined ? { name: artifact.name } : {})
      })
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
        warnings: [],
        remediation: next.digest === artifact.digest ? "unchanged" : "changed"
      })
    })
}
