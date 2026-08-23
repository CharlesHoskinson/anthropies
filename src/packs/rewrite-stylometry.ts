import { Effect, Schema } from "effect"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import { Availability, type Artifact } from "../core/domain.js"
import type { RewriteMetric } from "../report.js"
import { lexicalSurvival } from "../rewrite-backend.js"
import { computeRewriteMetric } from "../rewrite-metric.js"
import { originBlocked } from "../services/humanizer.js"

const PACK_ID = "anthropies.rewrite-stylometry"
const PACK_VERSION = "0.4.0"

/** Re-export for pack consumers. Origin stamper tokens stay refused. */
export { originBlocked }

export interface RewriteCandidate {
  readonly id: string
  readonly text: string
}

export interface DetectorHint {
  readonly id: string
  /** Vendor/detector favorability. Intentionally unused by selection. */
  readonly favorability: number
}

export interface CandidateObservation {
  readonly id: string
  readonly text: string
  readonly metric: RewriteMetric
}

export interface SelectRewriteCandidateInput {
  readonly source: string
  readonly candidates: ReadonlyArray<RewriteCandidate>
  readonly domain: "prose" | "code"
  /** Ignored. Present only so callers can prove detectors do not drive selection. */
  readonly detectorHints?: ReadonlyArray<DetectorHint>
}

export interface SelectRewriteCandidateResult {
  readonly observations: ReadonlyArray<CandidateObservation>
  readonly selectedId: string
  readonly selectedText: string
  readonly isCleanCertificate: false
  readonly note: string
}

/**
 * Multi-candidate lexical / five-gram selection.
 * Detector hints are accepted and discarded. Selection is never a clean certificate.
 */
export const selectRewriteCandidate = (
  input: SelectRewriteCandidateInput
): SelectRewriteCandidateResult => {
  if (input.candidates.length < 2) {
    throw new Error("multi-candidate rewrite requires at least two candidates")
  }
  void input.detectorHints
  const observations: Array<CandidateObservation> = input.candidates.map((candidate) => ({
    id: candidate.id,
    text: candidate.text,
    metric: computeRewriteMetric(input.source, candidate.text, input.domain)
  }))
  let winner = observations[0]!
  let bestSurvival = lexicalSurvival(input.source, winner.text)
  for (const obs of observations.slice(1)) {
    const survival = lexicalSurvival(input.source, obs.text)
    if (survival < bestSurvival) {
      winner = obs
      bestSurvival = survival
    }
  }
  return {
    observations,
    selectedId: winner.id,
    selectedText: winner.text,
    isCleanCertificate: false,
    note: "lexical selection only; not a clean certificate or official-removal claim"
  }
}

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
      "Wraps print-prompt and optional loopback Ollama / OpenAI-compatible rewrite; no bundled models; adapters expect an operator-provided local or remote endpoint."
  }),

  probe: (_context: RunContext) =>
    Effect.succeed(new Availability({ status: "available", reason: "ready" })),

  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([])
}
