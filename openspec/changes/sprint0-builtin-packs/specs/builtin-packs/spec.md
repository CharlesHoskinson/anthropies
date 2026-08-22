## Purpose

Builtin CapabilityPack wrappers around existing inspect/strip functions.

## ADDED Requirements

### Requirement: layer-a wraps applyLayerA

WHEN layerAPack inspects text, it SHALL call `applyLayerA` and report present for each of unicode, trailer, banner that has a nonzero count.

#### Scenario: agent trailer is present

- **WHEN** bytes contain a Co-Authored-By Claude trailer
- **THEN** a finding with markClass `agent-trailer` and status `present` SHALL be returned

#### Scenario: clean text is absent

- **WHEN** bytes are `hello` with no Layer A marks
- **THEN** findings SHALL have status `absent` for the three Layer A mark classes

### Requirement: layer-a transform uses applyLayerA

WHEN layerAPack.transform runs, it SHALL return bytes from applyLayerA.text encoded as UTF-8.

#### Scenario: trailer is removed

- **WHEN** transform is given trailer text
- **THEN** the output text SHALL not match Co-Authored-By

### Requirement: no new algorithms

WHEN pack sources are searched, they SHALL import `applyLayerA`, `inspectRasterBytes` or `inspectSvgText`, and `inspectPdfBytes` respectively, and SHALL NOT copy those implementations.

#### Scenario: layer-a source imports applyLayerA

- **WHEN** `src/packs/layer-a.ts` is read
- **THEN** it SHALL contain `applyLayerA`
