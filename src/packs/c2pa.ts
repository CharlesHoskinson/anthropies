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
  type Artifact
} from "../core/domain.js"
import { inspectRasterBytes } from "../formats/raster.js"
import { inspectSvgText } from "../formats/svg.js"

const PACK_ID = "anthropies.c2pa"
const PACK_VERSION = "0.4.0"

const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

const statusFromArtifact = (
  artifact: Artifact
): "present" | "absent" | "indeterminate" => {
  if (artifact.kind === "svg") {
    return inspectSvgText(new TextDecoder("utf-8").decode(artifact.bytes)).present
      ? "present"
      : "absent"
  }
  const parsed = inspectRasterBytes(artifact.bytes)
  if (!parsed.ok) {
    return "indeterminate"
  }
  return parsed.present ? "present" : "absent"
}

export const c2paPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "C2PA",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["raster", "svg"],
    markClasses: ["provenance-metadata"],
    operations: ["inspect"],
    channel: "c2pa",
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
    Effect.sync(() => [
      new KernelFinding({
        channel: "c2pa",
        markClass: "provenance-metadata",
        status: statusFromArtifact(artifact),
        evidence: contractEvidence(),
        packId: PACK_ID,
        packImplementationVersion: PACK_VERSION
      })
    ])
}
