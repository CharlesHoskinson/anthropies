## Purpose

Sprint 5 reverse-SynthID image scoring: a pinned Python scorer behind sidecar protocol 1.0.0 that negotiates health and capabilities on loopback and emits statistical observations only, never image-removal verdicts.

## ADDED Requirements

### Requirement: scorer speaks sidecar protocol 1.0.0

WHEN the image scorer encodes a health, capabilities, or inspect message, the body SHALL include `protocolVersion` equal to `1.0.0`.

#### Scenario: health carries protocolVersion 1.0.0

- **WHEN** GET sidecar `/health` succeeds
- **THEN** the JSON SHALL include `"protocolVersion": "1.0.0"`
- **AND** `ok` SHALL be `true`

#### Scenario: foreign protocol is incompatible

- **WHEN** a sidecar response carries `protocolVersion` `2.0.0`
- **THEN** the client SHALL fail with code `incompatible`
- **AND** the failure reason SHALL be `protocol-mismatch`

### Requirement: pinned Python scorer runtime

WHEN the optional image-scoring pack is built for distribution, the Python scorer SHALL be pinned by container digest or virtual-environment lock, upstream commit, model or codebook digest, and configuration digest.

#### Scenario: pin inventory is present

- **WHEN** the optional image-scoring pack release artifacts are inspected
- **THEN** they SHALL include a container digest or lockfile digest
- **AND** they SHALL include an upstream commit pin
- **AND** they SHALL include a model or codebook digest
- **AND** they SHALL include a configuration digest

#### Scenario: missing pin blocks certification

- **WHEN** any required pin digest is absent
- **THEN** the pack SHALL NOT certify a statistical observation as verified provenance

### Requirement: health and capability negotiation

WHEN the image-scoring pack probes the sidecar, it SHALL call sidecar GET `/health` and GET `/capabilities` before POST `/v1/inspect`.

#### Scenario: healthy compatible scorer is available

- **WHEN** `/health` returns ok with `protocolVersion` `1.0.0` and `/capabilities` lists operation `score` or `inspect` for the image-scoring pack id
- **THEN** pack probe status SHALL be `available`

#### Scenario: capabilities omit score operation

- **WHEN** `/capabilities` omits both `score` and `inspect`
- **THEN** pack probe status SHALL be `incompatible` or `unavailable`
- **AND** the pack SHALL NOT call POST `/v1/inspect`

### Requirement: loopback is the default network boundary

WHEN the image-scoring pack resolves a scorer base URL with no explicit override, the base URL host SHALL be `127.0.0.1` or `localhost`.

#### Scenario: default base URL is loopback

- **WHEN** no remote scorer URL override is configured
- **THEN** the resolved base URL host SHALL be `127.0.0.1` or `localhost`

#### Scenario: non-loopback URL is refused

- **WHEN** baseUrl is `http://example.com`
- **THEN** the client SHALL not send the request
- **AND** the failure code SHALL be `unavailable`
- **AND** the failure reason SHALL be `privacy-denied`

### Requirement: scores are statistical observations

WHEN the image scorer returns a successful inspect result for owned raster bytes, findings SHALL use channel `statistical` only.

#### Scenario: observation stays on statistical

- **WHEN** a configured image scorer returns a successful inspect result
- **THEN** each finding channel SHALL equal `statistical`
- **AND** markClass SHALL be `pixel`
- **AND** the encoded finding SHALL NOT contain `"watermarkScore"`
- **AND** the encoded finding SHALL NOT contain a top-level `"score"` field

#### Scenario: observation is not a removal

- **WHEN** a successful image-scoring inspect completes
- **THEN** the result SHALL NOT include a Removal
- **AND** remediation SHALL remain `unchanged` for that pack

### Requirement: scores are not removal verdicts

WHEN image-scoring output is assembled into a report, the system SHALL NOT emit a removal verdict, clean certificate, or cross-channel mixed score from that output.

#### Scenario: scorer output is not clean certificate

- **WHEN** statistical image scoring reports a present or absent pixel observation
- **THEN** the report SHALL NOT claim the watermark was removed
- **AND** the report SHALL NOT contain `"watermarkScore"`
- **AND** the report SHALL NOT contain a global clean-certificate verdict

#### Scenario: absent pixel signal is not human proof

- **WHEN** statistical image scoring reports status `absent`
- **THEN** the report SHALL NOT claim the image is free of all marks
- **AND** the report SHALL NOT claim Claude was uninvolved

### Requirement: absence reports unavailable

