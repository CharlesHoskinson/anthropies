import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Config, Effect, Option, Schema } from "effect"
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
  type Artifact,
  type KernelFindingStatus
} from "../core/domain.js"

/** Operator-configured Gemini SynthID text detect endpoint. Unset → optional unavailable. */
const geminiDetectUrl = Config.option(Config.string("GEMINI_DETECT_URL"))

const PACK_ID = "anthropies.gemini-synthid"
const PACK_VERSION = "0.1.0"

const DetectBody = Schema.Struct({
  status: Schema.Literal("present", "absent", "indeterminate")
})

const decodeStatus = (status: string): KernelFindingStatus => {
  if (status === "present" || status === "absent" || status === "indeterminate") {
    return status
  }
  return "indeterminate"
}

const statisticalFinding = (
  status: KernelFindingStatus,
  opts?: { readonly rawReference?: string; readonly fingerprint?: string }
): KernelFinding =>
  new KernelFinding({
    channel: "statistical",
    markClass: "keyed-text",
    status,
    evidence: new Evidence({
      kind: "empirical",
      ...(opts?.rawReference !== undefined ? { rawReference: opts.rawReference } : {}),
      ...(opts?.fingerprint !== undefined ? { versionFingerprint: opts.fingerprint } : {})
    }),
    packId: PACK_ID,
    packImplementationVersion: PACK_VERSION
  })

/**
 * Gemini SynthID text adapter. Statistical evidence only.
 * Owns score (not inspect) so MarkLLM can keep (text, keyed-text, inspect).
 */
export const geminiSynthidPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Gemini SynthID",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["text"],
    markClasses: ["keyed-text"],
    operations: ["score"],
    channel: "statistical",
    priority: 35,
    ordering: {},
    runtime: "native-ts",
    network: "remote-opt-in",
    privacy: "may-send-bytes",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "optional",
    provenance:
      "Wraps an operator-configured Gemini SynthID text detect URL via GEMINI_DETECT_URL; no bundled vendor SDK."
  }),

  probe: (_context: RunContext) =>
    Effect.gen(function* () {
      const urlOpt = yield* geminiDetectUrl
      if (Option.isNone(urlOpt) || urlOpt.value.trim() === "") {
        return new Availability({
          status: "unavailable",
          reason: "env-unset",
          detail: "GEMINI_DETECT_URL"
        })
      }
      return new Availability({ status: "available", reason: "ready" })
    }) as Effect.Effect<Availability>,

  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const urlOpt = yield* geminiDetectUrl
      if (Option.isNone(urlOpt) || urlOpt.value.trim() === "") {
        return [statisticalFinding("indeterminate", { rawReference: "unavailable" })]
      }
      const httpOpt = yield* Effect.serviceOption(HttpClient.HttpClient)
      if (Option.isNone(httpOpt)) {
        return [statisticalFinding("indeterminate", { rawReference: "unavailable" })]
      }
      const text = new TextDecoder("utf-8").decode(artifact.bytes)
      const request = HttpClientRequest.post(urlOpt.value).pipe(
        HttpClientRequest.acceptJson,
        HttpClientRequest.bodyUnsafeJson({ text })
      )
      const response = yield* httpOpt.value.execute(request).pipe(
        Effect.catchAll(() => Effect.succeed(undefined))
      )
      if (response === undefined) {
        return [statisticalFinding("indeterminate", { rawReference: "unavailable" })]
      }
      if (response.status === 429) {
        return [statisticalFinding("indeterminate", { rawReference: "degraded" })]
      }
      if (response.status < 200 || response.status >= 300) {
        return [statisticalFinding("indeterminate", { rawReference: "unavailable" })]
      }
      const body = yield* response.json.pipe(Effect.catchAll(() => Effect.succeed(null)))
      const parsed = Schema.decodeUnknownOption(DetectBody)(body)
      if (Option.isNone(parsed)) {
        return [statisticalFinding("indeterminate", { rawReference: "malformed-output" })]
      }
      return [
        statisticalFinding(decodeStatus(parsed.value.status), {
          fingerprint: "gemini-synthid:config=operator-url"
        })
      ]
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed([statisticalFinding("indeterminate", { rawReference: "unavailable" })])
      )
    ) as unknown as Effect.Effect<ReadonlyArray<KernelFinding>>
}
