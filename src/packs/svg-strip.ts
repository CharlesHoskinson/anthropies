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
  makeArtifact,
  Removal,
  TransformResult,
  type Artifact
} from "../core/domain.js"
import { cleanSvgText } from "../formats/svg.js"

const PACK_ID = "anthropies.svg-strip"
const PACK_VERSION = "0.4.0"
const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

export const svgStripPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "SVG strip",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["svg"],
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

  // CapabilityPack.inspect is required; c2paPack owns svg provenance-metadata inspect.
  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([]),

  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      const cleaned = cleanSvgText(new TextDecoder("utf-8").decode(artifact.bytes))
      const next = makeArtifact(cleaned.bytes, "svg", {
        ...(artifact.name !== undefined ? { name: artifact.name } : {})
      })
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
