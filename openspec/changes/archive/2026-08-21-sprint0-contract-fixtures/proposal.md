## Why

Sprint 0 T12. Contract fixtures must cover seven cases with both polarities and a nonzero inventory.

## What Changes

Add `src/core/contract-cases.ts`, `tests/contract-inventory.test.ts`, `tests/contract-fixtures.test.ts`, and `fixtures/contract/` manifests.

## Non-goals

- Do not treat skipped or empty selection as pass.
- Do not add empirical efficacy claims.
- Do not merge main.

## Capabilities

### New Capabilities

- `contract-fixtures`: seven contract cases, both polarities, nonempty inventory

## Impact

`src/core/contract-cases.ts`, `tests/contract-inventory.test.ts`, `tests/contract-fixtures.test.ts`, `fixtures/contract/`.
