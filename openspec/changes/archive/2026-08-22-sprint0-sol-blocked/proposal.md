## Why

Integration Sol QA/code/docs BLOCKED remaining kernel defects after Inspector classified-kind was fixed.

## What Changes

Pipeline probes packs and fail-softs optional unavailability. Transform remediation follows digest change. C2PA parse failure is indeterminate. Sidecar artifacts bind digest to bytes and reject score. Planner treats a self-ordering edge as conflict.

## Non-goals

- Do not add Sprint 1 formats.
- Do not bump HTTP 0.3.0.
- Do not merge a score field into Report.

## Capabilities

### New Capabilities

- `sol-blocked-hardening`: probe fail-soft, digest bind, indeterminate C2PA, planner self-cycle

## Impact

`src/core/pipeline.ts`, `src/core/planner.ts`, `src/packs/c2pa.ts`, `src/sidecars/protocol.ts`, tests.
