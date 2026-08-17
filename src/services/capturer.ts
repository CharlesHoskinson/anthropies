import { FileSystem } from "@effect/platform/FileSystem"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Console, Effect, Option, Redacted, Schema } from "effect"
import { anthropicApiKey } from "../config.js"
import { MissingApiKey, PreMarkModel } from "../fail.js"
import { isAllowlisted, markedModelIds } from "../models/allowlist.js"
import { honestyStanza, type Report } from "../report.js"
import { Cleaner } from "./cleaner.js"
import { Humanizer } from "./humanizer.js"
import { Inspector } from "./inspector.js"

const MESSAGES_URL = "https://api.anthropic.com/v1/messages"
const MAX_TOKENS = 400
const DEFAULT_FIXTURE = "fixtures/layer-a/trailer-claude.txt"

/** Sidecar written next to a live capture. No key. No watermarked. No sampled. */
export class Sidecar extends Schema.Class<Sidecar>("Sidecar")({
  capturedFrom: Schema.String,
  model: Schema.String,
  created: Schema.String,
  tokenCount: Schema.Number
}) {}

export interface CaptureInput {
  readonly model: string
  readonly prompt: string
  readonly allowlist?: ReadonlyArray<string>
  readonly destDir?: string
}

export interface CaptureResult {
  readonly path: string
  readonly sidecar: Sidecar
}

const TextBlock = Schema.Struct({
  text: Schema.String
})

const MessagesBody = Schema.Struct({
  content: Schema.Array(Schema.Unknown),
  usage: Schema.optional(
    Schema.Struct({
      input_tokens: Schema.optional(Schema.Number),
      output_tokens: Schema.optional(Schema.Number)
    })
  )
})

const parseMessages = (
  body: unknown
): { readonly text: string; readonly tokenCount: number } | undefined => {
  const decoded = Schema.decodeUnknownOption(MessagesBody)(body)
  if (Option.isNone(decoded)) {
    return undefined
  }
  const texts: Array<string> = []
  for (const block of decoded.value.content) {
    const part = Schema.decodeUnknownOption(TextBlock)(block)
    if (Option.isSome(part)) {
      texts.push(part.value.text)
    }
  }
  const inputTokens = decoded.value.usage?.input_tokens ?? 0
  const outputTokens = decoded.value.usage?.output_tokens ?? 0
  return {
    text: texts.join(""),
    tokenCount: inputTokens + outputTokens
  }
}

const stampName = (created: string, model: string): string => {
  const stamp = created.replaceAll(":", "").replaceAll(".", "")
  const safeModel = model.replaceAll(/[^A-Za-z0-9._-]/g, "-")
  return `${stamp}-${safeModel}`
}

const capture = (
  input: CaptureInput
): Effect.Effect<CaptureResult, MissingApiKey | PreMarkModel, FileSystem | HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const allowlist = input.allowlist ?? markedModelIds
    if (!isAllowlisted(input.model, allowlist)) {
      return yield* new PreMarkModel({
        path: input.model,
        reason: "model is not on the committed allowlist"
      })
    }
    const keyOpt = yield* anthropicApiKey.pipe(Effect.orDie)
    if (Option.isNone(keyOpt)) {
      return yield* new MissingApiKey({
        path: input.model,
        reason: "ANTHROPIC_API_KEY unset"
      })
    }
    const fs = yield* FileSystem
    const http = yield* HttpClient.HttpClient
    const request = HttpClientRequest.post(MESSAGES_URL).pipe(
      HttpClientRequest.setHeader("x-api-key", Redacted.value(keyOpt.value)),
      HttpClientRequest.setHeader("anthropic-version", "2023-06-01"),
      HttpClientRequest.acceptJson,
      HttpClientRequest.bodyUnsafeJson({
        model: input.model,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: input.prompt }]
      })
    )
    const response = yield* http.execute(request).pipe(Effect.orDie)
    if (response.status !== 200) {
      return yield* Effect.die(new Error(`messages HTTP ${String(response.status)}`))
    }
    const body = yield* response.json.pipe(Effect.orDie)
    const parsed = parseMessages(body)
    if (parsed === undefined) {
      return yield* Effect.die(new Error("messages response undecodable"))
    }
    const created = new Date().toISOString()
    const destDir = input.destDir ?? "fixtures/live"
    yield* fs.makeDirectory(destDir, { recursive: true }).pipe(Effect.orDie)
    const base = `${destDir}/${stampName(created, input.model)}`
    const path = `${base}.md`
    const sidecar = new Sidecar({
      capturedFrom: MESSAGES_URL,
      model: input.model,
      created,
      tokenCount: parsed.tokenCount
    })
    yield* fs.writeFileString(path, parsed.text).pipe(Effect.orDie)
    yield* fs.writeFileString(`${base}.json`, `${JSON.stringify(sidecar)}\n`).pipe(Effect.orDie)
    return { path, sidecar }
  })

