## Purpose

Locked public report channels for inspect and clean. Kernel types must not collapse these channels.

## Requirements

### Requirement: four unmixed channels

The report SHALL expose findings only on channels `deterministic`, `c2pa`, `official`, and `statistical`.

#### Scenario: mixed score is invalid

- **WHEN** a JSON report contains `watermarkScore` or a flat mixed `removed` bag
- **THEN** Schema decode of `Report` SHALL fail

### Requirement: official unavailable has no score

WHEN `ANTHROPIC_DETECT_URL` is unset, the official adapter SHALL be `{ _tag: "Unavailable" }` with no `score` field.

#### Scenario: score on Unavailable is rejected

- **WHEN** OfficialFinding is decoded from `{ _tag: "Unavailable", score: 0.9 }` with default parse options
- **THEN** decode SHALL fail
