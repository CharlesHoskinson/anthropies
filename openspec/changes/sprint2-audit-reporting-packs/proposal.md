## Why

Sprint 2 freezes audit and reporting pack behavior. Single-file inspect already exists. Operators need bounded directory scans, deterministic concurrency, JSON plus channel-scoped SARIF, partial-failure retention, and opt-in website audits with SSRF defense. This change locks the OpenSpec before pack implementation.

## What Changes

- Add a bounded directory audit that plans each selected file with the same capability planner as single-file operations.
- Add configurable concurrency with deterministic aggregation order.
- Add JSON audit output and channel-scoped SARIF that keeps the four report channels unmixed.
- Add partial-failure reporting that retains successful findings when some targets fail.
- Add opt-in website and sitemap audit with SSRF defense, redirect policy, content-type validation, download caps, and request budgets.
- Advertise audit pack ids on GET /capabilities after implementation. Keep HTTP `serviceVersion` at `0.3.0`.

## Non-goals

- Browser rendering or headless page execution.
- Unrestricted crawling outside explicit allowlists, budgets, and depth policy.
- Hosted cloud service operation.
- New report channels beyond `deterministic`, `c2pa`, `official`, and `statistical`.
- Mixing scores such as `watermarkScore` or a flat cross-channel `removed` bag.
- Bumping HTTP `serviceVersion` off `0.3.0`.
- Implementing packs in this freeze unit.

## Capabilities

### New Capabilities

- `audit-reporting-packs`: bounded directory scan, deterministic concurrency, JSON and channel-scoped SARIF, partial-failure reporting, and opt-in website audit with SSRF defense

### Modified Capabilities

- (none)

## Impact

`src/packs/audit-directory/`, `src/packs/audit-website/`, reporting or SARIF helpers under `src/`, CLI or HTTP audit entry points, `src/core/builtin-registry.ts`, `src/http/server.ts`, `tests/**`.

## Foreman

- Worktree: `/home/charl/anthropies-wt-anthropies-s0-20260821-implement-s2-freeze`
- Branch: `foreman/anthropies-s0-20260821/implement/s2-freeze`
- Freeze verification: `openspec validate sprint2-audit-reporting-packs --strict`
- Later implement verification: `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`
