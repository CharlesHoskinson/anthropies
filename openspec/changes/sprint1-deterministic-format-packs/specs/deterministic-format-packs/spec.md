## Purpose

Sprint 1 Phase A: wrap existing format handlers as packs. No new algorithms. No zip UTF-8.

## ADDED Requirements

### Requirement: html pack wraps inspectHtmlText

WHEN htmlPack.inspect runs, it SHALL call `inspectHtmlText` and SHALL NOT copy that function.

#### Scenario: html generator meta is present

- **WHEN** html bytes contain `meta name="generator" content="Claude"`
- **THEN** a finding status `present` SHALL be returned on the pack's metadata mark class

### Requirement: docx pack does not UTF-8-round-trip the zip

WHEN docxPack.transform runs, it SHALL call `cleanDocx` and SHALL NOT decode the full zip as UTF-8 text for Layer A.

#### Scenario: docx source imports cleanDocx

- **WHEN** `src/packs/docx.ts` is read
- **THEN** it SHALL contain `from "../formats/docx.js"` and `cleanDocx`

### Requirement: capabilities lists format packs

WHEN GET /capabilities runs after Phase A, packs[] SHALL include ids for html, md, docx, odt, raster-strip, and pdf-tools packs in addition to layer-a, c2pa, and pdf.

#### Scenario: capabilities includes docx pack id

- **WHEN** GET /capabilities is called
- **THEN** packs[].id SHALL include `anthropies.docx`
