## Context

Inspector already calls applyLayerA, C2pa, PdfTools. T7 exposes those as packs.

## Goals / Non-Goals

**Goals:** layerAPack wraps applyLayerA. c2paPack wraps inspectRasterBytes/inspectSvgText. pdfPack wraps inspectPdfBytes.

**Non-Goals:** Live Process tools, Inspector rewiring (T8).

## Decisions

Call existing functions only. Probe is always available for these stdlib paths.

## Risks / Trade-offs

UTF-8 decode of artifact.bytes for Layer A. Invalid utf8 still inspects as text via TextDecoder replacement.
