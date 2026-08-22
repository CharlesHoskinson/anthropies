# kernel-decode Specification

## Purpose
Kernel schemas must reject forbidden fields and bind Artifact digest to bytes without per-call parse options.

## Requirements

### Requirement: default decode rejects excess properties

WHEN the kernel decodes Artifact, Availability, Evidence, KernelFinding, Removal, TransformResult, CapabilityFailure, CapabilityManifest, or RunContext, the kernel SHALL reject unknown properties under default ParseOptions.

#### Scenario: watermarkScore on KernelFinding is rejected without a parse option

- **WHEN** KernelFinding is decoded from a valid finding plus `watermarkScore: 1` with no ParseOptions argument
- **THEN** decode SHALL throw
- **AND** a valid finding without that field SHALL decode

#### Scenario: suspicious on KernelFinding is rejected

- **WHEN** KernelFinding is decoded from a valid finding plus `suspicious: true` with no ParseOptions argument
- **THEN** decode SHALL throw

#### Scenario: score on KernelFinding is rejected

- **WHEN** KernelFinding is decoded from a valid finding plus `score: 0.9` with no ParseOptions argument
- **THEN** decode SHALL throw

#### Scenario: score on CapabilityManifest is rejected

- **WHEN** CapabilityManifest is decoded from a valid `anthropies.layer-a` object plus `score: 0.1` with no ParseOptions argument
- **THEN** decode SHALL throw

### Requirement: artifact digest matches bytes

WHEN Artifact is constructed or decoded, the kernel SHALL require `digest` to be the lowercase hex SHA-256 of `bytes` with no algorithm prefix.

#### Scenario: makeArtifact copies bytes

- **WHEN** makeArtifact is called with a Uint8Array that the caller later mutates
- **THEN** `artifact.bytes` SHALL retain the original contents
- **AND** `artifact.digest` SHALL still equal sha256 of those original contents

#### Scenario: mismatched digest is rejected

- **WHEN** Artifact is decoded from valid base64 bytes and a different 64-char lowercase hex digest
- **THEN** decode SHALL throw

#### Scenario: prefixed digest is rejected

- **WHEN** Artifact is decoded with digest `sha256:` plus hex
- **THEN** decode SHALL throw

#### Scenario: encoded bytes are base64

- **WHEN** makeArtifact encodes an Artifact
- **THEN** the encoded `bytes` field SHALL be a base64 string whose decode equals the original octets

### Requirement: required manifest fields fail closed

IF CapabilityManifest JSON omits `channel`, `kernelApiMin`, or `kernelApiMax`, THEN decode SHALL throw.

#### Scenario: missing kernelApiMax

- **WHEN** a valid layer-a manifest object has `kernelApiMax` removed
- **THEN** decode SHALL throw

#### Scenario: missing channel still fails

- **WHEN** a valid layer-a manifest object has `channel` removed
- **THEN** decode SHALL throw

### Requirement: tests discriminate without parse-option injection

WHILE kernel unit tests assert excess-property rejection, the tests SHALL call `Schema.decodeUnknownSync` without `{ onExcessProperty: "error" }`.

#### Scenario: kernel tests do not pass onExcessProperty

- **WHEN** `tests/core-domain.test.ts` and `tests/core-capability.test.ts` are searched for `onExcessProperty`
- **THEN** that string SHALL be absent from kernel decode calls
