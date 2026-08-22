## Why

Sprint 4 reaches text-detection parity with `watermarks-remover` PR #109 through replaceable adapters. The kernel already owns pack manifests. Detection still lacks a registry, a Gemini SynthID adapter, an Anthropic seam, a MarkLLM same-configuration harness, and a dedicated `/detect` route.

## What Changes

- Add a detector registry that uses the same capability manifest and version rules as other packs.
- Add a Gemini SynthID text adapter on the statistical channel.
- Add an Anthropic official-channel seam that stays unavailable until a real supported service is configured, with no score.
- Add a MarkLLM same-configuration harness that never stands in for vendor efficacy.
- Add GET-or-POST `/detect` with OpenAPI and capability golden tests.
- Keep fail-soft behavior for unconfigured, rate-limited, and malformed adapters.
- Keep HTTP `serviceVersion` at `0.3.0`.

## Non-goals

Cross-vendor equivalence. Guessed Anthropic watermark schemes. Using detection as a clean certificate. Bumping HTTP off `0.3.0`. Image scoring. CtrlRegen. MarkDiffusion. Implementing packs in this freeze change.

## Capabilities

### New Capabilities

- `detector-registry`: detector pack registry, Gemini SynthID adapter, Anthropic seam, MarkLLM harness, `/detect`, fail-soft adapter faults, and detection-is-not-certificate rules

### Modified Capabilities

- (none)

## Impact

`src/packs/detector-*`, MarkLLM harness pack or sidecar, detector registry wiring, HTTP `/detect`, OpenAPI, capability views, and detector contract tests.

## Foreman

- Worktree: `anthropies-wt-anthropies-s0-20260821-implement-s4-freeze`
- Verification: `openspec validate sprint4-detector-registry --strict`
