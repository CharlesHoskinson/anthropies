## Why

Sprint 0 T8. Wire Inspector and Cleaner through the transport-neutral pipeline without changing public Report JSON or signatures.

## What Changes

Add `src/core/builtin-registry.ts` and `tests/pipeline-compat.test.ts`. Modify `src/services/inspector.ts` and `src/services/cleaner.ts` so inspect calls `inspectArtifact` and clean calls `transformArtifact` for Layer A text, while office zips and live PDF tools stay on existing format functions.

## Non-goals

- Do not edit `src/report.ts`, `src/layer-a.ts`, or `src/formats/**`.
- Do not UTF-8 round-trip `docx`/`odt`.
- Do not replace PdfTools live qpdf/exiftool with `pdfPack`.
- Do not add formats or algorithms.
- Do not bump HTTP `0.3.0`.

## Capabilities

### New Capabilities

- `pipeline-wire`: Inspector/Cleaner use kernel pipeline; writeAtomic only on clean success

## Impact

`src/core/builtin-registry.ts`, `src/services/inspector.ts`, `src/services/cleaner.ts`, `tests/pipeline-compat.test.ts`.
