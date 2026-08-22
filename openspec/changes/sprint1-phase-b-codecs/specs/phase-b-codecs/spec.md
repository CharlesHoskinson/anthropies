## Purpose

Sprint 1 Phase B freezes deterministic codec behavior for WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, and structural PDF. Scope is hard-bound container and structural provenance metadata only.

## ADDED Requirements

### Requirement: BMP and TIFF classify as raster

WHEN bytes match BMP or TIFF magic, classify SHALL return kind `raster` and `rasterCodec` SHALL return `bmp` or `tiff` respectively.

#### Scenario: BMP magic is raster

- **WHEN** bytes begin with `BM`
- **THEN** classify SHALL return `raster`
- **AND** `rasterCodec` SHALL return `bmp`

#### Scenario: TIFF little-endian magic is raster

- **WHEN** bytes begin with `II*\0`
- **THEN** classify SHALL return `raster`
- **AND** `rasterCodec` SHALL return `tiff`

#### Scenario: TIFF big-endian magic is raster

- **WHEN** bytes begin with `MM\0*`
- **THEN** classify SHALL return `raster`
- **AND** `rasterCodec` SHALL return `tiff`

### Requirement: Phase B raster codecs stay on kind raster

WHEN bytes match GIF, WebP, AVIF, or HEIC magic already recognized by `rasterCodec`, classify SHALL return kind `raster` and SHALL NOT introduce separate Kind literals for those codecs.

#### Scenario: WebP remains raster kind

- **WHEN** bytes are RIFF/WEBP magic
- **THEN** classify SHALL return `raster`
- **AND** `rasterCodec` SHALL return `webp`

#### Scenario: AVIF remains raster kind

- **WHEN** bytes carry ftyp brand `avif`
- **THEN** classify SHALL return `raster`
- **AND** `rasterCodec` SHALL return `avif`

### Requirement: applicable raster metadata does not touch pixels

WHEN `inspectRasterBytes` or `stripRasterBytes` runs on an applicable Phase B raster codec, the operation SHALL report or remove only hard-bound container provenance metadata and SHALL NOT modify pixel sample bytes to erase marks.

#### Scenario: strip preserves image dimensions metadata contract

- **WHEN** an applicable WebP fixture with XMP or C2PA metadata is stripped
- **THEN** the output SHALL remain codec `webp`
- **AND** pixel payload length SHALL equal the input pixel payload length unless a metadata chunk relocation requires a documented container rewrap that keeps dimensions unchanged

#### Scenario: pack sources reject pixel mark class

- **WHEN** Phase B raster pack or format sources are searched
- **THEN** they SHALL NOT register operations for markClass `pixel`

### Requirement: WebP AVIF HEIC become applicable when parsed

WHEN `inspectRasterBytes` parses WebP, AVIF, or HEIC structure successfully, `applicable` SHALL be `true` and status SHALL follow hard-bound provenance presence.

#### Scenario: parsed WebP with C2PA is present

- **WHEN** WebP bytes contain a hard-bound C2PA or XMP provenance payload the parser accepts
- **THEN** `inspectRasterBytes` SHALL return `ok: true`, `applicable: true`, and `present: true`

#### Scenario: parsed clean AVIF is absent

- **WHEN** AVIF bytes parse and carry no hard-bound C2PA or XMP provenance payload
- **THEN** `inspectRasterBytes` SHALL return `ok: true`, `applicable: true`, and `present: false`

#### Scenario: undecodable HEIC is not certified absent

- **WHEN** HEIC magic matches and structure cannot be parsed
- **THEN** the inspect path SHALL NOT report certified `absent`
- **AND** the result SHALL be not-applicable or indeterminate

### Requirement: GIF BMP TIFF metadata applicability

WHEN GIF, BMP, or TIFF bytes parse successfully for hard-bound provenance metadata, `inspectRasterBytes` SHALL set `applicable` to `true`. WHEN structure cannot be parsed, the path SHALL NOT certify `absent`.

#### Scenario: GIF with XMP extension is present

- **WHEN** GIF bytes contain an XMP application extension the parser accepts
- **THEN** inspect SHALL return `applicable: true` and `present: true`

