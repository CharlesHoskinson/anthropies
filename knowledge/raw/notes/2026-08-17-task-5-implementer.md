# Task 5 implementer note (raster C2PA)

Date: 2026-08-17
Role: implementer
Task: Raster C2PA (Family 2)

## What I changed

- Created synthetic fixtures `fixtures/c2pa/fixture-c2pa-present.png` and `.jpg`. Planted PNG `tEXt` keyword `c2pa` and JPEG APP11 payload `c2pa`. Not a signed Claude Output. Not WR bytes.
- Created `fixtures/THIRD_PARTY.md`. Synthetic only. `NOTICE` unchanged.
- Created `src/formats/raster.ts`. PNG: drop `caBX`, payload-prefix `c2pa`/`jumb`, and `tEXt`/`iTXt`/`zTXt` with XMP/C2PA keys. Keep `IHDR`/`IDAT`/`IEND`. JPEG: drop APP11 and APP1 XMP. Truncated containers are `DecodeError`.
- Created `src/services/c2pa.ts`. `C2pa.inspect` / `C2pa.strip` wrap the parser. `hasManifestFromToolOutput` treats `No claim found` / `No JUMBF data found` as `has_manifest === false`. Optional `c2patool` is a double-check in tests; missing tool is not a fail. Default `R` stays `FileSystem`.
- Wired `Inspector` / `Cleaner` raster path (no `--force-text`). `makeRasterReport` always appends the soft-binding sentence. After a successful strip, honesty `c2pa` is `removed`.
- `residualDrivesExit`: certificate `present` exits 1 unless `degraded`. CLI inspect/clean/humanize use it.
- `kind.ts` exports `rasterCodec` for PNG/JPEG/GIF/WebP/AVIF/HEIC magic.
- Tests: `cert_c2pa_png_jpeg_svg` (PNG/JPEG rows), `cert_c2patool_false_positive`, `residual_exit_not_suppressed`. Truncated-PNG binary/write guards now expect `DecodeError`.
- After tests green, restored only the narrow skill trigger from spec §13: `clean hard-bound C2PA metadata from owned png/jpg/svg (and other supported files).` Did not restore `strip a Claude watermark`.

## Why

Family 2 has to certify hard-bound C2PA on owned PNG/JPEG. Soft-binding and pixel marks stay residual. Inspect of planted bytes exits 1; successful strip exits 0; leftover present is never laundered. Default tests must not construct `HttpClient`.

## Residual risks

- WebP/AVIF/HEIC classify as `raster` but this task does not strip their boxes. Inspect reports `absent` unless a later family parses them.
- SVG C2PA is Task 6. The skill names svg because spec §13 does; the handler is not here yet.
- JPEG fixture is a minimal SOI/APP11/APP0/EOI, not a photo decoder test. Cert only requires the cleaned file still starts with `\xff\xd8\xff`.
- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.

## Almost did, did not

- Almost copied WR MIT fixture bytes. Did not. Synthetic `tEXt`/`APP11` only. `NOTICE` stays as-is.
- Almost added `CommandExecutor` to `C2pa.Default` for live `c2patool`. Did not. Inspector/Cleaner `R` stays `FileSystem`.
- Almost scanned whole-file ASCII `c2pa` (would false-hit IDAT/pixels). Did not. Structured chunks only.
- Almost wrote `strip a Claude watermark` in the skill. Did not.
- Almost dispatched STYLE/QA/DOCS subagents. Parent instruction: do not dispatch.
