## Why

Codex GPT-5.6 Sol (QA and code) and Claude Fable blocked T1/T2. Default Effect Schema decode strips unknown fields. Tests only fail when they pass `{ onExcessProperty: "error" }` at the call site. Production decode would accept `watermarkScore` and `score`. Artifact digest is not bound to bytes on decode. Several negative controls are missing.

This package is the T1/T2 rework. Later Sprint 0 changes SHALL wait until this archives.

## What Changes

- Kernel Schema classes reject excess properties under default ParseOptions.
- Kernel tests MUST NOT pass `onExcessProperty`.
- Negative controls cover `suspicious`, `score`, and `watermarkScore` on KernelFinding.
- `makeArtifact` copies bytes. Decode fails when `sha256(bytes)` does not equal `digest`.
- CapabilityManifest missing `kernelApiMax` fails decode.
- Drop unused test imports.

## Non-goals

- Do not edit `src/report.ts`.
- Do not start T3–T12.
- Do not change OfficialFinding production schema. Keep the existing official-unavailable test pattern.

## Capabilities

### New Capabilities

- `kernel-decode`: strict kernel JSON decode and artifact digest binding

### Modified Capabilities

- `report-channels`: kernel types must not leak mixed scores into public Report

## Impact

- `src/core/domain.ts`
- `src/core/capability.ts`
- `tests/core-domain.test.ts`
- `tests/core-capability.test.ts`

Foreman: Grok implementer, then Codex Sol QA/code/docs, then Claude advisor if still blocked.
