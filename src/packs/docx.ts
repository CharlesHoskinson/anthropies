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
  KernelFinding,
  makeArtifact,
  Removal,
  TransformResult,
  type Artifact
} from "../core/domain.js"
import { cleanDocx, inspectDocx } from "../formats/docx.js"

const PACK_ID = "anthropies.docx"
const PACK_VERSION = "0.4.0"
const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

const pathOf = (artifact: Artifact): string => artifact.name ?? "owned.docx"

export const docxPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "DOCX metadata",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["docx"],
    markClasses: ["provenance-metadata"],
    operations: ["inspect", "remove"],
    channel: "c2pa",
    priority: 90,
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
  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const scanned = inspectDocx(artifact.bytes, pathOf(artifact))
      if (!scanned.ok) {
        return yield* Effect.fail(
          new CapabilityFailure({
            code: "unavailable",
            packId: PACK_ID,
            reason: "malformed-output"
          })
        )
      }
      return [
        new KernelFinding({
          channel: "c2pa",
          markClass: "provenance-metadata",
          status: scanned.present ? "present" : "absent",
          evidence: contractEvidence(),
          packId: PACK_ID,
          packImplementationVersion: PACK_VERSION
        })
      ]
    }),
  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const cleaned = cleanDocx(artifact.bytes, pathOf(artifact))
      if (!cleaned.ok) {
        return yield* Effect.fail(
          new CapabilityFailure({
            code: "unavailable",
            packId: PACK_ID,
            reason: "malformed-output"
          })
        )
      }
      const next = makeArtifact(cleaned.bytes, "docx")
      return new TransformResult({
        artifact: next,
        removals:
          cleaned.labels.length > 0
            ? [
                new Removal({
                  channel: "c2pa",
                  markClass: "provenance-metadata",
                  changedScope: "metadata",
                  evidence: contractEvidence(),
                  labels: [...cleaned.labels]
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
