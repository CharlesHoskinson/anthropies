# Task 4 implementer note (humanize print-prompt + origin blocklist)

Date: 2026-08-17
Role: implementer
Task: Humanize print-prompt + origin blocklist (Family 1)

## What I changed

- Created `src/rewrite-metric.ts`. `RewriteMetric` stays in `src/report.ts`. This file builds it: `notRunMetric` (print-prompt) and `computeRewriteMetric` (5-gram unicode-words; `insufficient` if `n < 200` or `domain === "code"`). Print-prompt does not compute.
- Created `src/services/humanizer.ts`. `originBlocked(backend, model)` is true if either lowercased string contains `claude|anthropic|gemini|google-gemini|synthid`.
- Ported `PROSE_PROMPT` / `CODE_PROMPT` from `src/anthropies/humanize.py`. Print-prompt returns the prompt (prefix + Layer-A-cleaned text), not a rewrite. `rewrite_metric.status = "not-run"`. Note: `print-prompt: run this on an unmarked local model`.
- `Humanizer` is `Effect.Service` + `Default`. `humanize(text, { kind })` is the brief surface. `humanizeFile` reuses Task 3 `loadOwned` / `handlerFor` / `applyLayerA` / `Reporter.writeAtomic`. `R` is `FileSystem`. No `HttpClient`.
- ollama / openai-compatible are not HTTP. They fall back to print-prompt with an honest note. Loopback/remote is a later task.
- Origin check runs before any write. `OriginBlocked` → no dest, no `.bak`. CLI maps it to exit 2 (already in `failTags`).
- `reportFromHumanize` attaches `rewrite_metric` and sets the statistical finding to `best-effort`. Honesty still says best-effort / not-run; no removal claim.
- Wired `src/cli.ts` `humanize` with `--json`, `--force-text`, `--in-place`, `-o`, `--kind`. Suffix infers code vs prose when `--kind` is omitted.
- Created `tests/origin-blocklist.test.ts` (brief verbatim + bytes-unchanged `humanizeFile`) and `tests/humanize-print-prompt.test.ts`.

## Why

Family 1 needs Layer B print-prompt and a hard origin refuse. A blocked backend must not re-stamp. Default tests must not construct `HttpClient`.

## Residual risks

- `ANTHROPIES_REWRITE_BACKEND` is `Config.literal` (`print-prompt` / `ollama` / `openai-compatible`). Backend `claude` is a Config defect (`orDie`), not `OriginBlocked`. Model `claude-opus` / `gemini-2.5` / `synthid-demo` is the live `OriginBlocked` path.
- ollama / openai-compatible HTTP not implemented. Fallback is print-prompt. No loopback check yet.
- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- `computeRewriteMetric` is unused by print-prompt. Demo / a later rewrite backend will call it.

## Almost did, did not

- Almost added `HttpClient` to `Humanizer.Default` for ollama stubs. Did not. Default `R` stays `FileSystem`.
- Almost called `Cleaner.clean` first. That writes. OriginBlocked must leave bytes unchanged. Check origin before write.
- Almost claimed a rewrite or a watermark score on print-prompt. Did not. Status is `not-run`. Honesty matches `/best-effort/`.
- Almost dispatched STYLE/QA/DOCS subagents. Parent instruction: do not dispatch.
