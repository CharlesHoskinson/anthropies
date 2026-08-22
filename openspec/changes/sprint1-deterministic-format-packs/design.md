## Context

Sprint 0 kernel, `layerAPack`, `c2paPack`, `pdfPack`, and Inspector classified-kind are on `main`. Format logic still lives in `src/formats/*`. Inspector still builds reports from format functions. `inspectArtifact` already runs for every kind.

## Goals / Non-Goals

**Goals:** Inspect-clean-reinspect fixture pairs stay green. Byte preservation for zip kinds. Accurate `/capabilities`. Wrap, do not rewrite, existing handlers.

**Non-Goals:** Pixel, rewrite, detectors, new algorithms, changing `Report` honesty strings, UTF-8 decode of docx/odt as Layer A input.

## Decisions

Phase A wraps existing handlers. Pack ids:

- `anthropies.html` inspect+remove, kinds `html`, markClass `provenance-metadata`, channel `c2pa`. Calls `inspectHtmlText` / `cleanHtmlText`.
- `anthropies.md` inspect+remove, kinds `md`, same markClass. Calls `inspectMdText` / `cleanMdText`.
- `anthropies.svg-strip` remove-only, kinds `svg`. Avoids owner conflict with `c2paPack` inspect on svg. Calls `cleanSvgText`.
- `anthropies.docx` inspect+remove, kinds `docx`. Calls `inspectDocx` / `cleanDocx` with the artifact name or `"owned.docx"`. Never UTF-8-decodes the zip as Layer A pack input.
- `anthropies.odt` inspect+remove, kinds `odt`. Calls `inspectOdt` / `cleanOdt`.
- `anthropies.raster-strip` remove-only, kinds `raster`. Avoids owner conflict with `c2paPack` inspect. Calls `stripRasterBytes`.
- `anthropies.pdf-tools` remove-only, kinds `pdf`. Avoids owner conflict with `pdfPack` inspect. Probe status `degraded` and reason `tool-missing` when qpdf or exiftool is absent. Transform does not certify absence as clean.

`layerAPack` keeps html/md/svg for unicode/trailer/banner. Different markClasses, so no owner conflict.

Inspector and Cleaner keep calling `inspectHtmlText`, `inspectDocx`, `PdfTools`, and the other named format functions. Packs are for registry, pipeline, and `/capabilities`. Do not rewire Inspector reports in Phase A.

`builtinRegistry()` and HTTP `builtinPacks()` both register the new packs. Health stays `{ ok: true, version: "0.3.0" }`.

Phase B codecs wait until Phase A OpenSpec archive and Sol+Claude are not BLOCKED.

## Risks / Trade-offs

html/md dual Layer A plus metadata. Two inspect packs on html (layer-a + html) is intended. PDF qpdf/exiftool stay degraded evidence, not silent absence. Remove-only packs for svg, raster, and pdf-tools are the conflict-avoidance choice.
