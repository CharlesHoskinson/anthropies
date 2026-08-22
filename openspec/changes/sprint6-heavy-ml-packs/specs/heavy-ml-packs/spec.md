## Purpose

Sprint 6 heavy ML packs. Distribute Apache-2.0 upstream as optional packs. Implement CtrlRegen-method in original Anthropies code because upstream GitHub trees have no redistribution grant.

## ADDED Requirements

### Requirement: MarkLLM pack wraps Apache-2.0 upstream

WHEN the MarkLLM pack is enabled, it SHALL call a pinned `THU-BPM/MarkLLM` implementation and SHALL retain Apache-2.0 notices. It SHALL NOT copy that tree into the TypeScript core.

#### Scenario: MarkLLM source names the Apache pin

- **WHEN** the MarkLLM pack adapter source is read
- **THEN** it SHALL name `THU-BPM/MarkLLM` and Apache-2.0
- **AND** it SHALL NOT embed MarkLLM Python sources under `src/`

### Requirement: MarkLLM is same-configuration only

WHEN the MarkLLM harness runs, evidence SHALL include algorithm identity and configuration identity. Encoded reports SHALL NOT present the result as Anthropic or Gemini vendor efficacy.

#### Scenario: MarkLLM evidence names configuration

- **WHEN** MarkLLM same-configuration detect completes
- **THEN** evidence SHALL include algorithm identity and configuration identity

### Requirement: MarkDiffusion pack wraps Apache-2.0 upstream

WHEN the MarkDiffusion pack is enabled, it SHALL call a pinned `THU-BPM/MarkDiffusion` implementation and SHALL retain Apache-2.0 notices. It SHALL NOT copy that tree into the TypeScript core.

#### Scenario: MarkDiffusion source names the Apache pin

- **WHEN** the MarkDiffusion pack adapter source is read
- **THEN** it SHALL name `THU-BPM/MarkDiffusion` and Apache-2.0

### Requirement: CtrlRegen-method pack is original code

WHEN the CtrlRegen-method pack is implemented, Anthropies SHALL use original source. It SHALL NOT copy files from `yepengliu/CtrlRegen` or `mertizci/noai-watermark`.

#### Scenario: CtrlRegen-method source excludes unlicensed trees

- **WHEN** `src/` and pack sidecar trees are searched
- **THEN** they SHALL NOT contain paths `yepengliu/CtrlRegen` or `mertizci/noai-watermark` as vendored copies

### Requirement: unlicensed upstream is not published

WHEN building publishable artifacts, the build SHALL NOT include `yepengliu/CtrlRegen` or `mertizci/noai-watermark` source.

#### Scenario: core image inventory excludes unlicensed CtrlRegen trees

- **WHEN** the publishable core image inventory is read
- **THEN** it SHALL NOT list `yepengliu/CtrlRegen` or `mertizci/noai-watermark`

### Requirement: missing heavy packs fail-soft

WHEN a Sprint 6 pack probe is unavailable and the pack is optional, inspect and transform SHALL skip that pack and SHALL NOT fail unrelated core packs.

#### Scenario: optional MarkLLM absent does not fail layer-a inspect

- **WHEN** MarkLLM is uninstalled and a text inspect runs
- **THEN** inspectArtifact SHALL still return layer-a findings

### Requirement: no mixed score

WHEN Sprint 6 packs encode KernelFinding or Removal, the object SHALL NOT contain `score` or `watermarkScore`.

#### Scenario: Sprint 6 pack tests reject score

- **WHEN** Sprint 6 pack tests run
- **THEN** they SHALL assert pack source files do not match `score` or `watermarkScore`

### Requirement: HTTP version stays 0.3.0

WHEN GET /health runs after Sprint 6 packs, the body SHALL equal `{ "ok": true, "version": "0.3.0" }`.

#### Scenario: health stays 0.3.0 after Sprint 6

- **WHEN** GET /health is called
- **THEN** the body SHALL equal `{ "ok": true, "version": "0.3.0" }`
