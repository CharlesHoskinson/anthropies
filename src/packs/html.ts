import { Effect, Schema } from "effect"
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
import { cleanHtmlText, inspectHtmlText } from "../formats/html.js"

const PACK_ID = "anthropies.html"
const PACK_VERSION = "0.4.0"
const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

export const htmlPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "HTML metadata",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["html"],
    markClasses: ["provenance-metadata"],
    operations: ["inspect", "remove"],
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
  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      const scanned = inspectHtmlText(new TextDecoder("utf-8").decode(artifact.bytes))
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
    Effect.sync(() => {
      const cleaned = cleanHtmlText(new TextDecoder("utf-8").decode(artifact.bytes))
      const next = makeArtifact(cleaned.bytes, "html")
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
