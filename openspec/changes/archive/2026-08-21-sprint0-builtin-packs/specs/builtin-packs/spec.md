## Purpose

Builtin CapabilityPack wrappers around existing inspect/strip functions.

## ADDED Requirements

### Requirement: layer-a wraps applyLayerA

WHEN layerAPack inspects text, it SHALL call `applyLayerA` and report present for each of unicode, trailer, banner that has a nonzero count.

#### Scenario: agent trailer is present

- **WHEN** bytes contain a Co-Authored-By Claude trailer
- **THEN** a finding with markClass `agent-trailer` and status `present` SHALL be returned

#### Scenario: unicode and banner are present

- **WHEN** bytes contain a zero-width space or a Generated-with-Claude-Code banner
- **THEN** findings SHALL include `present` for `invisible-unicode` and `generated-banner` respectively

#### Scenario: clean text is absent

- **WHEN** bytes are `hello` with no Layer A marks
- **THEN** findings SHALL have status `absent` for the three Layer A mark classes

### Requirement: layer-a kinds exclude office zips

WHEN layerAPack is registered, `artifactKinds` SHALL be `text`, `svg`, `html`, `md` and SHALL NOT include `docx` or `odt`.

#### Scenario: layer-a kinds are text family

- **WHEN** `layerAPack.manifest.artifactKinds` is read
- **THEN** it SHALL equal `["text", "svg", "html", "md"]`

### Requirement: layer-a transform uses applyLayerA on text only

WHEN layerAPack.transform runs AND `artifact.kind` is `text`, it SHALL return bytes from `applyLayerA.text` encoded as UTF-8.

IF `artifact.kind` is not `text`, THEN transform SHALL return the original artifact with remediation `unchanged`.

#### Scenario: trailer is removed

- **WHEN** transform is given trailer text with kind `text`
- **THEN** the output text SHALL not match Co-Authored-By

#### Scenario: transform bytes match applyLayerA text

- **WHEN** transform is given trailer text with kind `text`
- **THEN** output bytes SHALL equal UTF-8 encoding of `applyLayerA(text).text`

#### Scenario: non-text transform is unchanged

- **WHEN** transform is given an svg artifact
- **THEN** remediation SHALL be `unchanged` and digest SHALL equal the input digest

### Requirement: no new algorithms

WHEN pack sources are searched, they SHALL import `applyLayerA`, `inspectRasterBytes` or `inspectSvgText`, and `inspectPdfBytes` respectively, and SHALL NOT copy those implementations.

#### Scenario: layer-a source imports applyLayerA

- **WHEN** `src/packs/layer-a.ts` is read
- **THEN** it SHALL contain `applyLayerA`

#### Scenario: c2pa source imports inspect helpers

- **WHEN** `src/packs/c2pa.ts` is read
- **THEN** it SHALL contain `from "../formats/raster.js"` and `from "../formats/svg.js"`

#### Scenario: pdf source imports inspectPdfBytes

- **WHEN** `src/packs/pdf.ts` is read
- **THEN** it SHALL contain `inspectPdfBytes`
