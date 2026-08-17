# Wave 3 full-branch QA auditor note (Family 4 merge gate)

Date: 2026-08-17
Role: QA
Scope: Full branch `feat/wave3-layerb` vs `origin/main` (`2d9b31a`)
Verdict: APPROVE
Diff: `origin/main...HEAD` at `.superpowers/sdd/2026-08-17-anthropies-wave3/review-full-origin-main.diff`
Prior: Families 1–3 QA APPROVE. STYLE + DOCS full-diff APPROVE.

## Checks (this persona)

| Check | Result |
|---|---|
| Real rewrite path (ollama + openai-compatible, loopback) | PASS |
| Fake HTTP tests; no live model in default CI | PASS |
| rewrite_metric computed after real rewrite when n>=200 prose | PASS |
| rewrite_metric never a CI pass bar | PASS |
| Stronger prompts + structure-rule tests | PASS |
| Origin blocklist still refuses the five tokens | PASS |
| print-prompt default does not destamp; metric not-run | PASS |
| No src/http/ | PASS |
| Tests green (`pnpm test` then `pnpm build`) | NOT EXECUTED (no shell in this auditor process) |
| No official-kill asserted | PASS |

## Independent review

Full-branch static review of `origin/main...HEAD`. Product sources match the locked Wave 3 spec. I did not execute `pnpm test` or `pnpm build`: this auditor process has `read_file` / `grep` / `write` only.

`src/rewrite-backend.ts` is not a stub. `completeRewrite` builds ollama `{ model, prompt, stream: false }` against `/api/generate` or openai-compatible `{ model, messages, stream: false }` against `/v1/chat/completions` (does not double a trailing `/v1`). `HttpClient` comes from `Effect.serviceOption`; missing client is `RewriteFailed`. Default URL is `http://127.0.0.1:11434`. `isLoopbackHostname` accepts localhost / `::1` / `127.0.0.0/8`. Non-loopback without `ANTHROPIES_REWRITE_ALLOW_REMOTE=1` is `RewriteRemoteDenied` and does not POST.

`Humanizer.rewrite` blocks origin tokens before POST, print-prompt returns the prompt + `notRunMetric`, HTTP rewrite then `computeRewriteMetric(cleaned, rewritten, kind)`. `computed` only when `n >= 200` and domain is not `code`.

`tests/humanize-rewrite-backend.test.ts` injects `HttpClient.make` + `HttpClientResponse.fromWeb` + canned JSON. Signature matches `@effect/platform@0.97.1` `make(request, url, signal, fiber)`. Asserts POST URLs, `computed` at 220 tokens, `insufficient` on a short sentence, origin block with `recorded.length === 0` and bytes unchanged, remote deny, ALLOW_REMOTE=1. No live model. `pnpm test` is `vitest run`. `test:live` is still capture-only.

`PROSE_PROMPT` / `CODE_PROMPT` require clause-order / sentence-boundary / discourse-marker change and keep facts/URLs/fences. `humanize_prompt_structure_rules` matches those phrases on emitted print-prompt text. Metric stays `not-run`. Prompts have no destamp-as-capability / undetectable / beats-detector copy.

`ORIGIN_TOKENS` still `claude|anthropic|gemini|google-gemini|synthid`. Official adapter stays `Unavailable`. Tests forbid `watermark removed` / `undetectable`. No `src/http/`.

Static suite: 17 files, 48 `it`/`it.scoped` cases. `live_capture_smoke` skips unless `LIVE=1` + key + allowlisted ID. No ratio threshold. `node_modules` is Linux; run the suite in WSL, not Windows-native Node.

## Surfaces

- `src/rewrite-backend.ts` — real POST; loopback; ollama + openai-compatible
- `src/services/humanizer.ts` — tokens; block before POST; prompts; compute after rewrite
- `src/rewrite-metric.ts` — computed vs insufficient vs not-run
- `src/config.ts` — print-prompt default; loopback URL
- `src/cli.ts` — NodeHttpClient on humanize; destamp denial in help
- `tests/humanize-rewrite-backend.test.ts` — fake HTTP
- `tests/humanize-print-prompt.test.ts` — not-run + structure rules
- `tests/origin-blocklist.test.ts` — tokens + bytes unchanged
- `tests/official-claim-forbidden.test.ts` — no official-kill

## Findings

BLOCKER: none

MAJOR: none

NIT: print-prompt / origin-blocklist tests do not pin `ANTHROPIES_REWRITE_BACKEND`. Fake-backend tests do.

NIT: `origin_blocklist` unit case does not assert the `anthropic` or `google-gemini` strings. Product token list still has all five.

NIT (carry-forward): honesty stanza statistical line can stay `not-run` while `rewrite_metric.status` is `computed`. Report field is correct.

## Not done (correct)

No MarkLLM. No pixel. No inbound `/humanize`. Official detect stays stub. 5-gram ratio is reported, never a pass bar. This auditor does not open a PR.
