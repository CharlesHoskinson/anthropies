## Context

T6 ships inspectArtifact/transformArtifact. T7 ships layer-a, c2pa, pdf packs. Inspector and Cleaner still call applyLayerA and format helpers directly.

## Goals / Non-Goals

**Goals:** Public signatures stay. Report stays four unmixed channels via existing reporter helpers. Layer A text inspect/clean goes through the pipeline. writeAtomic remains the only filesystem write and runs only after success.

**Non-Goals:** Rewriting Report. Routing humanize. New packs for docx/odt/html metadata.

## Decisions

`builtinRegistry()` registers layerAPack, c2paPack, pdfPack. Inspector.inspect calls inspectArtifact. Cleaner.clean calls transformArtifact for kind `text`. docx/odt keep inspectDocx/cleanDocx. PDF keep PdfTools. html/md keep format clean functions plus Layer A via pipeline where kind is text after decode.

## Risks / Trade-offs

Honesty counts still need LayerARemoved. Inspector may call applyLayerA for those counts after inspectArtifact so makeTextReport honesty does not change.
