## Why

Sprint 0 T3. Encode fail-soft optional packs, fail-closed certification, size caps, and owner conflicts. Depends on `sprint0-kernel-strict-decode`, which archived 2026-08-21.

## What Changes

Add `src/core/policy.ts` and `tests/core-policy.test.ts`.

## Non-goals

- Do not port new formats or detectors.
- Do not write files from policy.

## Capabilities

### New Capabilities

- `capability-policy`: fail-soft, fail-closed, caps, conflict selection

## Impact

`src/core/policy.ts`, `tests/core-policy.test.ts`, `src/formats/registry.ts` (re-export caps only).
