## Why

Sprint 1 Phase B freezes the remaining deterministic codec matrix. Phase A wraps existing handlers. Phase B adds WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, and structural PDF. This change locks the OpenSpec before pack implementation.

## What Changes

- Extend classification and raster codec detection for BMP and TIFF. Keep GIF, WebP, AVIF, and HEIC on kind `raster`.
- Add hard-bound container-metadata inspect and strip for WebP, AVIF, HEIC, BMP, GIF, and TIFF. Do not touch pixels.
- Add Kind values `xlsx`, `pptx`, and `epub`.
- Add shared OOXML primitives for XLSX and PPTX. Reuse the same zip-member scrub pattern as DOCX.
- Add EPUB container inspect and strip with embedded-data handling under zip expansion caps.
- Complete structural PDF inspect and strip with explicit qpdf and exiftool degradation evidence.
- Advertise new pack ids on GET /capabilities. Keep HTTP `serviceVersion` at `0.3.0`.

## Non-goals

- Pixel algorithms and `markClass` `pixel` operations.
- Soft-bound image credentials.
- UTF-8 decode of office or EPUB zips as Layer A pack input.
- Rewrite, vendor detection, audits, new report channels.
- Replacing `c2paPack` or `pdfPack` inspect ownership.
- Changing Inspector honesty stanza strings.
- Bumping HTTP `serviceVersion` off `0.3.0`.
- Implementing packs in this freeze unit.

## Capabilities

### New Capabilities

- `phase-b-codecs`: Phase B raster codecs, OOXML office kinds, EPUB, and structural PDF behavior

### Modified Capabilities

- (none)

## Impact

`src/kind.ts`, `src/formats/raster.ts`, `src/formats/pdf.ts`, new `src/formats/ooxml.ts` / `xlsx.ts` / `pptx.ts` / `epub.ts`, `src/packs/**`, `src/core/builtin-registry.ts`, `src/http/server.ts`, `tests/**`.

## Foreman

- Worktree: `/home/charl/anthropies-wt-anthropies-s0-20260821-implement-s1b-freeze`
- Branch: `foreman/anthropies-s0-20260821/implement/s1b-freeze`
- Freeze verification: `openspec validate sprint1-phase-b-codecs --strict`
- Later implement verification: `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`
