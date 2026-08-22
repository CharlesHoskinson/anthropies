## Purpose

Transport-neutral inspect and transform. No filesystem writes.

## ADDED Requirements

### Requirement: inspect uses the plan

WHEN inspectArtifact runs, the pipeline SHALL call plan and concatenate findings from each planned pack.inspect.

#### Scenario: two packs concatenate

- **WHEN** two applicable inspect packs each return one finding
- **THEN** inspectArtifact SHALL return both findings in plan order

#### Scenario: empty plan is empty findings

- **WHEN** plan returns none
- **THEN** inspectArtifact SHALL succeed with an empty array

### Requirement: transform uses the plan

WHEN transformArtifact runs, the pipeline SHALL apply each planned pack.transform in order when that method exists.

#### Scenario: successful transform is changed

- **WHEN** a pack.transform returns a new artifact
- **THEN** remediation SHALL be `changed`

### Requirement: preserve original on uncertainty

WHEN a pack.transform fails with a reason for which shouldPreserveOriginal is true, the pipeline SHALL return the original artifact and remediation `unchanged`.

#### Scenario: timeout keeps original bytes

- **WHEN** transform fails with reason timeout
- **THEN** returned artifact.digest SHALL equal the input digest

### Requirement: plan conflict fails closed

IF plan returns conflict, THEN inspectArtifact and transformArtifact SHALL fail with CapabilityFailure code `conflict`.

#### Scenario: cycle fails inspect

- **WHEN** planned packs have a cycle
- **THEN** inspectArtifact SHALL fail with code conflict

### Requirement: pipeline does not write files

WHILE pipeline runs, it SHALL NOT call writeFile, writeFileSync, or writeAtomic.

#### Scenario: source has no write APIs

- **WHEN** `src/core/pipeline.ts` is searched for those names
- **THEN** there SHALL be no matches
