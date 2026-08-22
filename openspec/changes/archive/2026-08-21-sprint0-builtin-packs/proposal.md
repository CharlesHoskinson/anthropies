## Why

Sprint 0 T7. Wrap existing Layer A, C2PA stdlib parse, and PDF byte-scan as CapabilityPack values. No new algorithms.

## What Changes

Add `src/packs/layer-a.ts`, `src/packs/c2pa.ts`, `src/packs/pdf.ts`, and `tests/packs-builtin.test.ts`.

## Non-goals

- Do not edit `src/layer-a.ts` or `src/formats/**`.
- Do not spawn qpdf, exiftool, or c2patool.
- Do not write files.

## Capabilities

### New Capabilities

- `builtin-packs`: layer-a, c2pa, pdf wrappers

## Impact

`src/packs/**`, `tests/packs-builtin.test.ts`.
