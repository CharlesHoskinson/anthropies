import type { FileSystem } from "@effect/platform/FileSystem"
import { Effect, Option, Redacted } from "effect"
import {
  rewriteApiKey,
  rewriteBackendEnv,
  rewriteBaseUrlEnv,
  rewriteAllowRemoteEnv,
  rewriteConfigPath,
  rewriteModel
} from "../config.js"
import { loadConfigFile } from "../config-file.js"
import {
  BinaryInput,
  OriginBlocked,
  RewriteFailed,
  RewriteRemoteDenied,
  type DecodeError,
  type InputTooLarge,
  type WriteGuard
} from "../fail.js"
import { handlerFor, loadOwned, pathSuffix } from "../formats/registry.js"
import type { Kind } from "../kind.js"
import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { Finding, Report, type RewriteMetric } from "../report.js"
import { completeRewrite } from "../rewrite-backend.js"
import { computeRewriteMetric, notRunMetric } from "../rewrite-metric.js"
import { destinationOf, makeTextReport, Reporter } from "./reporter.js"

const ORIGIN_TOKENS = ["claude", "anthropic", "gemini", "google-gemini", "synthid"] as const

const CODE_SUFFIX = new Set([
  ".py",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".c",
  ".h",
  ".cpp",
  ".rb",
  ".php",
  ".sh",
  ".sql"
])

/** Layer B prose prefix. Require clause-order / H-gram break; keep facts, URLs, fences. */
export const PROSE_PROMPT = `Rewrite the text below so almost no original 5-word sequence (H-gram) survives.

Required structure changes — do all of these:
- Change clause order.
- Change sentence boundaries.
- Change discourse markers and function words.
- Do not synonym-swap in place while keeping the same sentence skeleton.

Keep every fact, number, name, URL, citation, and code fence byte-stable.

Output only the rewritten text.

TEXT:
`

/** Layer B code prefix. Require structure change in comments; keep facts, URLs, fences, APIs. */
export const CODE_PROMPT = `Rewrite only comments, docstrings, and non-load-bearing string literals so almost no original 5-word sequence (H-gram) survives in those spans.

Required structure changes in comments and docstrings — do all of these:
- Change clause order.
- Change sentence boundaries.
- Change discourse markers and function words.
- Do not synonym-swap in place while keeping the same sentence skeleton.

Keep every fact, number, name, URL, citation, and code fence byte-stable.
Do not change public APIs, protocol strings, test snapshots, imports, or behavior.
Keep the code compiling. Output only the rewritten file.

FILE:
`

export interface HumanizeOptions {
  readonly kind: "prose" | "code"
  readonly path?: string
}

export interface HumanizeResult {
  readonly text: string
  readonly note: string
  readonly metric: RewriteMetric
}

export interface HumanizeFileOptions {
  readonly forceText: boolean
  readonly json: boolean
  readonly inPlace: boolean
  readonly output?: string
  readonly kind?: "prose" | "code"
}

export interface HumanizeFileResult {
  readonly report: Report
  readonly bytes: Uint8Array
  readonly note: string
}

/** True when either lowercased string contains an origin stamper token. */
export const originBlocked = (backend: string, model: string): boolean => {
  const backendL = backend.toLowerCase()
  const modelL = model.toLowerCase()
  return ORIGIN_TOKENS.some((tok) => backendL.includes(tok) || modelL.includes(tok))
}

/** Infer prose vs code from a path suffix. */
export const inferDomain = (path: string): "prose" | "code" =>
  CODE_SUFFIX.has(pathSuffix(path) ?? "") ? "code" : "prose"

const promptFor = (kind: "prose" | "code"): string =>
  kind === "code" ? CODE_PROMPT : PROSE_PROMPT

const blocked = (path: string): OriginBlocked =>
  new OriginBlocked({
    path,
    reason: "origin model would re-stamp the mark"
  })

const printPromptNote =
  "print-prompt: does not destamp; run this on an unmarked local model"

/** Attach rewrite_metric and mark statistical as best-effort. */
export const reportFromHumanize = (input: {
  readonly kind: Kind
  readonly removed: LayerARemoved
  readonly present: boolean
  readonly metric: RewriteMetric
}): Report => {
  const base = makeTextReport({
    kind: input.kind,
    removed: input.removed,
    present: input.present
  })
  return new Report({
    kind: base.kind,
    findings: base.findings.map((f) =>
      f.channel === "statistical"
        ? new Finding({ channel: "statistical", status: "best-effort" })
        : f
    ),
    removed: base.removed,
    ...(base.anyDeterministicHits === true ? { anyDeterministicHits: true } : {}),
    degraded: base.degraded,
    honesty: base.honesty,
    rewrite_metric: input.metric,
    ...(base.official === undefined ? {} : { official: base.official })
  })
}

