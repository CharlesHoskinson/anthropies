# Claims

Wave 1 public-copy contract. These rules apply to README, SKILL, plugin, slash command, CLI help, Report, JSDoc, tests, fixtures, changelog, and demo stdout.

**Product sentence (only allowed one-liner):** Restore clean title in Outputs the user already owns.

This document does not prove the official detector, does not prove text is human-written, and does not treat absence of a mark as proof Claude was uninvolved.

## Forbidden phrases

Do not use these except inside an Anthropic quotation (and then only when quoting):

- `undetectable` (except inside an Anthropic quotation)
- `official detector will fail` / `fails the official check`
- `proves human-written`
- `watermark score` / `destamped` / `destamp`
- `we removed the Claude watermark` / `watermark removed` as a verdict
- `clean C2PA from a Claude file` until C2PA is implemented and tested
- `strip a Claude watermark`
- `destamp SynthID-class text`
- any mixed score that ORs channels

**Forbidden Report fields:** `suspicious`, `watermarkScore`, `watermark_score`, `destamped`, `undetectable`, `clean` as a verdict, a flat mixed `removed` bag.

Copy must not claim official watermark removal, official-detector failure, or that a rewrite is a certificate.

## Required honesty stanza

Human stderr and JSON `honesty` use this locked stanza:

```
official text detector: unavailable (ANTHROPIC_DETECT_URL unset)
  — or the raw vendor result, never paraphrased as “watermark gone”
c2pa: present | absent | removed | not-applicable
deterministic: <per-kind counts only>
statistical: best-effort; surviving 5-gram ratio=<n or not-run>; not an official-detector certificate
this run does not prove the official Claude text detector will fail
this run does not prove the text is human-written
absence of a mark does not prove Claude was uninvolved
```

The last three lines are required denials, not capabilities. They must appear even when deterministic clean succeeds.

## Channel verbs

Adapters never share a number. Mixing them into one score is a bug.

Finding `status` verbs: `present` | `absent` | `unavailable` | `best-effort` | `degraded`.

Per-channel verbs:

| Channel | Allowed verbs | Certificate? |
|---|---|---|
| `deterministic` | per-kind counts; `present` / `absent` | Yes |
| `c2pa` | `present` \| `absent` \| `removed` \| `not-applicable` | Yes for what we strip |
| `official` | `unavailable` (URL unset) or raw vendor result | Only when URL set and vendor payload returned |
| `statistical` | `computed` \| `insufficient` \| `not-run`; surviving 5-gram ratio | **No** |

Do not paraphrase a vendor payload as “watermark gone.” Statistical copy: “overlap fell; this is not a watermark score.” Never “the watermark is gone.”

`removed` is nested **per channel**, never mixed.

## What this run does not prove

- This run does not prove the official Claude text detector will fail.
- This run does not prove the text is human-written.
- Absence of a mark does not prove Claude was uninvolved.

A complete rewrite is the published erasure. We apply that erasure as best-effort and refuse to call it a certificate.

## Locked skill YAML (until C2PA family is tested)

```
description: >
  Use when the user asks to purge anthropies, strip Co-Authored-By Claude,
  strip Generated-with banners, inspect owned files for vendor marks,
  or runs /purge-anthropies or /anthropies.
  Does not claim official watermark removal.
```

After the C2PA family is tested, add: `clean hard-bound C2PA metadata from owned png/jpg/svg (and other supported files).` Do not restore `strip a Claude watermark` or `destamp SynthID-class text`.

The skill and README call `npx anthropies` / `node dist/cli.js`.

## Locked plugin description

Restore clean title in Outputs you own. Strip git trailers, banners, and (once implemented) hard-bound C2PA metadata. Does not defeat Anthropic’s unpublished text detector.

## CLI help (exact sense)

```
inspect   Report marks by channel. Never a single watermark score.
clean     Strip deterministic Layer A and hard-bound C2PA/metadata.
          Does not remove the keyed text mark.
humanize  Title restoration: rewrite wording on a non-origin model (best-effort).
          Refuses Claude and Gemini. print-prompt does not destamp.
capture   Fetch a Claude Output you own, for fixtures. Does not watermark.
demo      capture → inspect → clean → humanize → inspect.
          Prints four channels. Never claims official text-kill.
serve     Serve inspect and clean on loopback. Does not humanize.
          Never claims official text-kill.
```

## humanize

| Command | Allowed claim |
|---|---|
| `humanize` | Title restoration via non-origin rewrite (best-effort). Residual statistical risk remains. print-prompt does not destamp. Not an official-kill or official-detector certificate. |

`destamp` stays forbidden as a capability. The denial `print-prompt does not destamp` is required (Wave 3 section 2), same pattern as `does not prove the official Claude text detector will fail`.

## serve

| Command | Allowed claim |
|---|---|
| `serve` | Local HTTP inspect/clean. Loopback by default. No `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set. |

`/humanize` is not a route. Layer B stays CLI-only.

## Report field meanings

- `kind` — classified file kind, never a verdict.
- `findings[]` — each finding has a `channel` and a `status` from the verb set above.
- `removed` — nested per channel. Not a mixed bag.
- `anyDeterministicHits` — named so it cannot be read as “watermark detected.”
- `degraded` — a Finding path (missing tool, etc.), not a Fail.
- `honesty` — the locked stanza.
- `rewrite_metric` — on `humanize` / `demo` when a rewrite ran or was skipped. Not a watermark score.

## Demo last stanza

`demo` prints the honesty stanza twice (before and after) and a four-row channel table. No success banner. No `✓ watermark cleared`. Success of the script means the pipeline ran, honesty lines are present, and no mixed score. It does not pass or fail on official text or 5-grams.
