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
  TransformResult,
  type Artifact
} from "../core/domain.js"
import { applyLayerA } from "../layer-a.js"

const PACK_ID = "anthropies.layer-a"
const PACK_VERSION = "0.4.0"

const MARKS = [
  { key: "unicode", markClass: "invisible-unicode" },
  { key: "trailer", markClass: "agent-trailer" },
  { key: "banner", markClass: "generated-banner" }
] as const

const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

const decodeText = (bytes: Uint8Array): string => new TextDecoder("utf-8").decode(bytes)

export const layerAPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Layer A",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["text", "svg", "html", "md"],
    markClasses: ["invisible-unicode", "agent-trailer", "generated-banner"],
    operations: ["inspect", "remove"],
    channel: "deterministic",
    priority: 100,
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
      const { removed } = applyLayerA(decodeText(artifact.bytes))
      return MARKS.map(
        ({ key, markClass }) =>
          new KernelFinding({
            channel: "deterministic",
            markClass,
            status: removed[key] > 0 ? "present" : "absent",
            evidence: contractEvidence(),
            packId: PACK_ID,
            packImplementationVersion: PACK_VERSION
          })
      )
    }),

  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      if (artifact.kind !== "text") {
        return new TransformResult({
          artifact,
          removals: [],
          evidence: contractEvidence(),
          residualFindings: [],
          warnings: [],
          remediation: "unchanged"
        })
      }
      const result = applyLayerA(decodeText(artifact.bytes))
      const changed =
        result.removed.unicode > 0 || result.removed.trailer > 0 || result.removed.banner > 0
      return new TransformResult({
        artifact: makeArtifact(new TextEncoder().encode(result.text), artifact.kind),
        removals: [],
        evidence: contractEvidence(),
        residualFindings: [],
        warnings: [],
        remediation: changed ? "changed" : "unchanged"
      })
    })
}
