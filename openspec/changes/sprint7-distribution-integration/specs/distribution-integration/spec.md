## Purpose

Sprint 7 distribution and integration: Compose profiles, health and capability discovery, independently installable pack artifacts, a kernel/pack compatibility matrix covering current and previous sidecar protocol versions, TypeScript-only publishable core, and bans on monolithic all-model images and automatic model download.

## ADDED Requirements

### Requirement: default Compose profile is local-only

WHEN Compose starts with the default profile and no optional pack profile selected, the stack SHALL run the TypeScript core service only.

#### Scenario: default profile starts core only

- **WHEN** `docker compose config` and default `docker compose up` run with no optional profile enabled
- **THEN** the resolved services SHALL include the Anthropies core HTTP service
- **AND** the resolved services SHALL NOT start licensed optional pack sidecars

#### Scenario: default compose config validates

- **WHEN** `docker compose config` runs for the default profile
- **THEN** the command SHALL exit 0
- **AND** the rendered config SHALL be valid Compose YAML

### Requirement: licensed packs use explicit Compose profiles

WHEN an operator enables a licensed or optional heavy pack through Compose, the operator SHALL select an explicit Compose profile for that pack.

#### Scenario: licensed pack stays off without profile

- **WHEN** Compose runs with only the default profile
- **THEN** licensed optional pack services SHALL remain absent from the running stack

#### Scenario: selecting one licensed profile does not enable others

- **WHEN** Compose enables exactly one licensed optional pack profile
- **THEN** that pack's service SHALL be the only optional pack service present
- **AND** unrelated optional pack services SHALL remain absent

### Requirement: health discovery for core

WHEN GET `/health` runs against the core HTTP service after this change, the body SHALL equal `{ ok: true, version: "0.3.0" }` unless a separate contract changes HTTP `serviceVersion`.

#### Scenario: health is 0.3.0

- **WHEN** GET `/health` is called on the core service
- **THEN** JSON SHALL equal `{ "ok": true, "version": "0.3.0" }`

#### Scenario: compose healthcheck uses core health

- **WHEN** the core Compose service healthcheck runs
- **THEN** the check SHALL call core GET `/health`
- **AND** a successful body with `ok` true SHALL mark the service healthy

### Requirement: capability discovery lists installed packs

WHEN GET `/capabilities` runs against the core HTTP service, the body SHALL advertise installed packs and SHALL keep `version` at `0.3.0` unless a separate contract changes HTTP `serviceVersion`.

#### Scenario: capabilities version stays 0.3.0

- **WHEN** GET `/capabilities` is called
- **THEN** `version` SHALL be `0.3.0`

#### Scenario: installed optional pack appears when enabled

- **WHEN** an optional pack artifact is installed and registered
- **THEN** GET `/capabilities` `packs[].id` SHALL include that pack id
- **AND** the body SHALL NOT contain `"watermarkScore"`
- **AND** the body SHALL NOT contain a top-level `"score"` field

#### Scenario: absent optional pack is discoverable as unavailable

- **WHEN** an optional pack is not installed and a caller probes availability for that pack id
- **THEN** availability status SHALL be `unavailable`
- **AND** core inspect for unrelated packs SHALL still succeed

### Requirement: pack artifacts install independently

WHEN an optional pack is distributed, it SHALL ship as an independently installable artifact that the operator can add without installing unrelated optional packs.

#### Scenario: core installs without optional packs

- **WHEN** the publishable core package is installed alone
- **THEN** installation SHALL succeed
- **AND** no optional pack artifact SHALL be required

#### Scenario: one optional pack installs alone

- **WHEN** an operator installs a single optional pack artifact onto an existing core install
- **THEN** that pack SHALL become registrable
- **AND** unrelated optional pack artifacts SHALL remain unrequired

#### Scenario: optional pack carries pins when models ship

- **WHEN** an optional pack artifact includes model weights or a sidecar runtime
- **THEN** the artifact SHALL include upstream, model or codebook, configuration, and container or lock digests

### Requirement: kernel and pack compatibility matrix

WHEN distribution publishes compatibility data, the release SHALL include a kernel and pack compatibility matrix that lists kernel API versions, pack ids with kernel ranges, and sidecar protocol versions.

#### Scenario: matrix lists current sidecar protocol

- **WHEN** the published compatibility matrix is read
- **THEN** it SHALL include sidecar protocol version `1.0.0` as current
- **AND** it SHALL list each distributed pack id with its supported kernel API range

#### Scenario: supported kernel range passes

- **WHEN** a pack kernel range includes the running `kernelApiVersion`
- **THEN** registry compatibility checks SHALL accept that pack
- **AND** the matrix cell for that pair SHALL record a supported outcome

#### Scenario: unsupported kernel range is incompatible

