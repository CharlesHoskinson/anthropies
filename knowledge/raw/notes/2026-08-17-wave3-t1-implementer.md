# Wave 3 Task 1 implementer note (Family 1 real rewrite path)

Date: 2026-08-17
Role: implementer
Task: Real rewrite path (ollama + openai-compatible) + computed rewrite_metric

## What I changed

- Bumped package (and CLI / plugin) from `0.2.0` to `0.4.0`. Wave 2 `0.3.0` is not on this tree.
- Added `RewriteFailed` and `RewriteRemoteDenied` TaggedErrors (exit 2). Origin blocklist tokens unchanged.
- Added `src/rewrite-backend.ts`: loopback check (`localhost`, `::1`, `127.0.0.0/8`); non-loopback requires `ANTHROPIES_REWRITE_ALLOW_REMOTE=1`; ollama `POST /api/generate` (`stream: false`); openai-compatible `POST /v1/chat/completions` (does not double a trailing `/v1`).
- `Humanizer` now POSTs when backend is ollama or openai-compatible. After a successful rewrite it calls existing `computeRewriteMetric` (`computed` when `n >= 200` prose tokens, else `insufficient`). print-prompt stays default and still returns `not-run`.
- HttpClient is yielded via `Effect.serviceOption` so print-prompt tests never construct a client. CLI `humanize` provides `NodeHttpClient.layer`.
- Tests: `tests/humanize-rewrite-backend.test.ts` uses `HttpClient.make` + canned JSON. No live model. Asserts POST URL, computed/insufficient metric, origin block before POST, remote deny, and ALLOW_REMOTE=1.
- print-prompt note now says it does not destamp.

## Why

Wave 3 Family 1 is the leapfrog Layer B path: actually run a non-origin rewrite and report surviving 5-grams. Never a pass bar. Never MarkLLM. Never official-kill.

## Residual risks

- Honesty stanza statistical line still prints `not-run` after a computed metric. `rewrite_metric` on the Report is correct. Out of this family’s locked surfaces.
- `demo` still skips the rewrite track. Not asked.
- Family 2 copy (README / skill title-restoration wording) and Family 3 prompt snapshot tests not done.
- No live ollama/openai test. Fake HTTP only, as specified.
- Style auditors may want HttpClient in typed `R` instead of `serviceOption`. print-prompt default tests must stay HttpClient-free.

## Almost did, did not

- Almost bound NodeHttpClient into `Humanizer.Default`. Did not. Default print-prompt path stays FileSystem-only.
- Almost stood up a `node:http` loopback server in tests. Forbidden import.
- Almost touched `.worktrees/feat-wave2-service` or `src/http/`. Did not.
- Almost claimed destamp / official-kill / MarkLLM. Did not.
- Almost dispatched STYLE/QA/DOCS. Parent instruction: do not dispatch.
