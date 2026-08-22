## Context

Wave 2 GET /capabilities is `{ version: "0.3.0", tools, scorers }`. Sprint 0 needs pack inventory.

## Goals / Non-Goals

**Goals:** Add `kernelApiVersion: "1.0.0"` and `packs` array from `builtinRegistry().list()` with availability, license, privacy, network. Keep health `0.3.0`.

**Non-Goals:** Changing inspect/clean routes. Scoring.

## Decisions

`PackCapabilityView` fields: id, implementationVersion, availability.status, availability.reason, license, privacy, network, artifactKinds, operations. Probe each pack. Existing objectContaining tests still pass.

## Risks / Trade-offs

Schema.Class extra required fields change encode. Existing tests use objectContaining so they stay green.
