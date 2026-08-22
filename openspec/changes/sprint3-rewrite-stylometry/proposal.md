## Why

Sprint 3 freezes rewrite and stylometry pack behavior. Title restoration needs multi-candidate non-origin rewrite, a zero-dependency print-prompt default, optional loopback adapters, lexical selection that ignores detectors, and five-gram plus stylometry observations with explicit `computed`, `insufficient`, and `not-run` states. This change locks the OpenSpec before pack implementation.

## What Changes

- Add multi-candidate non-origin rewrite orchestration with per-candidate observation records.
- Keep `print-prompt` as the default rewrite backend. Print-prompt does not destamp.
- Add optional Ollama and OpenAI-compatible adapters that default to loopback.
- Select among rewrite candidates with lexical criteria only. Detector outcomes must not drive selection or success.
- Record five-gram overlap and stylometric observations with states `computed`, `insufficient`, and `not-run`.
- Refuse origin stamper backends and models. Preserve facts, URLs, and fenced code across rewrite prompts.
- Advertise the rewrite pack id on GET /capabilities after implementation. Keep HTTP `serviceVersion` at `0.3.0`.

## Non-goals

- Official-removal certification or official-detector-fail claims.
- Bundled language models or shipping model weights in the package.
- A detector-driven success verdict or a CI efficacy threshold on five-gram or stylometry values.
- An HTTP `/humanize` route. Layer B stays CLI-side.
- Mixing scores such as `watermarkScore`, `suspicious`, or a flat cross-channel `removed` bag.
- Bumping HTTP `serviceVersion` off `0.3.0`.
- Implementing packs in this freeze unit.

## Capabilities

### New Capabilities

- `rewrite-stylometry`: multi-candidate non-origin rewrite, print-prompt default, optional loopback Ollama and OpenAI-compatible adapters, lexical candidate selection, and five-gram plus stylometry observation states

### Modified Capabilities

- (none)

## Impact

`src/packs/rewrite/`, `src/rewrite-backend.ts`, `src/rewrite-metric.ts`, humanize or Layer B services under `src/services/`, `src/core/builtin-registry.ts`, `src/http/server.ts` capabilities listing only, `tests/**`.

## Foreman

- Worktree: `/home/charl/anthropies-wt-anthropies-s0-20260821-implement-s3-freeze`
- Branch: `foreman/anthropies-s0-20260821/implement/s3-freeze`
- Freeze verification: `openspec validate sprint3-rewrite-stylometry --strict`
- Later implement verification: `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`
