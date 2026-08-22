## Purpose

Close integration Sol BLOCKED items without new formats or mixed scores.

## ADDED Requirements

### Requirement: optional unavailable packs fail-soft

WHEN inspectArtifact or transformArtifact runs, each planned pack SHALL be probed first. IF probe status is unavailable AND isOptionalFailSoft is true, THEN that pack SHALL be skipped. IF probe status is unavailable AND isOptionalFailSoft is false, THEN the effect SHALL fail.

#### Scenario: optional absent pack does not fail layer-a inspect

- **WHEN** a text inspect plans layer-a and an optional pack whose probe is optional-absent
- **THEN** inspectArtifact SHALL succeed with layer-a findings

### Requirement: unchanged transform is unchanged

WHEN a planned pack.transform returns an artifact whose digest equals its input digest, the pipeline SHALL NOT set remediation to `changed` for that pack.

#### Scenario: no-op transform stays unchanged

- **WHEN** the only transform returns the same digest
- **THEN** TransformResult.remediation SHALL be `unchanged`

### Requirement: C2PA parse failure is indeterminate

WHEN c2paPack inspects raster bytes and inspectRasterBytes returns not ok, the finding status SHALL be `indeterminate`.

#### Scenario: truncated raster is indeterminate

- **WHEN** inspect is given eight PNG magic bytes
- **THEN** the provenance-metadata finding status SHALL be `indeterminate`

### Requirement: sidecar digest binds bytes

WHEN a sidecar Artifact is decoded, digest SHALL equal sha256 of the decoded bytes.

#### Scenario: mismatched sidecar digest is rejected

- **WHEN** bytes are `owned output` and digest is another valid 64-hex
- **THEN** SidecarInspectRequest decode SHALL throw

### Requirement: sidecar findings reject score

WHEN sidecar inspect findings or transform removals are decoded, an object that contains `score` SHALL fail decode.

#### Scenario: score on a finding is rejected

- **WHEN** findings is `[{ "score": 1 }]`
- **THEN** SidecarInspectResponse decode SHALL throw

#### Scenario: score on a transform removal is rejected

- **WHEN** SidecarTransformResponse removals is `[{ "score": 1 }]`
- **THEN** decode SHALL throw

### Requirement: self ordering edge is conflict

IF a pack lists its own id in ordering.before or ordering.after, THEN plan SHALL return `{ ok: false, code: "conflict" }`.

#### Scenario: after self is conflict

- **WHEN** pack `loop` lists `ordering.after: ["loop"]`
- **THEN** plan SHALL return conflict

#### Scenario: before edge is honored

- **WHEN** pack B lists `ordering.before: ["a"]`
- **THEN** plan SHALL place B before A

#### Scenario: equal priority orders by id

- **WHEN** two disjoint packs have the same priority and empty ordering
- **THEN** the lexicographically smaller id SHALL be first

### Requirement: encoded sidecar messages carry protocolVersion

WHEN a SidecarInspectResponse is encoded, the JSON SHALL include `protocolVersion` `1.0.0`.

#### Scenario: encoded inspect response has protocolVersion 1.0.0

- **WHEN** Schema.encodeUnknownSync(SidecarInspectResponse) runs on a valid response
- **THEN** the encoded `protocolVersion` SHALL be `1.0.0`
