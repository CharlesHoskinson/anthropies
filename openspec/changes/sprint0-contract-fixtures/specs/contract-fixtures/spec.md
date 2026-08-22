## Purpose

Seven contract cases with both polarities and a nonzero inventory.

## ADDED Requirements

### Requirement: inventory is seven named cases

WHEN the contract inventory is read, it SHALL list exactly these ids: available, unavailable, degraded, incompatible, timeout, malformed-output, conflicting-owner.

#### Scenario: inventory length is 7

- **WHEN** `CONTRACT_CASES` is read
- **THEN** its length SHALL be 7 and SHALL contain those ids

### Requirement: both polarities

WHEN each case runs, the test suite SHALL include a passing positive control and a failing or rejected negative control.

#### Scenario: available pack probes ready

- **WHEN** a registered layer-a pack is probed
- **THEN** availability.status SHALL be `available`

#### Scenario: unavailable optional pack is fail-soft

- **WHEN** a pack probe returns optional-absent
- **THEN** unrelated layer-a inspect SHALL still succeed

#### Scenario: incompatible kernel range is rejected

- **WHEN** a pack kernelApiMax is `0.0.1` on kernel `1.0.0`
- **THEN** register SHALL return incompatible

#### Scenario: conflicting owner is rejected

- **WHEN** two packs claim the same kind, mark class, and operation
- **THEN** the second register SHALL return conflict

#### Scenario: timeout preserves original

- **WHEN** transform fails with timeout
- **THEN** returned digest SHALL equal the input digest

#### Scenario: malformed sidecar output is not certified

- **WHEN** sidecar JSON is malformed
- **THEN** the client SHALL fail with malformed-output

#### Scenario: degraded PDF cannot certify absence

- **WHEN** PDF tools are missing
- **THEN** the report SHALL be degraded and SHALL NOT treat missing tools as certified absent
