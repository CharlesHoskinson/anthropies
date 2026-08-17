import type { FileSystem } from "@effect/platform/FileSystem"
import { Effect, Option } from "effect"
import { rewriteBackend, rewriteModel } from "../config.js"
import {
  BinaryInput,
  OriginBlocked,
  type DecodeError,
  type InputTooLarge,
  type WriteGuard
} from "../fail.js"
import { handlerFor, loadOwned, pathSuffix } from "../formats/registry.js"
import type { Kind } from "../kind.js"
import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { Finding, Report, type RewriteMetric } from "../report.js"
import { notRunMetric } from "../rewrite-metric.js"
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

/** Ported Layer B prose prefix. Rewrite H-grams; keep facts, URLs, fences. */
export const PROSE_PROMPT = `Rewrite the text below so almost no original 5-word sequence survives.

Rules:
- Keep every fact, number, name, URL, citation, and code fence byte-stable.
- Change clause order, sentence boundaries, discourse markers, and function words.
- Do not synonym-swap in place while keeping the same sentence skeleton.
- Output only the rewritten text.

TEXT:
`

/** Ported Layer B code prefix. Touch comments and non-load-bearing strings only. */
export const CODE_PROMPT = `Rewrite only comments, docstrings, and non-load-bearing string literals.
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

const printPromptNote = (backend: string): string =>
  backend === "print-prompt"
    ? "print-prompt: run this on an unmarked local model"
    : `${backend} not implemented; falling back to print-prompt`

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

const readRewriteTarget = (): Effect.Effect<{ backend: string; model: string }> =>
  Effect.gen(function* () {
    const backend = yield* rewriteBackend.pipe(Effect.orDie)
    const model = Option.getOrElse(yield* rewriteModel.pipe(Effect.orDie), () => "")
    return { backend, model }
  })

const rewrite = (
  text: string,
  options: HumanizeOptions
): Effect.Effect<HumanizeResult, OriginBlocked> =>
  Effect.gen(function* () {
    const { backend, model } = yield* readRewriteTarget()
    if (originBlocked(backend, model)) {
      return yield* blocked(options.path ?? "")
    }
    const cleaned = applyLayerA(text).text
    return {
      text: promptFor(options.kind) + cleaned,
      note: printPromptNote(backend),
      metric: notRunMetric(options.kind)
    }
  })

/** Origin blocklist plus print-prompt rewrite. FileSystem only. */
export class Humanizer extends Effect.Service<Humanizer>()("Humanizer", {
  accessors: true,
  effect: Effect.gen(function* () {
    const reporter = yield* Reporter
    return {
      humanize: (
        text: string,
        options: HumanizeOptions
      ): Effect.Effect<HumanizeResult, OriginBlocked, FileSystem> => rewrite(text, options),
      humanizeFile: (
        path: string,
        options: HumanizeFileOptions
      ): Effect.Effect<
        HumanizeFileResult,
        OriginBlocked | BinaryInput | DecodeError | InputTooLarge | WriteGuard,
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
