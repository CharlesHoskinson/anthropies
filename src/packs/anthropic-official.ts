import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Effect, Option, Schema } from "effect"
import { anthropicDetectUrl } from "../config.js"
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

const PACK_ID = "anthropies.official"
const PACK_VERSION = "0.1.0"

const officialFinding = (rawReference?: string): KernelFinding =>
  new KernelFinding({
    channel: "official",
    markClass: "keyed-text",
    status: "indeterminate",
    evidence: new Evidence({
      kind: "empirical",
      ...(rawReference !== undefined ? { rawReference } : {})
    }),
    packId: PACK_ID,
    packImplementationVersion: PACK_VERSION
  })

/**
 * Anthropic official text-detect seam.
 * Empty artifactKinds: listable without conflicting MarkLLM ownership.
 * WHILE ANTHROPIC_DETECT_URL is unset, probe is unavailable and no outbound request runs.
 */
export const anthropicOfficialPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Anthropic official",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: [],
    markClasses: ["keyed-text"],
    operations: ["inspect"],
    channel: "official",
    priority: 30,
    ordering: {},
    runtime: "native-ts",
    network: "remote-opt-in",
    privacy: "may-send-bytes",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "optional",
    provenance:
      "Official Anthropic text-detect seam. Requires explicit ANTHROPIC_DETECT_URL; no default vendor URL."
  }),

  probe: (_context: RunContext) =>
    Effect.gen(function* () {
      const urlOpt = yield* anthropicDetectUrl
      if (Option.isNone(urlOpt) || urlOpt.value.trim() === "") {
        return new Availability({
          status: "unavailable",
          reason: "env-unset",
          detail: "ANTHROPIC_DETECT_URL"
        })
      }
      return new Availability({ status: "available", reason: "ready" })
    }) as Effect.Effect<Availability>,

  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const urlOpt = yield* anthropicDetectUrl
      if (Option.isNone(urlOpt) || urlOpt.value.trim() === "") {
        // No outbound request. Official stays unavailable without a score field.
        return [officialFinding("unavailable")]
      }
      const httpOpt = yield* Effect.serviceOption(HttpClient.HttpClient)
      if (Option.isNone(httpOpt)) {
        return [officialFinding("unavailable")]
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
        return [officialFinding("unavailable")]
      }
      if (response.status === 429) {
        return [officialFinding("degraded")]
      }
      if (response.status < 200 || response.status >= 300) {
        return [officialFinding("unavailable")]
      }
      const body = yield* response.json.pipe(Effect.catchAll(() => Effect.succeed(null)))
      if (body === null || typeof body !== "object") {
        return [officialFinding("malformed-output")]
      }
      return [
        new KernelFinding({
          channel: "official",
          markClass: "keyed-text",
          status: "indeterminate",
          evidence: new Evidence({
            kind: "empirical",
            rawReference: "vendor-raw",
            versionFingerprint: "anthropic-official:config=operator-url"
          }),
          packId: PACK_ID,
          packImplementationVersion: PACK_VERSION
        })
      ]
    }).pipe(
      Effect.catchAll(() => Effect.succeed([officialFinding("unavailable")]))
    ) as unknown as Effect.Effect<ReadonlyArray<KernelFinding>>
}
