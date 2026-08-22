## Purpose

Select and order applicable capability packs for one classified kind and operation.

## ADDED Requirements

### Requirement: applicability uses classified kind

WHEN `plan` runs, a listed pack SHALL be selected only if `artifactKinds` contains the classified kind AND `operations` contains `context.operation`.

#### Scenario: text pack is not applied to raster

- **WHEN** kind is `raster` and a pack lists only text kinds
- **THEN** that pack SHALL be omitted

### Requirement: forceText does not reclassify

WHEN `context.forceText` is true, the planner SHALL still use the classified kind and SHALL NOT select text-only packs for a raster artifact.

#### Scenario: PNG forceText stays raster

- **WHEN** kind is `raster` and forceText is true
- **THEN** a text-only pack SHALL be omitted

### Requirement: empty selection is none

IF no listed pack is applicable, THEN plan SHALL return `{ ok: false, code: "none" }`.

### Requirement: ordering and priority

WHEN two applicable packs have no cycle, plan SHALL order them by `ordering.before`/`ordering.after` edges, then by priority descending, then by id.

#### Scenario: after edge is honored

- **WHEN** pack B lists `ordering.after: ["a"]`
- **THEN** plan SHALL place A before B

#### Scenario: higher priority is first without edges

- **WHEN** two disjoint packs have priorities 200 and 50 and empty ordering
- **THEN** the 200 pack SHALL be first

### Requirement: ordering cycle is conflict

IF before/after edges form a cycle, THEN plan SHALL return `{ ok: false, code: "conflict" }`.
