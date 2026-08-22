## Purpose

Sprint 4 text-detection parity: a replaceable detector registry, Gemini SynthID and MarkLLM statistical adapters, an Anthropic official seam, and GET-or-POST `/detect`, without turning detection into a clean certificate.

## ADDED Requirements

### Requirement: detector registry uses capability manifests

WHEN a detector pack registers, the registry SHALL apply the same CapabilityManifest fields and kernel-range rules used by other packs.

#### Scenario: detector pack lists after compatible register

- **WHEN** a detector pack with kernel range that includes `1.0.0` registers
- **THEN** `list` SHALL include that pack id

#### Scenario: incompatible detector pack is rejected

- **WHEN** a detector pack has kernelApiMax `0.9.0`
- **THEN** register SHALL return `{ ok: false, code: "incompatible" }`
- **AND** `list` SHALL omit that pack id

### Requirement: Gemini SynthID adapter is statistical

WHEN the Gemini SynthID text adapter runs on owned text, it SHALL emit findings on channel `statistical` only.

#### Scenario: Gemini finding stays on statistical

- **WHEN** a configured Gemini SynthID adapter returns a detect result
- **THEN** each finding channel SHALL equal `statistical`
- **AND** the response SHALL NOT contain `"watermarkScore"`

#### Scenario: Gemini does not own official

- **WHEN** Gemini SynthID adapter inspect runs
- **THEN** it SHALL NOT emit a finding on channel `official`

### Requirement: Anthropic seam unavailable until configured

WHILE `ANTHROPIC_DETECT_URL` is unset, the Anthropic adapter SHALL report official status `unavailable`.

#### Scenario: unset URL is unavailable without score

- **WHEN** `ANTHROPIC_DETECT_URL` is unset and detect runs
- **THEN** official status SHALL be `unavailable`
- **AND** the official payload SHALL NOT contain `"score"`

#### Scenario: Unavailable decode rejects score

- **WHEN** an official Unavailable object that contains `score` is decoded
- **THEN** decode SHALL fail

### Requirement: Anthropic unavailable has no score

WHILE official status is `unavailable`, the official payload SHALL omit `score`.

#### Scenario: unavailable JSON has no score key

- **WHEN** official status is `unavailable` and the payload is encoded
- **THEN** the JSON SHALL NOT contain `"score"`

### Requirement: Anthropic seam stays off until supported configuration

IF `ANTHROPIC_DETECT_URL` is unset, THEN the Anthropic adapter SHALL NOT call a default vendor URL.

#### Scenario: no default Anthropic detect URL

- **WHEN** process environment has no `ANTHROPIC_DETECT_URL`
- **THEN** the Anthropic adapter SHALL NOT perform an outbound detect request

### Requirement: MarkLLM is same-configuration only

WHEN the MarkLLM harness runs, it SHALL require algorithm identity and configuration identity on the evidence record.

#### Scenario: MarkLLM evidence names configuration

- **WHEN** MarkLLM same-configuration detect completes
- **THEN** evidence SHALL include algorithm identity and configuration identity

#### Scenario: MarkLLM is not vendor efficacy

- **WHEN** MarkLLM harness output is encoded in a report
- **THEN** the report SHALL NOT claim Anthropic official detection
- **AND** the report SHALL NOT claim Gemini vendor equivalence

### Requirement: GET or POST detect

WHEN a client calls GET `/detect` or POST `/detect` with owned text, the service SHALL return channel-separated detector findings.

#### Scenario: POST detect returns four channels

- **WHEN** POST `/detect` is called with owned text
- **THEN** the response SHALL include channels `deterministic`, `c2pa`, `official`, and `statistical` as separate fields or findings
- **AND** the response SHALL NOT contain `"watermarkScore"`

#### Scenario: GET detect matches POST contract

- **WHEN** GET `/detect` is called with the same owned text as a prior POST `/detect`
- **THEN** channel statuses SHALL match the POST response for that text under the same configuration

### Requirement: fail-soft unconfigured adapter

WHEN a detector adapter is unconfigured and that pack is optional, detect SHALL mark that adapter channel `unavailable` or `not-run`.

#### Scenario: unconfigured optional adapter is fail-soft

- **WHEN** an optional detector pack is unconfigured and `/detect` runs
- **THEN** `/detect` SHALL return ok for the request path
- **AND** the unconfigured adapter channel SHALL be `unavailable` or `not-run`
- **AND** deterministic findings SHALL still be present when Layer A marks exist

### Requirement: unconfigured adapter does not fail siblings

WHEN an optional detector adapter is unconfigured, unrelated channels SHALL still return results.

#### Scenario: unrelated channel survives unconfigured adapter

- **WHEN** Gemini is unconfigured and Layer A marks exist in the text
- **THEN** deterministic findings SHALL still report `present`

### Requirement: fail-soft rate-limited adapter

WHEN a detector adapter returns rate-limited, detect SHALL set that channel status to `degraded` or `unavailable`.

#### Scenario: rate-limited adapter stays channel-local

- **WHEN** a configured adapter responds rate-limited
- **THEN** that channel status SHALL be `degraded` or `unavailable`
- **AND** other channels SHALL still return results

### Requirement: fail-soft malformed adapter

WHEN a detector adapter returns a malformed payload, detect SHALL set that channel status to `indeterminate` or `unavailable`.

#### Scenario: malformed adapter is not a certificate

- **WHEN** a configured adapter returns malformed detect JSON
- **THEN** that channel status SHALL be `indeterminate` or `unavailable`
- **AND** the response SHALL NOT mark remediation as certified clean from that adapter

### Requirement: detection is not a clean certificate

WHEN detect results are assembled into a report, the system SHALL NOT emit a global clean-certificate verdict from detection.

#### Scenario: detect does not certify clean

- **WHEN** `/detect` returns official `unavailable` and statistical status `computed` or `insufficient`
- **THEN** the report honesty text SHALL still deny official-detector failure proof
- **AND** the response SHALL NOT contain a global clean-certificate verdict

#### Scenario: absent statistical signal is not human

- **WHEN** a statistical adapter reports no mark signal
- **THEN** the report SHALL NOT claim the text is human-written

### Requirement: health stays 0.3.0

WHEN GET `/health` runs after this change, the body SHALL equal `{ ok: true, version: "0.3.0" }`.

#### Scenario: health is 0.3.0

- **WHEN** GET `/health` is called
- **THEN** JSON SHALL equal `{ "ok": true, "version": "0.3.0" }`

### Requirement: capabilities advertise detectors without score

WHEN GET `/capabilities` runs after detector packs register, the body SHALL list those detector pack ids.

#### Scenario: capabilities lists detector packs

- **WHEN** GET `/capabilities` is called with detector packs registered
- **THEN** `packs[].id` SHALL include the Gemini, Anthropic seam, and MarkLLM detector ids in use
- **AND** the body SHALL NOT contain `"score"`

#### Scenario: capabilities version stays 0.3.0

- **WHEN** GET `/capabilities` is called
- **THEN** `version` SHALL be `0.3.0`

### Requirement: candidate selection stays lexical

WHEN rewrite candidate selection runs in the presence of detector packs, selection SHALL stay lexical.

#### Scenario: detector score does not pick the rewrite winner

- **WHEN** multiple rewrite candidates exist and detectors are configured
- **THEN** candidate selection SHALL NOT choose the winner by detector score
