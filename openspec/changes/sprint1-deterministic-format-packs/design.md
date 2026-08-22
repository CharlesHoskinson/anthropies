## Context

Sprint 0 kernel, layer-a/c2pa/pdf packs, and Inspector wiring are on main. Format logic still lives in `src/formats/*` and Inspector kind switches.

## Goals / Non-Goals

**Goals:** Inspect-clean-reinspect fixture pairs. Byte preservation. Magic/suffix disagreement. Binary refusal. Archive caps. Atomic writes. Accurate `/capabilities`.

**Non-Goals:** Pixel, rewrite, detectors, new algorithms copied from watermarks-remover.

## Decisions

Phase A wraps existing handlers (html, md, svg metadata, docx, odt, raster strip, PdfTools). Phase B adds codecs. DOCX/ODT packs call inspectDocx/cleanDocx and never UTF-8-decode the zip as Layer A.

## Risks / Trade-offs

html/md dual Layer A plus metadata. PDF qpdf/exiftool stay degraded evidence, not silent absence.
