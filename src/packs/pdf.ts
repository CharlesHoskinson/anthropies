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
import { inspectPdfBytes } from "../formats/pdf.js"

const PACK_ID = "anthropies.pdf"
const PACK_VERSION = "0.4.0"

const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

export const pdfPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "PDF",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["pdf"],
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
    Effect.sync(() => {
      const scanned = inspectPdfBytes(artifact.bytes)
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
    })
}
