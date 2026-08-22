## Purpose

Policy for optional packs, certification channels, and conflicting owners.

## ADDED Requirements

### Requirement: optional packs fail soft unless required

WHEN a pack `distribution` is `optional` and `requireCapability` does not include that pack id, the policy SHALL treat unavailability as fail-soft.

#### Scenario: optional detector down does not fail clean

- **WHEN** an optional detector pack is unavailable and requireCapability is empty
- **THEN** `isOptionalFailSoft` SHALL return true

#### Scenario: required optional pack is not fail-soft

- **WHEN** requireCapability includes that pack id
- **THEN** `isOptionalFailSoft` SHALL return false

### Requirement: certification channels

WHEN `isCertificationChannel` is called, the policy SHALL return true only for `deterministic` and `c2pa`.

#### Scenario: statistical is not certification

- **WHEN** the channel is `statistical`
- **THEN** `isCertificationChannel` SHALL return false

### Requirement: conflicting owners

IF two manifests claim the same nonempty `(artifactKind, markClass, operation)` tuple, THEN `selectOwner` SHALL return `{ ok: false, code: "conflict" }`.

#### Scenario: two layer-a owners conflict

- **WHEN** two manifests both claim `(text, invisible-unicode, remove)`
- **THEN** selectOwner SHALL return conflict
