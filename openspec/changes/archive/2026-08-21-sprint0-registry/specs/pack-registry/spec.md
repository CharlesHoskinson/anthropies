## Purpose

Pack registry for kernel-range compatibility and conflicting owners.

## ADDED Requirements

### Requirement: kernel range is inclusive

WHEN `kernelRangeIncludes(min, max, kernelApiVersion)` is evaluated, the kernel SHALL treat min and max as inclusive X.Y.Z triples.

#### Scenario: 1.0.0 is inside 1.0.0..1.0.0

- **WHEN** min and max are `1.0.0` and version is `1.0.0`
- **THEN** kernelRangeIncludes SHALL return true

#### Scenario: 1.0.0 is outside 2.0.0..2.0.0

- **WHEN** min and max are `2.0.0` and version is `1.0.0`
- **THEN** kernelRangeIncludes SHALL return false

### Requirement: incompatible packs are not listed

IF a pack kernel range does not include `kernelApiVersion`, THEN `register` SHALL return `{ ok: false, code: "incompatible" }` AND `list` SHALL omit that pack.

#### Scenario: max 0.9.0 is rejected

- **WHEN** a pack has kernelApiMax `0.9.0`
- **THEN** register SHALL return incompatible
- **AND** list SHALL not contain that pack id

### Requirement: conflicting owners are rejected

IF a newly registered pack claims a nonempty owner tuple already claimed by a listed pack, THEN register SHALL return `{ ok: false, code: "conflict" }` AND the new pack SHALL not be listed.

#### Scenario: second layer-a-shaped pack conflicts

- **WHEN** layer-a is listed and a second pack with a different id claims `(text, invisible-unicode, remove)`
- **THEN** register SHALL return conflict

### Requirement: empty artifactKinds create no claims

WHEN a pack has empty `artifactKinds`, register SHALL succeed and SHALL NOT conflict with a pack that claims a tuple.

#### Scenario: empty kinds plus layer-a

- **WHEN** an empty-kinds pack is registered then layer-a
- **THEN** both register results SHALL be ok
- **AND** ownerFor `(text, invisible-unicode, remove)` SHALL return layer-a

### Requirement: ownerFor uses policy selectOwner

WHEN ownerFor is called, the registry SHALL pass listed manifests to `selectOwner`.

#### Scenario: no claimant is none

- **WHEN** only an empty-kinds pack is listed
- **THEN** ownerFor of `(text, invisible-unicode, remove)` SHALL return `{ ok: false, code: "none" }`
