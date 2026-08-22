## Context

Depends on strict kernel decode. Caps already exist as `fileCapBytes` and `zipExpansionCapBytes`.

## Goals / Non-Goals

**Goals:** Encode fail-soft, certification channels, preserve-original codes, conflict selection.

**Non-Goals:** Planner, pipeline, HTTP.

## Decisions

Re-export existing byte caps. Do not duplicate magic numbers.

## Risks / Trade-offs

Empty artifactKinds must create no owner tuples (T4). Policy only judges a supplied candidate list.
