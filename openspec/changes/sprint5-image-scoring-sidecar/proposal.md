## Why

Sprint 5 freezes reverse-SynthID image scoring behind sidecar protocol `1.0.0`. The kernel already owns loopback sidecar schemas. Operators need a pinned Python scorer, health and capability negotiation, and statistical observations that never become removal verdicts. This change locks the OpenSpec before pack implementation.

## What Changes

- Add an optional image-scoring pack that talks to a pinned Python scorer over sidecar protocol `1.0.0`.
- Require health, capability, compatibility, and provenance negotiation before scoring.
- Default the scorer base URL to loopback. Refuse non-loopback endpoints unless an explicit later policy change allows them.
- Report scorer output as channel `statistical` observations. Do not emit removal verdicts or mixed `watermarkScore` fields.
- When the optional scorer is absent, report availability `unavailable` without breaking unrelated core operations.
- Keep malformed and incompatible sidecar responses from certifying results.
- Keep the publishable core free of incompatible and noncommercial scorer code.
- Keep HTTP `serviceVersion` at `0.3.0`.

## Non-goals

- Image removal, CtrlRegen, MarkDiffusion, or any pixel transform that rewrites owned image bytes.
- Bundling noncommercial or incompatible scorer code into the publishable core package.
- Mixing scorer output into `deterministic`, `c2pa`, or `official` channels.
- Introducing `watermarkScore`, a flat cross-channel `removed` bag, or a global clean certificate.
- Bumping HTTP `serviceVersion` off `0.3.0`.
- Changing sidecar protocol off `1.0.0` in this freeze.
- Implementing the Python service or TypeScript pack in this freeze unit.

## Capabilities

### New Capabilities

- `image-scoring-sidecar`: pinned Python reverse-SynthID image scorer behind protocol `1.0.0`, loopback default, health and capability negotiation, statistical observations only, absence as unavailable, and core licensing isolation

### Modified Capabilities

- (none)

## Impact

`src/packs/image-synthid-score/`, optional Python sidecar under `sidecars/` or an equivalent pinned runtime path, sidecar client wiring, capability and health views, provenance pin files, SBOM or lock artifacts for the optional pack, and image-scoring contract tests.

## Foreman

- Worktree: `/home/charl/anthropies-wt-anthropies-s0-20260821-implement-s5-freeze`
- Branch: `foreman/anthropies-s0-20260821/implement/s5-freeze`
- Freeze verification: `openspec validate sprint5-image-scoring-sidecar --strict`
- Later implement verification: `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`
