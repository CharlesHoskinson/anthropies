## Context

T3 selectOwner judges a supplied list. T4 owns the list: registered packs.

## Goals / Non-Goals

**Goals:** Register CapabilityPack values. Reject kernel-range mismatch and conflicting nonempty owner tuples. Empty artifactKinds create no claims.

**Non-Goals:** Planner, pipeline, HTTP.

## Decisions

Use `selectOwner` from policy. Do not duplicate conflict logic. Compare kernelApiMin/Max as X.Y.Z inclusive numeric triples against kernelApiVersion 1.0.0.

## Risks / Trade-offs

Registering an incompatible pack must not leave it in the list.