#### Scenario: undecodable TIFF is not absent

- **WHEN** TIFF magic matches and IFD parse fails
- **THEN** inspect SHALL NOT return certified `absent`

### Requirement: stripRasterBytes removes applicable Phase B metadata

WHEN `stripRasterBytes` runs on applicable WebP, AVIF, HEIC, BMP, GIF, or TIFF bytes with hard-bound provenance metadata, it SHALL return `removed: true` and post-strip inspect SHALL not report that metadata as `present`.

#### Scenario: WebP strip clears provenance

- **WHEN** applicable WebP with provenance metadata is stripped then inspected
- **THEN** strip SHALL set `removed: true`
- **AND** reinspect SHALL report `present: false` while `applicable: true`

#### Scenario: non-applicable codec strip is unchanged

- **WHEN** a recognized raster codec remains non-applicable
- **THEN** strip SHALL return `removed: false` and the same digest bytes

### Requirement: Kind includes xlsx pptx epub

WHEN the Kind schema is read after Phase B lands, it SHALL include literals `xlsx`, `pptx`, and `epub` in addition to existing kinds.

#### Scenario: Kind literals include office and epub

- **WHEN** `src/kind.ts` Kind literals are read
- **THEN** the set SHALL include `xlsx`, `pptx`, and `epub`

### Requirement: classify maps office and epub zips

WHEN bytes begin with PK magic and the suffix is `.xlsx`, `.pptx`, or `.epub`, classify SHALL return `xlsx`, `pptx`, or `epub` respectively.

#### Scenario: xlsx suffix on PK is xlsx

- **WHEN** bytes begin with `PK` and suffix is `.xlsx`
- **THEN** classify SHALL return `xlsx`

#### Scenario: pptx suffix on PK is pptx

- **WHEN** bytes begin with `PK` and suffix is `.pptx`
- **THEN** classify SHALL return `pptx`

#### Scenario: epub suffix on PK is epub

- **WHEN** bytes begin with `PK` and suffix is `.epub`
- **THEN** classify SHALL return `epub`

#### Scenario: PK without known office suffix stays binary

- **WHEN** bytes begin with `PK` and suffix is absent or unknown
- **THEN** classify SHALL return `binary`

### Requirement: XLSX pack uses shared OOXML primitives

WHEN xlsxPack inspect or transform runs, it SHALL call shared OOXML helpers and SHALL NOT decode the full zip as UTF-8 text for Layer A.

#### Scenario: xlsx source imports ooxml helpers

- **WHEN** `src/packs/xlsx.ts` is read
- **THEN** it SHALL import from an OOXML or xlsx format module
- **AND** it SHALL NOT contain `new TextDecoder("utf-8").decode(artifact.bytes)`

#### Scenario: xlsx generator metadata is present

- **WHEN** an XLSX fixture contains non-empty `docProps` creator or Application metadata
- **THEN** inspect SHALL return a finding with markClass `provenance-metadata` and status `present`

### Requirement: PPTX pack uses shared OOXML primitives

WHEN pptxPack inspect or transform runs, it SHALL call shared OOXML helpers and SHALL NOT decode the full zip as UTF-8 text for Layer A.

#### Scenario: pptx source imports ooxml helpers

- **WHEN** `src/packs/pptx.ts` is read
- **THEN** it SHALL import from an OOXML or pptx format module
- **AND** it SHALL NOT contain `new TextDecoder("utf-8").decode(artifact.bytes)`

#### Scenario: pptx clean clears docProps fields

- **WHEN** a PPTX fixture with `docProps/core.xml` creator text is transformed
- **THEN** the output zip member SHALL have empty creator content or omit the marked field value
- **AND** zip expansion SHALL stay under the existing cap

### Requirement: EPUB pack is member-scoped

WHEN epubPack inspect or transform runs, it SHALL operate on capped zip members and SHALL NOT decode the full zip as UTF-8 text for Layer A.

#### Scenario: epub source avoids full-zip utf8

- **WHEN** `src/packs/epub.ts` is read
- **THEN** it SHALL NOT contain `new TextDecoder("utf-8").decode(artifact.bytes)`

