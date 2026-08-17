import { RewriteMetric } from "./report.js"

export type RewriteDomain = "prose" | "code" | "unknown"

const UNICODE_WORD = /\p{L}+/gu

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
