import { RewriteMetric } from "./report.js"

export type RewriteDomain = "prose" | "code" | "unknown"

export type ObservationStatus = "computed" | "insufficient" | "not-run"

const UNICODE_WORD = /\p{L}+/gu

const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "into",
  "over",
  "under",
  "not",
  "no",
  "so",
  "than",
  "then",
  "too",
  "very"
])

/** Unicode letter sequences. Not a watermark tokenizer. */
export const unicodeWords = (text: string): Array<string> => text.match(UNICODE_WORD) ?? []

const grams = (tokens: ReadonlyArray<string>, n: number): Array<string> => {
  if (tokens.length < n) {
    return []
  }
  const out: Array<string> = []
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "))
  }
  return out
}

/** Lightweight lexical features. Observation only; never a pass bar. */
export interface StylometryFeatures {
  readonly typeTokenRatio: number
  readonly meanTokenLength: number
  readonly functionWordRate: number
}

/** Stylometric observation. Same sufficiency gate as five-gram overlap. */
export interface StylometryObservation {
  readonly status: ObservationStatus
  readonly n: number
  readonly domain: RewriteDomain
  readonly features: StylometryFeatures | null
}

export interface RewriteObservations {
  readonly metric: RewriteMetric
  readonly stylometry: StylometryObservation
}

export type ObserveRewriteInput =
  | { readonly executed: false; readonly domain: RewriteDomain }
  | {
      readonly executed: true
      readonly before: string
      readonly after: string
      readonly domain: RewriteDomain
    }

/** Skipped rewrite. surviving_ratio stays null. */
export const notRunMetric = (domain: RewriteDomain): RewriteMetric =>
  new RewriteMetric({
    ngram: 5,
    tokenizer: "unicode-words",
    surviving_ratio: null,
    n: 0,
    domain,
    status: "not-run"
  })

/** Skipped rewrite. Features stay null. */
export const notRunStylometry = (domain: RewriteDomain): StylometryObservation => ({
  status: "not-run",
  n: 0,
  domain,
  features: null
})

const stylometryFeatures = (text: string): StylometryFeatures => {
  const tokens = unicodeWords(text).map((t) => t.toLowerCase())
  const n = tokens.length
  if (n === 0) {
    return { typeTokenRatio: 0, meanTokenLength: 0, functionWordRate: 0 }
  }
  const unique = new Set(tokens).size
  const meanTokenLength = tokens.reduce((sum, t) => sum + t.length, 0) / n
  const functionWordRate = tokens.filter((t) => FUNCTION_WORDS.has(t)).length / n
  return {
    typeTokenRatio: unique / n,
    meanTokenLength,
    functionWordRate
  }
}

/** Stylometry observation. insufficient when n < 200 or domain is code. */
export const computeStylometry = (
  before: string,
  after: string,
  domain: RewriteDomain
): StylometryObservation => {
  const n = unicodeWords(before).length
  if (n < 200 || domain === "code") {
    return {
      status: "insufficient",
      n,
      domain,
      features: null
    }
  }
  return {
    status: "computed",
    n,
    domain,
    features: stylometryFeatures(after)
  }
}

/** 5-gram overlap. insufficient when n < 200 or domain is code. */
export const computeRewriteMetric = (
  before: string,
  after: string,
  domain: RewriteDomain
): RewriteMetric => {
  const tokens = unicodeWords(before)
  const n = tokens.length
  if (n < 200 || domain === "code") {
    return new RewriteMetric({
      ngram: 5,
      tokenizer: "unicode-words",
      surviving_ratio: null,
      n,
      domain,
      status: "insufficient"
    })
  }
  const beforeGrams = grams(tokens, 5)
  const afterSet = new Set(grams(unicodeWords(after), 5))
  const surviving = beforeGrams.filter((g) => afterSet.has(g)).length
  return new RewriteMetric({
    ngram: 5,
    tokenizer: "unicode-words",
    surviving_ratio: beforeGrams.length === 0 ? null : surviving / beforeGrams.length,
    n,
    domain,
    status: "computed"
  })
}

/**
 * Paired five-gram and stylometry observations for one rewrite pass.
 * Surviving ratio is null outside computed. Neither value is a CI gate.
 */
export const observeRewrite = (input: ObserveRewriteInput): RewriteObservations => {
  if (!input.executed) {
    return {
      metric: notRunMetric(input.domain),
      stylometry: notRunStylometry(input.domain)
    }
  }
  return {
    metric: computeRewriteMetric(input.before, input.after, input.domain),
    stylometry: computeStylometry(input.before, input.after, input.domain)
  }
}
