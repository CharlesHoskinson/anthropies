## Purpose

Policy for optional packs, certification channels, preserve-original on uncertainty, size caps, and conflicting owners.

## ADDED Requirements

### Requirement: optional packs fail soft unless required

WHEN a pack `distribution` is `optional` and `requireCapability` does not include that pack id, the policy SHALL treat unavailability as fail-soft.

#### Scenario: optional detector down does not fail clean

- **WHEN** an optional detector pack is unavailable and requireCapability is empty
- **THEN** `isOptionalFailSoft` SHALL return true

#### Scenario: required optional pack is not fail-soft

- **WHEN** requireCapability includes that pack id
- **THEN** `isOptionalFailSoft` SHALL return false

#### Scenario: core pack is not fail-soft

- **WHEN** a pack `distribution` is `core`
- **THEN** `isOptionalFailSoft` SHALL return false

### Requirement: certification channels

WHEN `isCertificationChannel` is called, the policy SHALL return true only for `deterministic` and `c2pa`.

#### Scenario: statistical is not certification

- **WHEN** the channel is `statistical`
- **THEN** `isCertificationChannel` SHALL return false

#### Scenario: official is not certification

- **WHEN** the channel is `official`
- **THEN** `isCertificationChannel` SHALL return false

#### Scenario: c2pa is certification

- **WHEN** the channel is `c2pa`
- **THEN** `isCertificationChannel` SHALL return true

### Requirement: certification protocol mismatch is fail-closed

WHEN the channel is a certification channel and the availability reason is `kernel-mismatch` or `protocol-mismatch`, `isCertificationFailClosed` SHALL return true.

#### Scenario: deterministic protocol-mismatch is fail-closed

- **WHEN** channel is `deterministic` and reason is `protocol-mismatch`
- **THEN** `isCertificationFailClosed` SHALL return true

#### Scenario: statistical protocol-mismatch is not fail-closed

- **WHEN** channel is `statistical` and reason is `protocol-mismatch`
- **THEN** `isCertificationFailClosed` SHALL return false

#### Scenario: deterministic timeout is not protocol fail-closed

- **WHEN** channel is `deterministic` and reason is `timeout`
- **THEN** `isCertificationFailClosed` SHALL return false

### Requirement: preserve original on uncertainty

WHEN `shouldPreserveOriginal` is called with an uncertainty reason, the policy SHALL return true for `timeout`, `malformed-output`, `conflict`, `probe-failed`, and `resource-exceeded`, and SHALL return false for `ready` and `optional-absent`.

#### Scenario: timeout preserves original

- **WHEN** reason is `timeout`
- **THEN** `shouldPreserveOriginal` SHALL return true

#### Scenario: ready does not preserve as uncertainty

- **WHEN** reason is `ready`
- **THEN** `shouldPreserveOriginal` SHALL return false

### Requirement: conflicting owners

IF two manifests claim the same nonempty `(artifactKind, markClass, operation)` tuple, THEN `selectOwner` SHALL return `{ ok: false, code: "conflict" }`.

A manifest claims a tuple WHEN `artifactKinds` contains the kind AND `markClasses` contains the mark class AND `operations` contains the operation. Empty `artifactKinds` SHALL create no owner claims.

#### Scenario: two layer-a owners conflict

- **WHEN** two manifests both claim `(text, invisible-unicode, remove)`
- **THEN** selectOwner SHALL return conflict

#### Scenario: single owner is selected

- **WHEN** exactly one supplied manifest claims the tuple
- **THEN** selectOwner SHALL return `{ ok: true, owner }` for that manifest

#### Scenario: no owner is none

- **WHEN** no supplied manifest claims the tuple
- **THEN** selectOwner SHALL return `{ ok: false, code: "none" }`

#### Scenario: empty artifactKinds does not claim

- **WHEN** one manifest has empty `artifactKinds` and another claims the tuple
- **THEN** selectOwner SHALL return the claiming owner, not conflict

### Requirement: size caps are re-exported

WHEN policy exports byte caps, the values SHALL equal existing `fileCapBytes` and `zipExpansionCapBytes` and SHALL NOT duplicate magic numbers.

#### Scenario: file cap is 256 MiB from registry

- **WHEN** `fileCapBytes` is imported from `src/core/policy.ts`
- **THEN** it SHALL equal `256 * 1024 * 1024` and the registry export

#### Scenario: zip expansion cap is 128 MiB from zip

- **WHEN** `zipExpansionCapBytes` is imported from `src/core/policy.ts`
- **THEN** it SHALL equal `128 * 1024 * 1024` and the zip export
