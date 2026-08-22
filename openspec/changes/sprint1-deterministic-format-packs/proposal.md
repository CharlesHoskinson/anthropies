## Why

Sprint 1 Phase A. Reach the deterministic format matrix by wrapping handlers that already exist. Do not copy watermarks-remover dispatch. Do not mix report scores.

## What Changes

Register CapabilityPack wrappers for html, md, svg-remove, docx, odt, raster-strip, and pdf-tools. Advertise the new ids on GET /capabilities. Inspector and Cleaner keep their public signatures and keep calling the format functions named in `pipeline-wire`. HTTP `serviceVersion` stays `0.3.0`.

Phase B (WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, structural PDF) is a later OpenSpec change after Phase A archives.

## Non-goals

Pixel marks, rewrite, vendor detection, audits, new report channels, UTF-8 round-trip of office zips, replacing `c2paPack` or `pdfPack`, changing Inspector claim mapping, bumping HTTP 0.3.0.

## Capabilities

### New Capabilities

- `deterministic-format-packs`

## Impact

`src/packs/**`, `src/core/builtin-registry.ts`, `src/http/server.ts`, `tests/packs-*.test.ts`, `tests/http-capabilities.test.ts`.
