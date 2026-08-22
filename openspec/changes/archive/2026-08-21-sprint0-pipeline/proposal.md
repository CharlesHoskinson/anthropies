## Why

Sprint 0 T6. Transport-neutral inspect/transform skeleton. Depends on planner. Does not write files.

## What Changes

Add `src/core/pipeline.ts` and `tests/core-pipeline.test.ts`.

## Non-goals

- Do not write files.
- Do not change Inspector or Cleaner.
- Do not wrap builtin algorithms.

## Capabilities

### New Capabilities

- `kernel-pipeline`: plan, inspect, transform, preserve original on uncertainty

## Impact

`src/core/pipeline.ts`, `tests/core-pipeline.test.ts`.
