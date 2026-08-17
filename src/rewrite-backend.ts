import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Effect, Option, Redacted, Schema } from "effect"
import type { RewriteBackend } from "./config.js"
import { RewriteFailed, RewriteRemoteDenied } from "./fail.js"

export type HttpRewriteBackend = Exclude<RewriteBackend, "print-prompt">

const OllamaGenerate = Schema.Struct({
  response: Schema.String
})

const OpenAIChat = Schema.Struct({
  choices: Schema.Array(
    Schema.Struct({
      message: Schema.optional(
        Schema.Struct({
          content: Schema.optional(Schema.String)
        })
      )
    })
  )
})

const trimSlash = (url: string): string => url.replace(/\/+$/, "")

/** Ollama generate endpoint. */
export const ollamaGenerateUrl = (baseUrl: string): string => `${trimSlash(baseUrl)}/api/generate`

/** OpenAI-compatible chat completions. Avoids doubling a trailing /v1. */
export const openaiChatUrl = (baseUrl: string): string => {
  const trimmed = trimSlash(baseUrl)
  return trimmed.endsWith("/v1") ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`
}

/** localhost, ::1, and 127.0.0.0/8. Fail-closed on anything else. */
export const isLoopbackHostname = (hostname: string): boolean => {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (host === "localhost" || host === "::1" || host === "0:0:0:0:0:0:0:1") {
    return true
  }
  const parts = host.split(".")
  if (parts.length === 4 && parts[0] === "127") {
    return parts.every((part, index) => {
      if (index === 0) {
        return true
      }
      if (!/^\d{1,3}$/.test(part)) {
        return false
      }
      const n = Number(part)
      return n >= 0 && n <= 255
    })
  }
  return false
}

/** Reject invalid, non-http(s), or remote URLs unless ALLOW_REMOTE=1. */
export const assertRewriteUrlAllowed = (
  baseUrl: string,
  allowRemote: string,
  path: string
): Effect.Effect<URL, RewriteFailed | RewriteRemoteDenied> => {
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    return Effect.fail(
      new RewriteFailed({ path, reason: "invalid ANTHROPIES_REWRITE_BASE_URL" })
    )
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Effect.fail(
      new RewriteFailed({
        path,
        reason: "ANTHROPIES_REWRITE_BASE_URL must be http or https"
      })
    )
  }
  if (!isLoopbackHostname(parsed.hostname) && allowRemote !== "1") {
    return Effect.fail(
      new RewriteRemoteDenied({
        path,
        reason: "non-loopback rewrite URL requires ANTHROPIES_REWRITE_ALLOW_REMOTE=1"
      })
    )
  }
  return Effect.succeed(parsed)
}

const parseOllama = (body: unknown): string | undefined => {
  const decoded = Schema.decodeUnknownOption(OllamaGenerate)(body)
  return Option.isNone(decoded) ? undefined : decoded.value.response
}

const parseOpenAI = (body: unknown): string | undefined => {
  const decoded = Schema.decodeUnknownOption(OpenAIChat)(body)
  if (Option.isNone(decoded)) {
    return undefined
  }
  return decoded.value.choices[0]?.message?.content
}

export interface CompleteRewriteInput {
  readonly backend: HttpRewriteBackend
  readonly model: string
  readonly baseUrl: string
  readonly apiKey: Option.Option<Redacted.Redacted<string>>
  readonly allowRemote: string
  readonly prompt: string
  readonly path: string
}

/** POST a rewrite. Requires HttpClient in context. Loopback unless ALLOW_REMOTE=1. */
export const completeRewrite = (
  input: CompleteRewriteInput
): Effect.Effect<string, RewriteFailed | RewriteRemoteDenied> =>
  Effect.gen(function* () {
    if (input.model.trim() === "") {
      return yield* new RewriteFailed({
        path: input.path,
        reason: "ANTHROPIES_REWRITE_MODEL is required"
      })
    }
    yield* assertRewriteUrlAllowed(input.baseUrl, input.allowRemote, input.path)
    const httpOpt = yield* Effect.serviceOption(HttpClient.HttpClient)
    if (Option.isNone(httpOpt)) {
      return yield* new RewriteFailed({
        path: input.path,
        reason: "HttpClient required for ollama and openai-compatible"
      })
    }
    const url =
      input.backend === "ollama" ? ollamaGenerateUrl(input.baseUrl) : openaiChatUrl(input.baseUrl)
    const payload =
      input.backend === "ollama"
        ? { model: input.model, prompt: input.prompt, stream: false }
        : {
            model: input.model,
            messages: [{ role: "user", content: input.prompt }],
            stream: false
          }
    let request = HttpClientRequest.post(url).pipe(
      HttpClientRequest.acceptJson,
      HttpClientRequest.bodyUnsafeJson(payload)
    )
    if (input.backend === "openai-compatible" && Option.isSome(input.apiKey)) {
      request = request.pipe(
        HttpClientRequest.setHeader("authorization", `Bearer ${Redacted.value(input.apiKey.value)}`)
      )
    }
    const response = yield* httpOpt.value.execute(request).pipe(
      Effect.mapError(
        (e) =>
          new RewriteFailed({
            path: input.path,
            reason: `rewrite request failed: ${e._tag}`
          })
      )
    )
    if (response.status < 200 || response.status >= 300) {
      return yield* new RewriteFailed({
        path: input.path,
        reason: `rewrite HTTP ${String(response.status)}`
      })
    }
    const body = yield* response.json.pipe(
      Effect.mapError(
        () =>
          new RewriteFailed({
            path: input.path,
            reason: "rewrite response undecodable"
          })
      )
    )
    const text = input.backend === "ollama" ? parseOllama(body) : parseOpenAI(body)
    if (text === undefined || text.trim() === "") {
      return yield* new RewriteFailed({
        path: input.path,
        reason: "rewrite response empty"
      })
    }
    return text
  })