WHILE the optional image-scoring sidecar process is not running and the pack is optional, pack probe status SHALL be `unavailable`.

#### Scenario: absent sidecar is unavailable

- **WHEN** the scorer base URL is unset or the process does not respond and the pack distribution is `optional`
- **THEN** availability status SHALL be `unavailable`
- **AND** availability reason SHALL be `optional-absent` or `probe-failed`

#### Scenario: absent scorer does not break core inspect

- **WHEN** an optional image-scoring pack is unavailable and a text or deterministic inspect runs
- **THEN** unrelated core packs SHALL still succeed

### Requirement: malformed sidecar cannot certify

WHEN the image scorer returns malformed JSON or a body that fails sidecar decode, the pack SHALL fail with code `malformed-output` and SHALL NOT emit a certified statistical observation.

#### Scenario: malformed body is not certified

- **WHEN** sidecar inspect JSON is malformed
- **THEN** the client SHALL fail with code `malformed-output`
- **AND** no statistical finding from that call SHALL be marked as certified evidence

### Requirement: incompatible sidecar cannot certify

WHEN the image scorer returns an incompatible protocol or capability set, the pack SHALL fail with code `incompatible` and SHALL NOT certify results.

#### Scenario: incompatible scorer is not certified

- **WHEN** sidecar capabilities declare a kernel range that excludes the running kernel API
- **THEN** probe or inspect SHALL fail with code `incompatible`
- **AND** the pack SHALL NOT emit certified statistical findings from that sidecar

### Requirement: no image removal in this pack

WHEN the image-scoring pack manifest is registered, its operations SHALL include `score` or `inspect` and SHALL NOT include `remove`.

#### Scenario: manifest has no remove operation

- **WHEN** the image-scoring pack manifest is read
- **THEN** `operations` SHALL include `score` or `inspect`
- **AND** `operations` SHALL NOT include `remove`

#### Scenario: transform path is absent or refused

- **WHEN** a caller requests remove on kind `raster` through this pack alone
- **THEN** this pack SHALL NOT rewrite image bytes

### Requirement: publishable core has no noncommercial code

WHEN the publishable core package is assembled, it SHALL omit noncommercial and incompatible image-scorer source, models, and containers.

#### Scenario: core package omits noncommercial scorer

- **WHEN** the publishable core distribution contents are listed
- **THEN** they SHALL NOT contain the optional noncommercial Python scorer tree
- **AND** they SHALL NOT contain noncommercial model weights for image scoring

#### Scenario: optional pack declares non-core distribution

- **WHEN** the image-scoring pack manifest is registered
- **THEN** `distribution` SHALL be `optional`
- **AND** IF the scorer license is noncommercial, THEN `license` SHALL be `optional-noncommercial` or `optional-restricted`

### Requirement: request limits and timeouts

WHEN the image-scoring client calls the sidecar, it SHALL enforce a finite request timeout and SHALL map AbortError to code `timeout`.

#### Scenario: timeout maps cleanly

- **WHEN** the sidecar does not answer before the client timeout
- **THEN** the client SHALL fail with code `timeout`
- **AND** reason SHALL be `timeout`

### Requirement: stdout purity

WHEN the TypeScript image-scoring pack runs under CLI or HTTP, scorer diagnostics SHALL NOT contaminate stdout JSON.

#### Scenario: diagnostics stay off stdout JSON

- **WHEN** the scorer emits warnings on its own stderr and inspect JSON is printed to stdout
- **THEN** stdout SHALL remain valid JSON without those warning lines

### Requirement: health stays 0.3.0

WHEN GET `/health` runs after this change, the body SHALL equal `{ ok: true, version: "0.3.0" }`.

#### Scenario: health is 0.3.0

- **WHEN** GET `/health` is called
- **THEN** JSON SHALL equal `{ "ok": true, "version": "0.3.0" }`

### Requirement: capabilities advertise image scorer without mixed score

WHEN GET `/capabilities` runs after the image-scoring pack registers, the body SHALL list that pack id and SHALL NOT introduce a mixed score field.

#### Scenario: capabilities lists image-scoring pack

- **WHEN** GET `/capabilities` is called with the image-scoring pack registered
- **THEN** `packs[].id` SHALL include the image-scoring pack id in use
- **AND** the body SHALL NOT contain `"watermarkScore"`
- **AND** the body SHALL NOT contain a top-level `"score"` field

#### Scenario: capabilities version stays 0.3.0

- **WHEN** GET `/capabilities` is called
- **THEN** `version` SHALL be `0.3.0`