- **WHEN** a pack kernel range excludes the running `kernelApiVersion`
- **THEN** register or probe SHALL return code `incompatible`
- **AND** the matrix cell for that pair SHALL record incompatible

### Requirement: matrix covers previous sidecar protocol versions

WHEN the compatibility matrix is published, it SHALL include every previous Anthropies sidecar protocol version that was published before the current protocol, in addition to the current protocol version.

#### Scenario: previous protocol rows exist

- **WHEN** at least one previous sidecar protocol version has been published
- **THEN** the matrix SHALL include a row or column for each previous protocol version
- **AND** each previous version cell SHALL record supported or incompatible

#### Scenario: empty previous set is explicit when none exist

- **WHEN** no previous sidecar protocol version has been published yet
- **THEN** the matrix SHALL still list current protocol `1.0.0`
- **AND** the matrix SHALL state that the previous-protocol set is empty

#### Scenario: unsupported previous protocol fails closed

- **WHEN** a sidecar response carries a previous protocol version that the running client does not support
- **THEN** the client SHALL fail with code `incompatible`
- **AND** the pack SHALL NOT certify results from that sidecar

#### Scenario: current protocol still negotiates

- **WHEN** a sidecar speaks protocolVersion `1.0.0` and the client supports `1.0.0`
- **THEN** health and capability negotiation SHALL proceed under the sidecar protocol rules
- **AND** the matrix cell for current `1.0.0` SHALL record supported

### Requirement: no monolithic all-model image

WHEN a release image is built for distribution, the image SHALL NOT embed every optional pack model and sidecar as one monolithic all-model artifact.

#### Scenario: core image omits bulk optional models

- **WHEN** the default core release image contents are inventoried
- **THEN** the image SHALL NOT contain the full set of optional pack model weight trees
- **AND** the image SHALL remain usable for TypeScript-only core operations

#### Scenario: all-model image fails acceptance

- **WHEN** a candidate release image embeds every optional model and every optional sidecar runtime
- **THEN** distribution acceptance SHALL fail
- **AND** that image SHALL NOT be published as the core release image

### Requirement: no automatic model download

IF model weights are absent for an optional pack, THEN install, image build, and service startup SHALL NOT download those weights unless the operator runs an explicit documented download or enable step.

#### Scenario: default startup does not fetch models

- **WHEN** core starts under the default local-only Compose profile with optional model weights absent
- **THEN** the process SHALL NOT download model weights from the network
- **AND** core health SHALL still become ok

#### Scenario: default install does not fetch models

- **WHEN** the publishable core package installs with no optional pack enable step
- **THEN** installation SHALL NOT download optional model weights

#### Scenario: explicit download is required

- **WHEN** an operator wants optional model weights that are not present locally
- **THEN** documentation SHALL describe an explicit download or enable command
- **AND** that command SHALL be distinct from default install and default compose up

### Requirement: core remains TypeScript-only

WHEN the publishable core package and default core image are assembled, they SHALL contain TypeScript and Node runtime artifacts only for application code.

#### Scenario: core omits Python sidecar trees

- **WHEN** the publishable core distribution contents are listed
- **THEN** they SHALL NOT contain optional Python sidecar source trees
- **AND** they SHALL NOT require a Python runtime to serve GET `/health`

#### Scenario: core stays publishable without optional packs

- **WHEN** optional packs, models, remote services, and Python sidecars are absent
- **THEN** the core package SHALL remain installable and usable for builtin TypeScript packs

### Requirement: release images respect licensing

WHEN a release image includes an optional pack, the image SHALL include that pack only when the pack license permits redistribution in that image.

#### Scenario: noncommercial pack stays out of core image

- **WHEN** an optional pack license is `optional-noncommercial` or `optional-restricted`
- **THEN** the default core release image SHALL omit that pack's noncommercial code and weights

#### Scenario: licensed profile documents redistribution limits

- **WHEN** a Compose profile enables a licensed optional pack
- **THEN** operator documentation SHALL state the license disposition for that pack

### Requirement: distribution documentation set

WHEN Sprint 7 distribution docs are published, they SHALL cover CLI, HTTP, skill, operator, security, and troubleshooting guidance for profiles, discovery, independent installs, the compatibility matrix, and the no-automatic-download rule.

#### Scenario: operator docs name default profile behavior

- **WHEN** operator documentation is read
- **THEN** it SHALL state that the default Compose profile is local-only TypeScript core
- **AND** it SHALL state how to enable one optional pack profile independently

#### Scenario: troubleshooting covers unavailable optional packs

- **WHEN** troubleshooting documentation is read
- **THEN** it SHALL describe unavailable optional packs as fail-soft for core
- **AND** it SHALL describe incompatible protocol versions as fail-closed for certification
