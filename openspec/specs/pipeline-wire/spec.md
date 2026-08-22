# pipeline-wire Specification

## Purpose
Wire Inspector and Cleaner through the kernel pipeline. Keep public signatures and Report JSON.

## Requirements

### Requirement: builtin registry lists core packs

WHEN `builtinRegistry` runs, it SHALL register `anthropies.layer-a`, `anthropies.c2pa`, and `anthropies.pdf`.

#### Scenario: registry lists three pack ids

- **WHEN** `builtinRegistry().list()` is read
- **THEN** the ids SHALL include `anthropies.layer-a`, `anthropies.c2pa`, and `anthropies.pdf`

### Requirement: Inspector inspects through the pipeline

WHEN `Inspector.inspect` runs, it SHALL call `inspectArtifact` and SHALL keep the public signature `(path, { forceText, json })`.

#### Scenario: trailer inspect is present Report

- **WHEN** Inspector inspects `fixtures/layer-a/trailer-claude.txt`
- **THEN** the Report kind SHALL be `text`, deterministic status SHALL be `present`, and JSON SHALL NOT contain `"score"`

#### Scenario: inspectArtifact uses classified kind

- **WHEN** `src/services/inspector.ts` is read
- **THEN** it SHALL contain `makeArtifact(owned.bytes, owned.kind`

### Requirement: Cleaner transforms through the pipeline for text

WHEN `Cleaner.clean` runs on a text artifact, it SHALL call `transformArtifact` and SHALL call `writeAtomic` only after success.

#### Scenario: trailer clean writes stripped bytes

- **WHEN** Cleaner cleans the trailer fixture to a new dest
- **THEN** dest bytes SHALL NOT match Co-Authored-By and the original path SHALL keep the trailer

#### Scenario: failed classify does not write

- **WHEN** in-place clean of a truncated PNG fails classify
- **THEN** the original bytes SHALL be unchanged and no `.bak` SHALL exist

### Requirement: office zips stay on format functions

WHEN kind is `docx` or `odt`, Inspector and Cleaner SHALL call `inspectDocx`/`cleanDocx` or `inspectOdt`/`cleanOdt` and SHALL NOT UTF-8-decode the zip as Layer A pack input.

#### Scenario: inspector source still names inspectDocx

- **WHEN** `src/services/inspector.ts` is read
- **THEN** it SHALL contain `inspectDocx` and `inspectOdt`

#### Scenario: cleaner source still names office cleaners

- **WHEN** `src/services/cleaner.ts` is read
- **THEN** it SHALL contain `cleanDocx` and `cleanOdt`

### Requirement: PDF live tools stay

WHEN kind is `pdf`, Cleaner SHALL still use PdfTools for strip and degraded honesty, not `pdfPack.transform`.

#### Scenario: cleaner source still names PdfTools

- **WHEN** `src/services/cleaner.ts` is read
- **THEN** it SHALL contain `PdfTools` and SHALL NOT contain `pdfPack`
