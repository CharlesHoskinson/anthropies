import { Effect, Encoding, Option, Schema } from "effect"
import { imageScoringBaseUrl } from "../config.js"
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
  type Artifact,
  type KernelFindingStatus
} from "../core/domain.js"
import { kernelRangeIncludes } from "../core/registry.js"
import { sidecarInspect } from "../sidecars/client.js"
import {
  isLoopbackBaseUrl,
  SidecarCapabilities,
  SidecarHealth,
  sidecarProtocolVersion
} from "../sidecars/protocol.js"

/** Upstream reverse-SynthID (noncommercial). Python stays outside publishable core. */
export const IMAGE_SCORING_UPSTREAM = "aloshdenny/reverse-SynthID"

export const IMAGE_SCORING_PINS = {
  containerOrLockDigest: "43281cfdd558f6377ff3bc4bc1df83dd573d612fadbbf195faec6c8618c7536b",
  upstreamCommit: "b11083676fd3ee3ff97ce9d03c0e409e46905902",
  modelOrCodebookDigest: "88b2b53e4f96794a63761ccb838a7b6b7acced0a57462ca18a73d35b23b45887",
  configurationDigest: "ba5e95a2ae7a718284a2077a408a14cc7a60640d7d37d52591375e6a608a31ba"
} as const

export type ImageScoringPins = {
  readonly containerOrLockDigest: string
  readonly upstreamCommit: string
  readonly modelOrCodebookDigest: string
  readonly configurationDigest: string
}

export const pinsComplete = (pins: ImageScoringPins): boolean =>
  pins.containerOrLockDigest.trim() !== "" &&
  pins.upstreamCommit.trim() !== "" &&
  pins.modelOrCodebookDigest.trim() !== "" &&
  pins.configurationDigest.trim() !== ""

export const DEFAULT_IMAGE_SCORING_BASE_URL = "http://127.0.0.1:18765"

export const resolveImageScoringBaseUrl = (override?: string): string =>
  override !== undefined && override.trim() !== "" ? override.trim() : DEFAULT_IMAGE_SCORING_BASE_URL

const PACK_ID = "anthropies.image-scoring"
const PACK_VERSION = "0.1.0"

export type ImageScoringDeps = {
  readonly fetch?: (input: string, init?: RequestInit) => Promise<Response>
  readonly timeoutMs?: number
  readonly pins?: ImageScoringPins
}

const trimBase = (baseUrl: string): string => baseUrl.replace(/\/+$/, "")

const fail = (
  code: CapabilityFailure["code"],
  reason: CapabilityFailure["reason"]
): CapabilityFailure => new CapabilityFailure({ code, packId: PACK_ID, reason })

const jsonGet = (
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
  url: string,
  timeoutMs: number
): Effect.Effect<unknown, CapabilityFailure> =>
  Effect.gen(function* () {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const text = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetchImpl(url, {
          method: "GET",
          headers: { accept: "application/json" },
          signal: controller.signal,
          redirect: "error"
        })
        return await response.text()
      },
      catch: (cause) => {
        const aborted =
          (cause instanceof Error && cause.name === "AbortError") || controller.signal.aborted
        if (aborted) {
          return fail("timeout", "timeout")
        }
        return fail("unavailable", "probe-failed")
      }
    }).pipe(Effect.ensuring(Effect.sync(() => clearTimeout(timer))))

    try {
      return JSON.parse(text) as unknown
    } catch {
      return yield* Effect.fail(fail("malformed-output", "malformed-output"))
    }
  })

const decodeHealth = (body: unknown): Effect.Effect<SidecarHealth, CapabilityFailure> => {
  if (
    typeof body === "object" &&
    body !== null &&
    "protocolVersion" in body &&
    (body as { protocolVersion: unknown }).protocolVersion !== sidecarProtocolVersion
  ) {
    return Effect.fail(fail("incompatible", "protocol-mismatch"))
  }
  const decoded = Schema.decodeUnknownOption(SidecarHealth)(body)
  if (Option.isNone(decoded)) {
    return Effect.fail(fail("malformed-output", "malformed-output"))
  }
  return Effect.succeed(decoded.value)
}

const decodeCapabilities = (
  body: unknown
): Effect.Effect<SidecarCapabilities, CapabilityFailure> => {
  if (
    typeof body === "object" &&
    body !== null &&
    "protocolVersion" in body &&
    (body as { protocolVersion: unknown }).protocolVersion !== sidecarProtocolVersion
  ) {
    return Effect.fail(fail("incompatible", "protocol-mismatch"))
  }
  const decoded = Schema.decodeUnknownOption(SidecarCapabilities)(body)
  if (Option.isNone(decoded)) {
    return Effect.fail(fail("malformed-output", "malformed-output"))
  }
  return Effect.succeed(decoded.value)
}

const capabilitiesCompatible = (caps: SidecarCapabilities, kernelApiVersion: string): boolean => {
  if (caps.id !== PACK_ID) {
    return false
  }
  const ops = caps.operations
  if (!ops.includes("score") && !ops.includes("inspect")) {
    return false
  }
  return kernelRangeIncludes(caps.kernelApiMin, caps.kernelApiMax, kernelApiVersion)
}

const fingerprintFor = (pins: ImageScoringPins): string =>
  `reverse-synthid:commit=${pins.upstreamCommit}:codebook=${pins.modelOrCodebookDigest.slice(0, 12)}:config=${pins.configurationDigest.slice(0, 12)}`

