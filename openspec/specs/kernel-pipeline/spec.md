# kernel-pipeline Specification

## Purpose
Transport-neutral inspect and transform. No filesystem writes.

## Requirements

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

#### Scenario: later timeout restores original after a prior change

- **WHEN** the first pack.transform returns a new artifact and the second pack.transform fails with timeout
- **THEN** returned artifact.digest SHALL equal the input digest

#### Scenario: transforms run in plan order

- **WHEN** two planned packs both implement transform
- **THEN** the second pack.transform SHALL receive the artifact returned by the first

### Requirement: plan conflict fails closed

IF plan returns conflict, THEN inspectArtifact and transformArtifact SHALL fail with CapabilityFailure code `conflict`.

#### Scenario: cycle fails inspect

- **WHEN** planned packs have a cycle
- **THEN** inspectArtifact SHALL fail with code conflict

#### Scenario: cycle fails transform

- **WHEN** planned packs have a cycle
- **THEN** transformArtifact SHALL fail with code conflict

### Requirement: pipeline does not write files

WHILE pipeline runs, it SHALL NOT call writeFile, writeFileSync, or writeAtomic.

#### Scenario: source has no write APIs

- **WHEN** `src/core/pipeline.ts` is searched for those names
- **THEN** there SHALL be no matches

### Requirement: nested evidence construction

WHEN KernelFinding, Removal, or TransformResult is constructed, the evidence field SHALL accept an Evidence instance or a struct with `kind` and optional `rawReference` and `versionFingerprint`.

#### Scenario: transform result accepts evidence struct

- **WHEN** a pack.transform returns `evidence: { kind: "contract" }`
- **THEN** TransformResult construction SHALL succeed

#### Scenario: Removal and Evidence instance are accepted

- **WHEN** Removal is constructed with an evidence struct and with `new Evidence({ kind: "contract" })`
- **THEN** both constructions SHALL succeed