const readRewriteTarget = (): Effect.Effect<{
  backend: "print-prompt" | "ollama" | "openai-compatible"
  model: string
  baseUrl: string
  apiKey: Option.Option<Redacted.Redacted<string>>
  allowRemote: string
}> =>
  Effect.gen(function* () {
    // Precedence: env var > config file > built-in default.
    // Option-typed env configs (rewriteBackendEnv, etc.) are None when the
    // env var is absent, letting the config file (or default) fill in.
    const path = yield* rewriteConfigPath.pipe(Effect.orDie)
    const file = loadConfigFile(path)
    const r = file.rewrite
    const envBackend = yield* rewriteBackendEnv.pipe(Effect.orDie)
    const envModel = yield* rewriteModel.pipe(Effect.orDie)
    const envBaseUrl = yield* rewriteBaseUrlEnv.pipe(Effect.orDie)
    const envApiKey = yield* rewriteApiKey.pipe(Effect.orDie)
    const envAllowRemote = yield* rewriteAllowRemoteEnv.pipe(Effect.orDie)
    const backend = Option.getOrElse(envBackend, () => r?.backend ?? "print-prompt")
    const model = Option.getOrElse(envModel, () => r?.model ?? "")
    const baseUrl = Option.getOrElse(envBaseUrl, () => r?.baseUrl ?? "http://127.0.0.1:11434")
    const apiKey = Option.isSome(envApiKey)
      ? envApiKey
      : r?.apiKey !== undefined
        ? Option.some(Redacted.make(r.apiKey))
        : Option.none()
    const allowRemote = Option.getOrElse(envAllowRemote, () => (r?.allowRemote ? "1" : "0"))
    return { backend, model, baseUrl, apiKey, allowRemote }
  })

type HumanizeError = OriginBlocked | RewriteFailed | RewriteRemoteDenied

const rewrite = (
  text: string,
  options: HumanizeOptions
): Effect.Effect<HumanizeResult, HumanizeError> =>
  Effect.gen(function* () {
    const { backend, model, baseUrl, apiKey, allowRemote } = yield* readRewriteTarget()
    if (originBlocked(backend, model)) {
      return yield* blocked(options.path ?? "")
    }
    const cleaned = applyLayerA(text).text
    if (backend === "print-prompt") {
      return {
        text: promptFor(options.kind) + cleaned,
        note: printPromptNote,
        metric: notRunMetric(options.kind)
      }
    }
    const rewritten = yield* completeRewrite({
      backend,
      model,
      baseUrl,
      apiKey,
      allowRemote,
      prompt: promptFor(options.kind) + cleaned,
      path: options.path ?? ""
    })
    return {
      text: rewritten,
      note: `rewrote via ${backend} (${model})`,
      metric: computeRewriteMetric(cleaned, rewritten, options.kind)
    }
  })

/** Origin blocklist plus print-prompt or HTTP rewrite. HttpClient only on HTTP backends. */
export class Humanizer extends Effect.Service<Humanizer>()("Humanizer", {
  accessors: true,
  effect: Effect.gen(function* () {
    const reporter = yield* Reporter
    return {
      humanize: (
        text: string,
        options: HumanizeOptions
      ): Effect.Effect<HumanizeResult, HumanizeError, FileSystem> => rewrite(text, options),
      humanizeFile: (
        path: string,
        options: HumanizeFileOptions
      ): Effect.Effect<
        HumanizeFileResult,
        HumanizeError | BinaryInput | DecodeError | InputTooLarge | WriteGuard,
        FileSystem
      > =>
        Effect.gen(function* () {
          const { backend, model } = yield* readRewriteTarget()
          if (originBlocked(backend, model)) {
            return yield* blocked(path)
          }
          const owned = yield* loadOwned(path)
          const handler = handlerFor(owned.kind, options.forceText)
          if (handler === undefined) {
            return yield* new BinaryInput({
              path,
              reason: `classified as ${owned.kind}`
            })
          }
          const text = yield* handler.decode(path, owned.bytes, options.forceText)
          const domain = options.kind ?? inferDomain(path)
          const result = yield* rewrite(text, { kind: domain, path })
          const { removed } = applyLayerA(text)
          const residual = applyLayerA(result.text).removed
          const present = residual.unicode + residual.trailer + residual.banner > 0
          const report = reportFromHumanize({
            kind: owned.kind,
            removed,
            present,
            metric: result.metric
          })
          const dest = destinationOf(path, options)
          const bytes = new TextEncoder().encode(result.text)
          yield* reporter.writeAtomic(dest, bytes)
          return { report, bytes, note: result.note }
        })
    }
  }),
  dependencies: [Reporter.Default]
}) {}
