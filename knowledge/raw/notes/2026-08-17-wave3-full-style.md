# Wave 3 FULL-BRANCH STYLE auditor note (Family 4 leapfrog)

Date: 2026-08-17
Role: STYLE (TypeScript/Effect style + honesty)
Scope: Full branch `origin/main...HEAD` (`2d9b31a` Wave 1 → current `feat/wave3-layerb`)
Diff: `.superpowers/sdd/2026-08-17-anthropies-wave3/review-full-origin-main.diff`
Spec: `docs/superpowers/specs/2026-08-17-anthropies-wave3-design.md` §2
Prior: Families 1–3 STYLE/QA/DOCS all APPROVE. This is the whole leapfrog, not a re-litigation of accepted nits.

## Verdict

**APPROVE**

- BLOCKER: 0
- MAJOR: 0
- NIT: 2

## STYLE gate (full Wave 3 leapfrog)

Style fails on Effect 4, inbound HTTP `/humanize` or a `src/http/` rewrite, origin-token drift, destamp-as-capability, `rewrite_metric` as a CI pass bar, MarkLLM/pixel/CtrlRegen, ship version ≠ 0.4.0, forbidden imports, Fail/Finding mix, missing real rewrite, or synonym-swap-only prompts.

| Check | Result | Cite |
|---|---|---|
| Effect 3, not 4. ESM Node 22 | PASS | `package.json` `effect@^3.22.1`, `"type": "module"`, `engines.node: ">=22"`. Lockfile pins `effect@3.22.1`. tsconfig `strict` + `NodeNext` + `verbatimModuleSyntax` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. `@effect/cli` + `NodeRuntime.runMain` + `NodeContext.layer`. |
| No HTTP `/humanize`. Do not rewrite `src/http/` | PASS | No `src/http/` on the tree. No inbound route. Wave 2 HTTP files not present and not fought. Outbound rewrite is CLI `humanize` → `HttpClient` POST. |
| Origin blocklist stays | PASS | `ORIGIN_TOKENS = ["claude", "anthropic", "gemini", "google-gemini", "synthid"]` (`src/services/humanizer.ts:27`). Pure `originBlocked`. Runs before POST. `OriginBlocked` TaggedError; `failTags` → exit 2. Tests: `origin_blocklist` + rewrite-backend “refuses before POST”. |
| Default `print-prompt`. Does not destamp | PASS | `rewriteBackend` defaults `print-prompt` (`src/config.ts:15`). Branch returns prompt + `notRunMetric`. Note: `print-prompt: does not destamp; run this on an unmarked local model`. README / skill / CLI / CLAIMS deny destamp. |
| `rewrite_metric` reported, never a CI bar | PASS | After a successful HTTP rewrite: `computeRewriteMetric(cleaned, rewritten, kind)`. `computed` when `n >= 200` prose; else `insufficient`. print-prompt stays `not-run`. Tests check `status` / `n` / `surviving_ratio !== null`. No assertion on the ratio value. Skill 50% line is operator guidance. |
| No MarkLLM / pixel / CtrlRegen | PASS | None in `src/` or `tests/`. Pixel remains residual report language (`softBindingSentence`). |
| Version 0.4.0 | PASS | `package.json:3`, `.claude-plugin/plugin.json:3`, `CliCommand.run(..., { version: "0.4.0" })`. Wave 2 unmerged; 0.4.0 is the locked Wave 3 ship version. |
| Forbidden imports | PASS | No `node:fs` / `fs/promises` / `node:child_process` / `node:http` / `fetch` / `process.env` / `console.log` / `Effect.runPromise` / `any` / `as unknown as` / default exports in `src/`. `node:crypto` in reporter is allowed. Outbound HTTP is `@effect/platform` `HttpClient` + `HttpClientRequest.post`. Tests inject `HttpClient.make`. Env is `Config` / `ConfigProvider.fromMap`. eslint locks the set. |
| Fail ≠ Finding. Honesty | PASS | New Fails: `RewriteFailed`, `RewriteRemoteDenied` (exit 2). Missing tools stay Findings. destamp / undetectable / official-kill only as denials. Honesty box + manifesto + legal untouched. CLI help = CLAIMS sense. |
| Real rewrite, loopback-default | PASS | `src/rewrite-backend.ts`: ollama `/api/generate`, openai-compatible `/v1/chat/completions` (no doubled `/v1`). Default `http://127.0.0.1:11434`. `isLoopbackHostname` = localhost / `::1` / `127.0.0.0/8`. Non-loopback without `ANTHROPIES_REWRITE_ALLOW_REMOTE=1` is `RewriteRemoteDenied` before POST. `Humanizer.Default` does not bind `NodeHttpClient`; CLI `humanize` provides it. |
| Stronger prompts | PASS | `PROSE_PROMPT` / `CODE_PROMPT` require clause-order / sentence-boundary / discourse-marker change; forbid synonym-swap-in-place; keep facts/URLs/fences. `humanize_prompt_structure_rules` snapshots both. No `undetectable` / `beats detector` in prompt text. |

## Findings

### BLOCKER

None.

### MAJOR

None.

### NIT

1. **README How-to-run** — still says `Version is 0.2.0` while package / plugin / CLI are `0.4.0`. Stale copy. Family 3 QA already logged it. Not a ship-version miss and not an honesty violation.

2. **`src/rewrite-backend.ts` `completeRewrite`** — typed `R = never`; yields `Effect.serviceOption(HttpClient)`. Missing client is `RewriteFailed`. Family 1 STYLE nit. Keeps print-prompt tests client-free. Prefer `R = HttpClient` on the HTTP path.

## Not defects

- Family 1: `new URL()` try/catch; `bodyUnsafeJson` request encode. Response already Schema.
- Family 3: README lead “keyed text mark is no longer the shipped prose” is stronger than the honesty box; residual-risk / not-official-kill / print-prompt denial in the same section save it.
- Honesty stanza statistical line can stay `not-run` when `rewrite_metric` is `computed`. Report field is the metric.
- Skill “Target well under 50% surviving 5-grams” is pre-existing operator guidance, not a CI pass bar.
- `::ffff:127.0.0.1` fail-closed. QA, not STYLE.
- `serviceOption` so `Humanizer.Default` stays FileSystem-only. Per-command `R`: `NodeHttpClient.layer` on `humanize` / `capture` / `demo` only.
- Families 1–3 nits stay nits. None are honesty violations.

## Conclusion

Full Wave 3 leapfrog matches the STYLE hard gate. APPROVE.
