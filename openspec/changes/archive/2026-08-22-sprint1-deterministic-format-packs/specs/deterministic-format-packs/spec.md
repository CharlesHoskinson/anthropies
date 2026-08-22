## Purpose

Sprint 1 Phase A: wrap existing format handlers as packs. No new algorithms. No zip UTF-8. No owner-tuple conflict with `c2paPack` or `pdfPack`.

## ADDED Requirements

### Requirement: html pack wraps inspectHtmlText

WHEN htmlPack.inspect runs, it SHALL call `inspectHtmlText` and SHALL NOT copy that function.

#### Scenario: html source imports inspectHtmlText

- **WHEN** `src/packs/html.ts` is read
- **THEN** it SHALL contain `from "../formats/html.js"` and `inspectHtmlText`

#### Scenario: html generator meta is present

- **WHEN** html bytes contain `meta name="generator" content="Claude"`
- **THEN** a finding with status `present` SHALL be returned on markClass `provenance-metadata`

### Requirement: md pack wraps inspectMdText

WHEN mdPack.inspect runs, it SHALL call `inspectMdText` and SHALL NOT copy that function.

#### Scenario: md source imports inspectMdText

- **WHEN** `src/packs/md.ts` is read
- **THEN** it SHALL contain `from "../formats/md.js"` and `inspectMdText`

### Requirement: svg strip pack is remove-only

WHEN svgStripPack is registered, its operations SHALL be `remove` only. It SHALL call `cleanSvgText`. It SHALL NOT claim inspect on kind `svg` with markClass `provenance-metadata`.

#### Scenario: svg strip source imports cleanSvgText

- **WHEN** `src/packs/svg-strip.ts` is read
- **THEN** it SHALL contain `from "../formats/svg.js"` and `cleanSvgText`
- **AND** `manifest.operations` SHALL equal `["remove"]`

### Requirement: docx pack does not UTF-8-round-trip the zip

WHEN docxPack.transform runs, it SHALL call `cleanDocx` and SHALL NOT decode the full zip as UTF-8 text for Layer A.

#### Scenario: docx source imports cleanDocx

- **WHEN** `src/packs/docx.ts` is read
- **THEN** it SHALL contain `from "../formats/docx.js"` and `cleanDocx`
- **AND** it SHALL NOT contain `new TextDecoder("utf-8").decode(artifact.bytes)`

### Requirement: odt pack wraps inspectOdt

WHEN odtPack.inspect runs, it SHALL call `inspectOdt` and SHALL NOT decode the full zip as UTF-8 text for Layer A.

#### Scenario: odt source imports inspectOdt

- **WHEN** `src/packs/odt.ts` is read
- **THEN** it SHALL contain `from "../formats/odt.js"` and `inspectOdt`

### Requirement: raster strip pack is remove-only

WHEN rasterStripPack is registered, its operations SHALL be `remove` only. It SHALL call `stripRasterBytes`. It SHALL NOT replace `c2paPack`.

#### Scenario: raster strip source imports stripRasterBytes

- **WHEN** `src/packs/raster-strip.ts` is read
- **THEN** it SHALL contain `from "../formats/raster.js"` and `stripRasterBytes`
- **AND** `manifest.operations` SHALL equal `["remove"]`

### Requirement: pdf tools pack degrades when tools are missing

WHEN pdfToolsPack.probe runs and qpdf or exiftool is absent, availability status SHALL be `degraded` and reason SHALL be `tool-missing`. Transform SHALL NOT treat missing tools as certified absence.

#### Scenario: pdf tools source uses PdfTools

- **WHEN** `src/packs/pdf-tools.ts` is read
- **THEN** it SHALL contain `PdfTools` from `../formats/pdf.js`
- **AND** `manifest.operations` SHALL equal `["remove"]`

#### Scenario: degraded PDF is not certified absent

- **WHEN** pdfToolsPack.probe returns degraded
- **THEN** a transform of those bytes SHALL NOT set a provenance-metadata finding status `absent` as a clean certificate

### Requirement: capabilities lists format packs

WHEN GET /capabilities runs after Phase A, packs[] SHALL include ids `anthropies.html`, `anthropies.md`, `anthropies.svg-strip`, `anthropies.docx`, `anthropies.odt`, `anthropies.raster-strip`, and `anthropies.pdf-tools` in addition to `anthropies.layer-a`, `anthropies.c2pa`, and `anthropies.pdf`.

#### Scenario: capabilities includes docx pack id

- **WHEN** GET /capabilities is called
- **THEN** packs[].id SHALL include `anthropies.docx`

#### Scenario: health stays 0.3.0

- **WHEN** GET /health is called
- **THEN** the body SHALL equal `{ "ok": true, "version": "0.3.0" }`

### Requirement: Inspector format names stay

WHEN Phase A lands, Inspector source SHALL still contain `inspectDocx`, `inspectOdt`, `inspectHtmlText`, and `inspectMdText`.

#### Scenario: inspector source still names inspectDocx

- **WHEN** `src/services/inspector.ts` is read
- **THEN** it SHALL contain `inspectDocx` and `inspectOdt`

### Requirement: no mixed score

WHEN any new pack encodes a KernelFinding or Removal, the object SHALL NOT contain `score` or `watermarkScore`.

#### Scenario: new pack tests reject score

- **WHEN** Phase A pack tests run
- **THEN** they SHALL assert the pack source files do not match `score` or `watermarkScore`
