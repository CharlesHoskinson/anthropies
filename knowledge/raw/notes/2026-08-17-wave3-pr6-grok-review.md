# Wave 3 PR #6 Grok merge-gate review

Date: 2026-08-17
Role: Grok merge reviewer (independent; not STYLE/QA/DOCS trio)
Task: Family 4 merge gate for PR #6 (`feat/wave3-layerb` vs `origin/main`)
PR: https://github.com/CharlesHoskinson/anthropies/pull/6
Spec: `docs/superpowers/specs/2026-08-17-anthropies-wave3-design.md`
Diff: `origin/main...HEAD` (also `.superpowers/sdd/2026-08-17-anthropies-wave3/review-full-origin-main.diff`)
Prior: Families 1–3 STYLE/QA/DOCS APPROVE. Full-diff STYLE/QA/DOCS APPROVE. Parent `pnpm test` 48 passed; `pnpm build` green.

## Verdict

**MERGE.** 0 BLOCKER. 0 MAJOR. 5 NIT (all carry-forward).

Did not modify product source. Did not commit. Did not push. Did not post a GitHub review.

## Hard blockers

| Blocker | Result |
|---|---|
| official-kill / destamp / undetectable claimed as a capability | PASS — denials only; manifesto `undetectable` is the Anthropic quotation; official adapter stays `Unavailable` |
| `rewrite_metric` used as a CI pass bar | PASS — tests check `status` / `n` / nullness; no ratio threshold; `residualDrivesExit` ignores statistical |
| HTTP `/humanize` added | PASS — no `src/http/`; no inbound route; outbound CLI rewrite POST only |
| origin blocklist broken | PASS — tokens `claude\|anthropic\|gemini\|google-gemini\|synthid`; block before POST; bytes unchanged; exit 2 |
| print-prompt destamps or is no longer default | PASS — `Config.withDefault("print-prompt")`; returns prompt + `not-run`; note denies destamp |
| live model required in default CI | PASS — fake `HttpClient.make`; `test:live` is capture-only; parent 48 passed |
| Fail/Finding mix or forbidden imports | PASS — `RewriteFailed` / `RewriteRemoteDenied` are Fails (exit 2); missing tools stay Findings; no `node:fs` / `node:http` / `fetch` / `process.env` / `any` / default export |
| Effect 4 | PASS — `effect@3.22.1` |

## What I read

Product: `src/rewrite-backend.ts`, `src/services/humanizer.ts`, `src/rewrite-metric.ts`, `src/config.ts`, `src/fail.ts`, `src/cli.ts`, `src/report.ts`, `src/services/reporter.ts`, `src/services/capturer.ts`, `src/services/detector.ts`, `src/services/inspector.ts`, `package.json`, lockfile (`effect@3.22.1`), eslint, README, SKILL, CLAIMS, CHANNELS, plugin, slash command.

Tests: `humanize-rewrite-backend.test.ts`, `humanize-print-prompt.test.ts`, `origin-blocklist.test.ts`, `official-claim-forbidden.test.ts`, `official-unavailable.test.ts`, `live-capture.test.ts`.

Prior trio notes and full-diff verdicts. PR #6 summary. Locked Wave 3 spec.

## Independent review

`completeRewrite` is a real POST, not a stub. Ollama `/api/generate` and openai-compatible `/v1/chat/completions` (no doubled `/v1`). Default `http://127.0.0.1:11434`. Loopback = localhost / `::1` / `127.0.0.0/8`. Non-loopback without `ANTHROPIES_REWRITE_ALLOW_REMOTE=1` is `RewriteRemoteDenied` and does not POST.

`Humanizer.rewrite` blocks origin tokens before POST. print-prompt returns the structure-changing prompt + Layer-A-cleaned text + `notRunMetric`. HTTP rewrite then `computeRewriteMetric(cleaned, rewritten, kind)`. `computed` only when `n >= 200` and domain is not `code`.

Fake HTTP tests inject `HttpClient.make` + canned JSON. They assert POST URLs, `computed` at 220 tokens, `insufficient` on a short sentence, origin block with `recorded.length === 0` and bytes unchanged, remote deny, ALLOW_REMOTE=1. No live model. No ratio threshold.

Prompts require clause-order / sentence-boundary / discourse-marker change and keep facts/URLs/fences. Snapshot tests match those phrases. No destamp-as-capability / undetectable / beats-detector in prompt text.

Copy names title restoration + residual statistical risk. `destamp` / `official-kill` appear only as denials. Honesty box, manifesto, and `docs/legal/` stay. Version `0.4.0` on package / plugin / CLI / README How-to-run.

## NITs (do not block merge)

1. Honesty stanza statistical line can stay `not-run` while `rewrite_metric.status` is `computed`. Report field is correct.
2. README Humanize lead “keyed text mark is no longer the shipped prose” is stronger than the honesty box. Residual-risk / not-official-kill / print-prompt denial save it.
3. print-prompt / origin-blocklist tests do not pin `ANTHROPIES_REWRITE_BACKEND`.
4. `origin_blocklist` unit case does not assert the `anthropic` or `google-gemini` strings. Product token list still has all five.
5. `completeRewrite` typed `R = never`; yields `serviceOption(HttpClient)`. Missing client is the correct Fail.

## Not defects

No MarkLLM. No pixel harness. No inbound `/humanize`. Official detect stays stub. Skill 50% line is operator guidance. `::ffff:127.0.0.1` fail-closed. `demo` still skips persisting a rewrite. `ANTHROPIC_DETECT_URL` unused beyond Config is Wave 3 out of scope.

## Conclusion

Hard merge blockers are clear. Recommend MERGE. Ship 0.4.0.