#### Scenario: epub OPF creator is present

- **WHEN** an EPUB fixture contains OPF metadata creator `Claude`
- **THEN** inspect SHALL return markClass `provenance-metadata` with status `present`

#### Scenario: epub zip bomb is refused

- **WHEN** an EPUB zip claims expansion above the zip cap
- **THEN** inspect or transform SHALL fail closed without writing output bytes

### Requirement: structural PDF inspect is structure-aware

WHEN structural PDF inspect runs, it SHALL examine PDF objects and XMP packets without treating compressed stream payloads as latin1 prose, and SHALL still surface provenance markers present in document-level metadata.

#### Scenario: PDF XMP packet is present

- **WHEN** a PDF contains an XMP packet with algorithmic-media provenance markers
- **THEN** inspect SHALL report present provenance-metadata evidence

#### Scenario: stream payload false positive is avoided

- **WHEN** a PDF content stream contains the ASCII letters `c2pa` only as compressed page content noise and no document metadata marker exists
- **THEN** structural inspect SHALL NOT report that stream noise alone as certified present provenance

### Requirement: structural PDF strip degrades when tools are missing

WHEN structural PDF strip runs and qpdf or exiftool is absent, availability or strip evidence SHALL be `degraded` with reason `tool-missing` or equivalent missing-tool labels, and the path SHALL NOT certify absence as clean.

#### Scenario: missing tools are degraded

- **WHEN** qpdf or exiftool is absent during PDF strip probe or strip
- **THEN** the result SHALL be degraded
- **AND** SHALL NOT set provenance-metadata status `absent` as a clean certificate

#### Scenario: tools present can strip metadata

- **WHEN** qpdf and exiftool are present and strip succeeds on a PDF with stripable metadata
- **THEN** strip SHALL report removed labels for the tools used
- **AND** degraded SHALL be false

### Requirement: capabilities lists Phase B packs

WHEN GET /capabilities runs after Phase B implementation, packs[] SHALL include ids `anthropies.xlsx`, `anthropies.pptx`, and `anthropies.epub` in addition to Sprint 0 and Phase A pack ids.

#### Scenario: capabilities includes xlsx pack id

- **WHEN** GET /capabilities is called
- **THEN** packs[].id SHALL include `anthropies.xlsx`

#### Scenario: capabilities includes pptx and epub pack ids

- **WHEN** GET /capabilities is called
- **THEN** packs[].id SHALL include `anthropies.pptx` and `anthropies.epub`

#### Scenario: health stays 0.3.0

- **WHEN** GET /health is called
- **THEN** the body SHALL equal `{ "ok": true, "version": "0.3.0" }`

### Requirement: layer-a kinds still exclude zip office and epub

WHEN layerAPack is registered after Phase B, `artifactKinds` SHALL remain `text`, `svg`, `html`, `md` and SHALL NOT include `xlsx`, `pptx`, or `epub`.

#### Scenario: layer-a excludes Phase B zip kinds

- **WHEN** `layerAPack.manifest.artifactKinds` is read
- **THEN** it SHALL equal `["text", "svg", "html", "md"]`

### Requirement: no mixed score in Phase B packs

WHEN any Phase B pack encodes a KernelFinding or Removal, the object SHALL NOT contain `score` or `watermarkScore`.

#### Scenario: Phase B pack tests reject score

- **WHEN** Phase B pack tests run
- **THEN** they SHALL assert the pack source files do not match `score` or `watermarkScore`

### Requirement: freeze unit does not implement packs

WHEN this OpenSpec change is created as the freeze unit, the repository SHALL contain the change documents under `openspec/changes/sprint1-phase-b-codecs/` and SHALL NOT require Phase B pack source files to exist yet.

#### Scenario: openspec change documents exist

- **WHEN** `openspec/changes/sprint1-phase-b-codecs/` is listed
- **THEN** it SHALL contain `proposal.md`, `design.md`, `tasks.md`, and `specs/phase-b-codecs/spec.md`

#### Scenario: strict validate passes on freeze

- **WHEN** `openspec validate sprint1-phase-b-codecs --strict` runs
- **THEN** the command SHALL exit 0
