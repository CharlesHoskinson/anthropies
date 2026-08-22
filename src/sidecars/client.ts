import { Effect, Option, Schema } from "effect"
import { CapabilityFailure } from "../core/domain.js"
import {
  isLoopbackBaseUrl,
  SidecarError,
  SidecarInspectResponse,
  sidecarProtocolVersion
} from "./protocol.js"

export type SidecarClientOptions = {
  readonly baseUrl: string
  readonly packId: string
  readonly fetch: (input: string, init?: RequestInit) => Promise<Response>
  readonly timeoutMs?: number
}

const inspectUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.replace(/\/+$/, "")
  return `${trimmed}/v1/inspect`
}

const fail = (
  packId: string,
  code: CapabilityFailure["code"],
  reason: CapabilityFailure["reason"]
): Effect.Effect<never, CapabilityFailure> =>
  Effect.fail(new CapabilityFailure({ code, packId, reason }))

const mapSidecarErrorCode = (
  code: SidecarError["code"]
): { code: CapabilityFailure["code"]; reason: CapabilityFailure["reason"] } => {
  switch (code) {
    case "timeout":
      return { code: "timeout", reason: "timeout" }
    case "malformed-output":
      return { code: "malformed-output", reason: "malformed-output" }
    case "incompatible":
      return { code: "incompatible", reason: "protocol-mismatch" }
    case "unavailable":
      return { code: "unavailable", reason: "probe-failed" }
    case "resource-exceeded":
      return { code: "resource-exceeded", reason: "resource-exceeded" }
  }
}

const decodeBody = (
  packId: string,
  body: unknown
): Effect.Effect<SidecarInspectResponse, CapabilityFailure> => {
  if (
    typeof body === "object" &&
    body !== null &&
    "protocolVersion" in body &&
    (body as { protocolVersion: unknown }).protocolVersion !== sidecarProtocolVersion
  ) {
    return fail(packId, "incompatible", "protocol-mismatch")
  }

  const error = Schema.decodeUnknownOption(SidecarError)(body)
  if (Option.isSome(error)) {
    const mapped = mapSidecarErrorCode(error.value.code)
    return fail(packId, mapped.code, mapped.reason)
  }

  const ok = Schema.decodeUnknownOption(SidecarInspectResponse)(body)
  if (Option.isSome(ok)) {
    return Effect.succeed(ok.value)
  }

  return fail(packId, "malformed-output", "malformed-output")
}

export const sidecarInspect = (
  options: SidecarClientOptions,
  artifact: { readonly bytes: string; readonly kind: "text"; readonly digest: string }
): Effect.Effect<SidecarInspectResponse, CapabilityFailure> => {
  if (!isLoopbackBaseUrl(options.baseUrl)) {
    return fail(options.packId, "unavailable", "privacy-denied")
  }

  const url = inspectUrl(options.baseUrl)
  const timeoutMs = options.timeoutMs ?? 30000
  const requestBody = {
    protocolVersion: sidecarProtocolVersion,
    operation: "inspect" as const,
    artifact
  }

  return Effect.gen(function* () {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const mapAbortOrProbe = (cause: unknown): CapabilityFailure => {
      const aborted =
        (cause instanceof Error && cause.name === "AbortError") ||
        controller.signal.aborted
      if (aborted) {
        return new CapabilityFailure({
          code: "timeout",
          packId: options.packId,
          reason: "timeout"
        })
      }
      return new CapabilityFailure({
        code: "unavailable",
        packId: options.packId,
        reason: "probe-failed"
      })
    }

    const text = yield* Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          options.fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
            redirect: "error"
          }),
        catch: mapAbortOrProbe
      })

      return yield* Effect.tryPromise({
        try: () => response.text(),
        catch: (cause) => {
          const aborted =
            (cause instanceof Error && cause.name === "AbortError") ||
            controller.signal.aborted
          if (aborted) {
            return new CapabilityFailure({
              code: "timeout",
              packId: options.packId,
              reason: "timeout"
            })
          }
          return new CapabilityFailure({
            code: "malformed-output",
            packId: options.packId,
            reason: "malformed-output"
          })
        }
      })
    }).pipe(Effect.ensuring(Effect.sync(() => clearTimeout(timer))))

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      return yield* fail(options.packId, "malformed-output", "malformed-output")
    }

    return yield* decodeBody(options.packId, parsed)
  })
}
