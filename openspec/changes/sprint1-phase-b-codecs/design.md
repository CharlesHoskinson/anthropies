## Context

See proposal.md for motivation. Phase A OpenSpec (`sprint1-deterministic-format-packs`) wraps existing handlers. Current `rasterCodec` recognizes PNG, JPEG, GIF, WebP, AVIF, and HEIC. Only PNG and JPEG parse hard-bound C2PA or XMP. GIF, WebP, AVIF, and HEIC stay `applicable: false`. BMP and TIFF are not classified as raster. Kind has no `xlsx`, `pptx`, or `epub`. PDF inspect is a latin1 dictionary and XMP byte-scan plus optional qpdf and exiftool strip.

## Goals / Non-Goals

**Goals:**

- Classify and parse Phase B codecs for hard-bound provenance metadata.
- Keep zip kinds member-scoped. Never UTF-8-decode a full zip as Layer A input.
- Keep four report channels unmixed. Keep health at `0.3.0`.
- Advertise new packs on GET /capabilities after implementation.

**Non-Goals:**

- Pixel watermark removal or soft-binding.
- New algorithms beyond container and structural metadata for these formats.
- Rewiring Inspector claim mapping or honesty strings in this change.
- Implementing packs in the freeze unit that only writes this OpenSpec.

## Decisions

### Raster stays one Kind

Keep WebP, AVIF, HEIC, BMP, GIF, and TIFF on kind `raster`. Extend `rasterCodec` with `bmp` and `tiff`. Add metadata parsers inside `src/formats/raster.ts` (or sibling codec modules imported from it).

Alternative considered: one Kind per codec. Rejected because planner owner tuples and `c2paPack` already key on `raster`.

### Metadata only, never pixels

Parsers MAY read container boxes, chunks, IFDs, or application extensions that carry C2PA, XMP, EXIF, or generator provenance. Parsers SHALL NOT alter pixel samples, color data, or image dimensions to remove marks.

### Owner tuples

- `c2paPack` keeps inspect on kind `raster` for provenance metadata. Phase B extends `inspectRasterBytes` so applicable codecs return real present or absent.
- `anthropies.raster-strip` (Phase A) keeps remove-only and calls `stripRasterBytes`.
- Unparsed or undecodable recognized codecs stay not-applicable or indeterminate. They never certify absent.

### Shared OOXML primitives

Extract shared zip-cap, meta-part, and field-scrub helpers into `src/formats/ooxml.ts`. DOCX may adopt the helpers later. XLSX and PPTX call them for `xl/` / `ppt/` parts and `docProps/` metadata. Pack ids: `anthropies.xlsx`, `anthropies.pptx`. Operations: inspect and remove. Mark class: `provenance-metadata`. Channel: `c2pa`.

Alternative considered: copy docx.ts twice. Rejected to keep zip-cap and scrub rules one place.

### EPUB

Add kind `epub`. Detect PK magic plus `.epub` suffix or `mimetype` member `application/epub+zip`. Inspect and strip OPF metadata and safe embedded XML text members under zip caps. Pack id: `anthropies.epub`. Do not UTF-8-decode the full archive as Layer A input. Embedded binary media follows raster or binary rules after extraction policy, not silent pixel clean.

### Structural PDF

Replace pure latin1 whole-file heuristics with structural object and stream-aware inspect where feasible. Keep `pdfPack` as inspect owner. Keep tool-backed strip degraded when qpdf or exiftool is missing. Degraded evidence never becomes certified absence.

Alternative considered: new inspect pack beside `pdfPack`. Rejected to avoid owner conflict.

### HTTP version

Health and capabilities `version` stay `"0.3.0"`. Pack `implementationVersion` values may be `0.4.0`.

### Freeze vs implement

This change directory freezes requirements. Implementation tasks stay unchecked until a later Foreman implement unit. Do not register packs in this freeze unit.

## Risks / Trade-offs

- [HEIC/AVIF box variance] → Treat undecodable structure as not-applicable or indeterminate. Never absent.
- [OOXML part-name drift across apps] → Scrub known meta parts first. Leave unknown parts unchanged.
- [EPUB embedded media scope] → Cap zip expansion. Refuse bombs. Do not claim pixel clean on embedded rasters unless raster strip applies after a bounded extract path.
- [Structural PDF complexity] → Prefer correct degradation over false clean certificates.
- [Phase A pack gaps] → Phase B assumes Kind and format modules can land even if some Phase A wrappers are still open. Do not replace `c2paPack` or `pdfPack`.

## Migration Plan

1. Archive or keep Phase A change on its own track.
2. Land classification and format modules behind tests.
3. Register packs and advertise capabilities.
4. Rollback is revert of the implement commits. OpenSpec freeze docs stay until archive.

## Open Questions

None that block the freeze. Parser library choice (hand-rolled vs small dependency) is an implement decision as long as behavior matches the scenarios.
