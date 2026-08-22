## Why

Sprint 7 freezes distribution and integration after pack APIs settle. Operators need compose profiles, health and capability discovery, independently installable pack artifacts, and a kernel/pack compatibility matrix that covers current and previous sidecar protocol versions. This change locks the OpenSpec before packaging work.

## What Changes

- Add Compose profiles that separate local-only core from licensed optional packs.
- Require health checks and capability discovery for core and enabled optional packs.
- Require independently installable pack artifacts so optional packs enable one at a time.
- Publish a kernel and pack compatibility matrix that includes current and previous sidecar protocol versions.
- Forbid a monolithic all-model image and forbid automatic model download.
- Keep the publishable core TypeScript-only.
- Keep HTTP `serviceVersion` at `0.3.0` unless a separate contract changes it.
- Require CLI, HTTP, skill, operator, security, and troubleshooting documentation for distribution.

## Non-goals

- Implementing Compose profiles, pack packages, or matrix automation in this freeze unit.
- Adding CtrlRegen, MarkDiffusion, MarkLLM, or other Sprint 6 pack algorithms.
- Bumping HTTP `serviceVersion` off `0.3.0` in this change.
- Changing sidecar protocol off `1.0.0` in this change.
- Shipping a single image that embeds every optional model and sidecar.
- Silent or startup-time model downloads.

## Capabilities

### New Capabilities

- `distribution-integration`: Compose profiles for local-only and licensed packs, health and capability discovery, independently installable pack artifacts, kernel/pack and sidecar-protocol compatibility matrix, TypeScript-only core, no monolithic all-model image, and no automatic model download

### Modified Capabilities

- (none)

## Impact

`compose.yaml` and profile fragments, optional pack package manifests, compatibility matrix artifacts, core image build inventory, documentation under CLI/HTTP/skill/operator/security/troubleshooting paths, and distribution contract tests.

## Foreman

- Worktree: `/home/charl/anthropies-wt-anthropies-s0-20260821-implement-s7-freeze`
- Branch: `foreman/anthropies-s0-20260821/implement/s7-freeze`
- Freeze verification: `openspec validate sprint7-distribution-integration --strict`
- Later implement verification: `pnpm test` and compose config validation for declared profiles
