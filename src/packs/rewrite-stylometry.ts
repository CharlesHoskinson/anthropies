import { Effect, Schema } from "effect"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import { Availability, type Artifact } from "../core/domain.js"
import { originBlocked } from "../services/humanizer.js"

const PACK_ID = "anthropies.rewrite-stylometry"
const PACK_VERSION = "0.4.0"

/** Re-export for pack consumers. Origin stamper tokens stay refused. */
export { originBlocked }

/**
 * Capability wrap over Layer B rewrite (print-prompt default, optional HTTP backends).
 * Operations are rewrite only. CLI humanize owns the path; HTTP has no /humanize.
 */
export const rewriteStylometryPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Rewrite stylometry",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["text"],
    markClasses: ["keyed-text"],
    operations: ["rewrite"],
    channel: "statistical",
    priority: 50,
    ordering: {},
    runtime: "native-ts",
    network: "remote-opt-in",
    privacy: "may-send-bytes",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "core",
    provenance:
      "Wraps print-prompt and optional loopback Ollama / OpenAI-compatible rewrite; no bundled models."
  }),

  probe: (_context: RunContext) =>
    Effect.succeed(new Availability({ status: "available", reason: "ready" })),

  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([])
}