const observation = (
  status: KernelFindingStatus,
  pins: ImageScoringPins,
  artifact: Artifact,
  certify: boolean
): KernelFinding =>
  new KernelFinding({
    channel: "statistical",
    markClass: "pixel",
    status,
    evidence: new Evidence({
      kind: "empirical",
      rawReference: artifact.digest,
      ...(certify ? { versionFingerprint: fingerprintFor(pins) } : {})
    }),
    packId: PACK_ID,
    packImplementationVersion: PACK_VERSION
  })

const negotiate = (
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
  baseUrl: string,
  timeoutMs: number,
  kernelApiVersion: string
): Effect.Effect<void, CapabilityFailure> =>
  Effect.gen(function* () {
    if (!isLoopbackBaseUrl(baseUrl)) {
      return yield* Effect.fail(fail("unavailable", "privacy-denied"))
    }
    const base = trimBase(baseUrl)
    const healthBody = yield* jsonGet(fetchImpl, `${base}/health`, timeoutMs)
    yield* decodeHealth(healthBody)
    const capsBody = yield* jsonGet(fetchImpl, `${base}/capabilities`, timeoutMs)
    const caps = yield* decodeCapabilities(capsBody)
    if (!capabilitiesCompatible(caps, kernelApiVersion)) {
      return yield* Effect.fail(fail("incompatible", "protocol-mismatch"))
    }
  })

export const createImageScoringPack = (deps: ImageScoringDeps = {}): CapabilityPack => {
  const fetchImpl = deps.fetch ?? globalThis.fetch.bind(globalThis)
  const timeoutMs = deps.timeoutMs ?? defaultNativeLimits.timeoutMs
  const pins = deps.pins ?? IMAGE_SCORING_PINS

  const pack: CapabilityPack = {
    manifest: Schema.decodeUnknownSync(CapabilityManifest)({
      id: PACK_ID,
      displayName: "Image scoring (reverse-SynthID)",
      kernelApiMin: "1.0.0",
      kernelApiMax: "1.0.0",
      apiVersion: "1.0.0",
      implementationVersion: PACK_VERSION,
      artifactKinds: ["raster"],
      markClasses: ["pixel"],
      // score-only: MarkDiffusion owns (raster, pixel, inspect); CtrlRegen owns remove.
      operations: ["score"],
      channel: "statistical",
      priority: 35,
      ordering: {},
      runtime: "loopback-sidecar",
      network: "loopback",
      privacy: "local-only",
      limits: defaultNativeLimits,
      license: "optional-noncommercial",
      distribution: "optional",
      provenance: `Optional loopback sidecar wrapping ${IMAGE_SCORING_UPSTREAM} pin ${IMAGE_SCORING_PINS.upstreamCommit}; Python scorer not vendored under src/.`
    }),

    probe: (context: RunContext) =>
      Effect.gen(function* () {
        const urlOpt = yield* imageScoringBaseUrl
        if (Option.isNone(urlOpt) || urlOpt.value.trim() === "") {
          return new Availability({
            status: "unavailable",
            reason: "optional-absent",
            detail: "IMAGE_SCORING_BASE_URL"
          })
        }
        const baseUrl = urlOpt.value.trim()
        if (!isLoopbackBaseUrl(baseUrl)) {
          return new Availability({
            status: "unavailable",
            reason: "privacy-denied",
            detail: baseUrl
          })
        }
        const negotiated = yield* negotiate(
          fetchImpl,
          baseUrl,
          timeoutMs,
          context.kernelApiVersion
        ).pipe(
          Effect.map(() => "ok" as const),
          Effect.catchAll((err) => Effect.succeed(err))
        )
        if (negotiated === "ok") {
          return new Availability({ status: "available", reason: "ready" })
        }
        if (negotiated.code === "incompatible") {
          return new Availability({
            status: "incompatible",
            reason: negotiated.reason
          })
        }
        if (negotiated.reason === "privacy-denied") {
          return new Availability({
            status: "unavailable",
            reason: "privacy-denied"
          })
        }
        return new Availability({
          status: "unavailable",
          reason: negotiated.reason === "timeout" ? "timeout" : "probe-failed"
        })
      }) as Effect.Effect<Availability>,

    inspect: (artifact: Artifact, context: RunContext) =>
      Effect.gen(function* () {
        const urlOpt = yield* imageScoringBaseUrl
        if (Option.isNone(urlOpt) || urlOpt.value.trim() === "") {
          return yield* Effect.fail(fail("unavailable", "optional-absent"))
        }
        const baseUrl = urlOpt.value.trim()
        if (!isLoopbackBaseUrl(baseUrl)) {
          return yield* Effect.fail(fail("unavailable", "privacy-denied"))
        }

        yield* negotiate(fetchImpl, baseUrl, timeoutMs, context.kernelApiVersion)

        const certify = pinsComplete(pins)
        const wireArtifact = {
          bytes: Encoding.encodeBase64(artifact.bytes),
          kind: "text" as const,
          digest: artifact.digest
        }
        const response = yield* sidecarInspect(
          {
            baseUrl,
            packId: PACK_ID,
            fetch: fetchImpl,
            timeoutMs
          },
          wireArtifact
        )

        const status: KernelFindingStatus =
          response.findings.length === 0 ? "absent" : "present"
        if (!certify) {
          return [observation("indeterminate", pins, artifact, false)]
        }
        return [observation(status, pins, artifact, true)]
      }) as Effect.Effect<ReadonlyArray<KernelFinding>, CapabilityFailure>
  }

  return pack
}

export const imageScoringPack: CapabilityPack = createImageScoringPack()
