## Why

Sprint 0 T4. The kernel needs a pack registry that rejects incompatible kernel ranges and conflicting owners. Depends on capability-policy.

## What Changes

Add `src/core/registry.ts` and `tests/core-registry.test.ts`.

## Non-goals

- Do not plan execution order.
- Do not wrap Inspector or Cleaner.
- Do not start sidecars.

## Capabilities

### New Capabilities

- `pack-registry`: register, kernel-range check, owner lookup via policy selectOwner

## Impact

`src/core/registry.ts`, `tests/core-registry.test.ts`.
