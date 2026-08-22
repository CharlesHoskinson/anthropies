## Context

T4 registry lists compatible packs. T5 filters and orders them for one RunContext.

## Goals / Non-Goals

**Goals:** Applicable packs only. forceText must not reclassify kind. Order by before/after then priority descending then id.

**Non-Goals:** Pipeline execution, HTTP.

## Decisions

`plan(registry, { kind, context })`. Kind is the classified kind. forceText never adds text packs to a raster artifact. Cycle in ordering is conflict.

## Risks / Trade-offs

Empty selection is `none`, not success.
