# Task 7 implementer note (capture, demo, delete Python)

Date: 2026-08-17
Role: implementer
Task: Capture, demo, delete Python (Family 6)

## What I changed

- Created `src/models/allowlist.json` as `[]` and `src/models/allowlist.ts` (`markedModelIds`). Empty list is valid. Exact ID match only.
- Created `src/services/capturer.ts`. `Capturer.capture({ model, prompt })` is `Effect<{ path, sidecar }, MissingApiKey | PreMarkModel, FileSystem | HttpClient>`. Unknown model → `PreMarkModel` before HTTP or key. Sidecar: `capturedFrom`, `model`, `created`, `tokenCount`. No key. No `watermarked`. No `sampled`. Command is `capture`, not `sample`.
- Implemented `capture` and `demo` in `src/cli.ts`. `HttpClient` is provided only on those handlers (`NodeHttpClient.layer`). Inspect/clean stay FileSystem-only.
- `demo` prints the honesty stanza twice and a four-row channel table. Empty allowlist skips capture. C2PA and rewrite tracks skip rather than fail. Exit 0 if certificates that could run did.
- Tests: `premark_unknown_model`, `official_unavailable_default`, `live_capture_smoke` (skipped unless `LIVE=1` and key and a pinned ID). Live asserts sidecar + official unavailable. No mark/unmark assert.
- Rewrote `README.md` per spec §14: honesty box first, `pnpm install -g` / `npx anthropies inspect|clean|humanize|capture|demo`, command × channel matrix, How the Mark Works, manifesto, legal last. Replaced the deferred non-quotation `undetectable`.
- Retargeted `skills/purge-anthropies/SKILL.md` from `python3 -m anthropies` to `npx anthropies` / `node dist/cli.js`. Plugin version `0.2.0`.
- Deleted Python only after skill/README/plugin no longer mentioned `python3 -m anthropies`: `src/anthropies/`, `pyproject.toml`, `tests/test_clean.py`, `tests/test_humanize.py`.

## Why

Family 6 is the last Wave-1 family. Capture is fixture smoke, not a watermarker. Official stays `Unavailable` unless `ANTHROPIC_DETECT_URL` is set. Python cannot remain once the public skill points at `npx`.

## Residual risks

- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- `allowlist.ts` and `allowlist.json` are dual sources. A named test requires them to match. Wave-1 state is empty.
- HTTP / parse failures after an allowlisted model are defects (`orDie`), not new Fail tags. Live test skips on those.
- `pnpm demo` provides `NodeHttpClient.layer` even when capture is skipped. Default `pnpm test` does not run demo and does not construct `HttpClient`.

## Almost did, did not

- Almost shipped a non-empty allowlist guess. Did not. Empty is valid; unknown ID is `PreMarkModel`.
- Almost named the command `sample`. Did not.
- Almost asserted live text is marked or unmarked. Did not.
- Almost deleted Python before the skill retarget. Did not. Grep on skill/commands/README/plugin was clean first.
- Almost implemented HTTP service, Docker, MarkLLM, or pixel. Did not. Version stays `0.2.0`.
