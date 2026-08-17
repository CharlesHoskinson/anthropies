# Detect channels

Wave 1 reports four adapters. They never share a number. Mixing them into one score is a bug.

Channels: `deterministic` | `c2pa` | `official` | `statistical`.

## Certificate vs best-effort

| Channel | What it is | Certificate? |
|---|---|---|
| `deterministic` | Unicode, trailers, banners (Layer A) | Yes |
| `c2pa` | Hard-bound C2PA / EXIF / XMP / doc props | Yes for what we strip |
| `official` | Anthropic forthcoming text detect API | Only when URL set and vendor payload returned |
| `statistical` | `rewrite_metric` (5-gram overlap) | **No** |

Soft-binding and pixel marks are out of scope. After a successful hard strip the report still says: hard-bound C2PA/metadata removed; soft-binding and pixel marks remain residual.

## `deterministic`

Layer A: invisible Unicode, agent git trailers, Generated-with banners. This is a certificate for the bytes we strip. Report per-kind counts only. Inspect exit 1 is driven by `deterministic` or `c2pa` **present**.

`clean` strips this layer. It does not remove the keyed text mark.

## `c2pa`

Hard-bound C2PA / EXIF / XMP / container metadata on supported files. Certificate for what we strip, once implemented and tested.

Until that family lands, public skill/slash copy does not claim C2PA removal. Plugin copy may say “(once implemented) hard-bound C2PA metadata.”

C2PA track on `demo` is `skipped` or `certified` (never implied from text).

## `official`

`OfficialFinding = { _tag: "Unavailable" } | { _tag: "Available", url, raw }`.

Unset `ANTHROPIC_DETECT_URL` always yields `Unavailable`. No default URL. No `score` field on `Unavailable`. Do not paraphrase a vendor payload as “watermark gone.” Official never flips inspect to exit 1 by itself.

## `statistical`

```
rewrite_metric: {
  ngram: 5,
  tokenizer: "unicode-words",
  surviving_ratio: number | null,
  n: number,
  domain: "prose" | "code" | "unknown",
  status: "computed" | "insufficient" | "not-run"
}
```

`insufficient` if `n < 200` tokens or `domain === "code"`. **No threshold in CI.** Copy: “overlap fell; this is not a watermark score.” Never “the watermark is gone.” Rewrite is best-effort; residual statistical signal may remain.

## What `demo` may print

```
capture → inspect → clean → humanize (never Claude) → inspect
```

`demo` prints:

- the honesty stanza twice (before and after)
- a four-row channel table (`deterministic`, `c2pa`, `official`, `statistical`)

`demo` never prints a success banner. No `✓ watermark cleared`. No official text-kill claim.

Script success = pipeline ran + honesty lines present + no mixed score. It does not pass or fail on official text or 5-grams. Rewrite track is skipped if backend is print-prompt (`rewrite_metric.status = not-run`).