const findingStatus = (report: Report, channel: string): string =>
  report.findings.find((f) => f.channel === channel)?.status ?? "unavailable"

/** Four-row channel table for demo. Never a mixed score. */
export const channelTable = (report: Report): string =>
  [
    "channel          status",
    `deterministic    ${findingStatus(report, "deterministic")}`,
    `c2pa             ${findingStatus(report, "c2pa")}`,
    `official         ${findingStatus(report, "official")}`,
    `statistical      ${findingStatus(report, "statistical")}`
  ].join("\n")

const beforeHonesty = honestyStanza({
  official: "unavailable (ANTHROPIC_DETECT_URL unset)",
  c2pa: "not-applicable",
  deterministic: "none",
  statistical: "not-run"
})

/** capture → inspect → clean → humanize → inspect. Skips C2PA and rewrite tracks. */
export const runDemo = (fixturePath: string = DEFAULT_FIXTURE) =>
  Effect.gen(function* () {
    const inspector = yield* Inspector
    const cleaner = yield* Cleaner
    const humanizer = yield* Humanizer
    const fs = yield* FileSystem
    yield* Console.error(beforeHonesty.join("\n"))
    if (markedModelIds.length === 0) {
      yield* Console.error("capture: skipped (empty allowlist)")
    } else {
      const keyOpt = yield* anthropicApiKey.pipe(Effect.orDie)
      if (Option.isNone(keyOpt)) {
        yield* Console.error("capture: skipped (ANTHROPIC_API_KEY unset)")
      } else {
        const model = markedModelIds[0]
        if (model !== undefined) {
          const captured = yield* Capturer.capture({
            model,
            prompt: "Write two short sentences about restoring clean title in owned Outputs."
          }).pipe(Effect.either)
          if (captured._tag === "Left") {
            yield* Console.error(`capture: skipped (${captured.left._tag})`)
          }
        }
      }
    }
    yield* Console.error("c2pa track: skipped")
    yield* Console.error("rewrite track: skipped (print-prompt; rewrite_metric.status=not-run)")
    const before = yield* inspector.inspect(fixturePath, { forceText: false, json: false })
    yield* Console.error(channelTable(before))
    const dir = yield* fs.makeTempDirectory()
    const cleanedPath = `${dir}/cleaned.txt`
    yield* cleaner.clean(fixturePath, {
      forceText: false,
      json: false,
      inPlace: false,
      output: cleanedPath
    })
    const cleanedText = yield* fs.readFileString(cleanedPath)
    yield* humanizer.humanize(cleanedText, { kind: "prose" })
    const after = yield* inspector.inspect(cleanedPath, { forceText: false, json: false })
    yield* Console.error(after.honesty.join("\n"))
    yield* Console.error(channelTable(after))
  })

/** Anthropic Messages → fixture + sidecar. Does not watermark. */
export class Capturer extends Effect.Service<Capturer>()("Capturer", {
  accessors: true,
  succeed: {
    capture
  }
}) {}
