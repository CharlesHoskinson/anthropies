## MODIFIED Requirements

### Requirement: four unmixed channels

The report SHALL expose findings only on channels `deterministic`, `c2pa`, `official`, and `statistical`.

Kernel types SHALL NOT add `watermarkScore`, `suspicious`, or `score` to public Report JSON.

#### Scenario: mixed score is invalid

- **WHEN** a JSON report contains `watermarkScore` or a flat mixed `removed` bag
- **THEN** Schema decode of `Report` SHALL fail

#### Scenario: kernel finding extras stay off Report

- **WHEN** a KernelFinding is assembled into a public Report
- **THEN** the encoded Report SHALL omit `markClass` and `watermarkScore`
