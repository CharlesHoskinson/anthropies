# http-capabilities Specification

## Purpose
GET /capabilities advertises kernel API version and builtin pack inventory. HTTP serviceVersion stays 0.3.0.

## Requirements

### Requirement: health version unchanged

WHEN GET /health runs, the body SHALL equal `{ ok: true, version: "0.3.0" }`.

#### Scenario: health is 0.3.0

- **WHEN** GET /health is called
- **THEN** JSON SHALL equal `{ "ok": true, "version": "0.3.0" }`

### Requirement: capabilities keeps tools and scorers

WHEN GET /capabilities runs, the body SHALL include `version` `0.3.0`, `tools` with qpdf/exiftool/c2patool booleans, and `scorers.officialDetect`.

#### Scenario: tools and scorers remain

- **WHEN** GET /capabilities is called
- **THEN** version SHALL be `0.3.0` and tools and scorers SHALL be present

### Requirement: kernelApiVersion and packs

WHEN GET /capabilities runs, the body SHALL include `kernelApiVersion` `1.0.0` and a `packs` array with length greater than 0.

#### Scenario: packs inventory is nonempty

- **WHEN** GET /capabilities is called
- **THEN** `kernelApiVersion` SHALL be `1.0.0` and `packs.length` SHALL be greater than 0

#### Scenario: each pack has availability not a score

- **WHEN** a packs[] item is read
- **THEN** it SHALL have `id`, `availability.status`, `license`, and `privacy`, and the body SHALL NOT contain `"score"`
