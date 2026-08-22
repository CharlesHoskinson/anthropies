## Why

Sprint 1. Reach the deterministic format matrix without copying watermarks-remover dispatch or mixing report channels.

## What Changes

Turn existing format handlers into CapabilityPack wrappers. Then add WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, and structural PDF degradation evidence.

## Non-goals

Pixel marks, rewrite, vendor detection, audits, new report channels, UTF-8 round-trip of office zips.

## Capabilities

### New Capabilities

- `deterministic-format-packs`

## Impact

`src/packs/**`, `src/formats/**` wrappers only, `tests/packs-formats/`.
