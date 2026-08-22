## Context

T5 plans packs. T6 runs inspect/transform in that order.

## Goals / Non-Goals

**Goals:** Concatenate inspect findings. Sequential transform. Preserve original when shouldPreserveOriginal is true. Empty plan is none, not a write.

**Non-Goals:** Filesystem, HTTP, CLI.

## Decisions

`inspectArtifact` and `transformArtifact` take PackRegistry, Artifact, RunContext. packId `pipeline` on plan-conflict failures.

## Risks / Trade-offs

A pack without transform is skipped on transform, still used on inspect.
