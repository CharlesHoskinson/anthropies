# Sprint 1 Phase B Codecs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic hard-bound metadata support for WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, and structural PDF, and advertise the new office/EPUB packs on GET /capabilities.

**Architecture:** Keep GIF/WebP/AVIF/HEIC/BMP/TIFF on kind `raster` and extend `rasterCodec` plus `inspectRasterBytes` / `stripRasterBytes`. Add Kind literals `xlsx`, `pptx`, `epub`. Share OOXML zip-member scrub helpers for XLSX and PPTX. Keep `c2paPack` and `pdfPack` as inspect owners. Never UTF-8-decode a full zip as Layer A input. Never implement pixel algorithms. HTTP `serviceVersion` stays `"0.3.0"`.

**Tech Stack:** TypeScript, Effect 3 Schema.Class, Vitest, existing `unzipCapped` / `zipMembers`, existing PdfTools qpdf/exiftool path.

## Global Constraints

- No pixel watermark algorithms. No markClass `pixel` operations.
- Do not UTF-8-decode `xlsx` / `pptx` / `epub` zips as Layer A pack input.
- Four report channels stay unmixed. No `score` / `watermarkScore`.
- HTTP `serviceVersion` stays `"0.3.0"`.
- Do not edit `src/report.ts` honesty stanza strings.
- Do not replace `c2paPack` or `pdfPack` inspect ownership.
- Undecodable recognized codecs are not-applicable or indeterminate. Never certified absent.
- Zip expansion stays under `zipExpansionCapBytes`.
- OpenSpec source of truth: `openspec/changes/sprint1-phase-b-codecs/`.
- This freeze unit writes OpenSpec and this plan only. Pack implementation is a later unit.
- Grok implements from write-first five-part specs. Codex Sol audits OpenSpec vs diff. Architect does not hand-patch kernel code.
- Do not `git add -A`. Do not commit `knowledge/raw` or `.grok`.

## File map

- Modify: `src/kind.ts` (BMP/TIFF codecs, Kind literals `xlsx`/`pptx`/`epub`, classify branches)
- Modify: `src/formats/raster.ts` (applicable parsers for WebP AVIF HEIC BMP GIF TIFF)
- Modify: `src/formats/pdf.ts` (structure-aware inspect, keep degraded strip)
- Create: `src/formats/ooxml.ts`, `src/formats/xlsx.ts`, `src/formats/pptx.ts`, `src/formats/epub.ts`
- Create: `src/packs/xlsx.ts`, `src/packs/pptx.ts`, `src/packs/epub.ts`
- Modify: `src/core/builtin-registry.ts`, `src/http/server.ts` (or builtin packs list)
- Create/Modify tests: `tests/kind-phase-b.test.ts`, `tests/formats-raster-phase-b.test.ts`, `tests/packs-xlsx-pptx.test.ts`, `tests/packs-epub.test.ts`, `tests/formats-pdf-structural.test.ts`, `tests/http-capabilities.test.ts`
- Do not modify: `src/report.ts` honesty strings, `src/packs/c2pa.ts` owner tuple, `src/packs/pdf.ts` inspect ownership except through shared format helpers

---

### Task 1: OpenSpec freeze gate (this unit only)

**Files:**
- Create: `openspec/changes/sprint1-phase-b-codecs/proposal.md`
- Create: `openspec/changes/sprint1-phase-b-codecs/design.md`
- Create: `openspec/changes/sprint1-phase-b-codecs/tasks.md`
- Create: `openspec/changes/sprint1-phase-b-codecs/specs/phase-b-codecs/spec.md`
- Create: `docs/superpowers/plans/2026-08-22-sprint1-phase-b-codecs.md`

**Interfaces:**
- Consumes: Phase A OpenSpec patterns, ROADMAP Sprint 1 items 3–6
- Produces: validated change `sprint1-phase-b-codecs`

- [ ] **Step 1: Confirm documents exist**

Run:

```bash
test -f openspec/changes/sprint1-phase-b-codecs/proposal.md
test -f openspec/changes/sprint1-phase-b-codecs/design.md
test -f openspec/changes/sprint1-phase-b-codecs/tasks.md
test -f openspec/changes/sprint1-phase-b-codecs/specs/phase-b-codecs/spec.md
test -f docs/superpowers/plans/2026-08-22-sprint1-phase-b-codecs.md
```

Expected: each command exits 0.

- [ ] **Step 2: Strict validate**

Run: `openspec validate sprint1-phase-b-codecs --strict`

Expected: exit 0, change valid.

- [ ] **Step 3: Stop**

Do not implement packs in this unit. Do not git commit.

---

### Task 2: Classification for BMP TIFF and new zip kinds

**Files:**
- Modify: `src/kind.ts`
- Create: `tests/kind-phase-b.test.ts`

**Interfaces:**
- Consumes: existing `classify`, `rasterCodec`
- Produces: `RasterCodec` includes `bmp` | `tiff`; `Kind` includes `xlsx` | `pptx` | `epub`

- [ ] **Step 1: Write the failing test**

Create `tests/kind-phase-b.test.ts`:

```ts
import { describe, expect, it } from "@effect/vitest"
import { classify, rasterCodec } from "../src/kind.js"

describe("kind_phase_b", () => {
  it("bmp magic is raster", () => {
    const bytes = new Uint8Array([0x42, 0x4d, 0, 0, 0, 0])
    expect(classify(bytes, ".bmp")).toBe("raster")
    expect(rasterCodec(bytes)).toBe("bmp")
  })

  it("tiff II and MM magics are raster", () => {
    const le = new Uint8Array([0x49, 0x49, 0x2a, 0x00])
    const be = new Uint8Array([0x4d, 0x4d, 0x00, 0x2a])
    expect(rasterCodec(le)).toBe("tiff")
    expect(rasterCodec(be)).toBe("tiff")
    expect(classify(le, ".tif")).toBe("raster")
  })

  it("pk plus office suffixes classify", () => {
    const pk = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    expect(classify(pk, ".xlsx")).toBe("xlsx")
    expect(classify(pk, ".pptx")).toBe("pptx")
    expect(classify(pk, ".epub")).toBe("epub")
    expect(classify(pk)).toBe("binary")
  })
})
```

- [ ] **Step 2: Run** `pnpm test tests/kind-phase-b.test.ts` — expect FAIL.

- [ ] **Step 3: Extend** `src/kind.ts`

Add `"xlsx" | "pptx" | "epub"` to `Kind`. Extend `RasterCodec` with `"bmp" | "tiff"`. In `rasterCodec`, detect `BM`, `II*\0`, and `MM\0*`. In `classify` PK branch, map `.xlsx` / `.pptx` / `.epub` before the binary fallback.

- [ ] **Step 4: Run** `pnpm test tests/kind-phase-b.test.ts` — expect PASS.

- [ ] **Step 5: Commit listed paths** (implement unit only).

---

### Task 3: WebP AVIF HEIC applicable metadata

**Files:**
- Modify: `src/formats/raster.ts`
- Create: `tests/formats-raster-phase-b.test.ts`

**Interfaces:**
- Consumes: `rasterCodec`, existing PNG/JPEG applicable pattern
- Produces: applicable inspect/strip for webp/avif/heic when parsed

- [ ] **Step 1: Write failing controls**

In `tests/formats-raster-phase-b.test.ts`, assert:

1. A minimal valid WebP/AVIF/HEIC fixture with an injected XMP or C2PA-looking hard-bound payload returns `applicable: true`, `present: true`.
2. A clean parsed fixture returns `applicable: true`, `present: false`.
3. Truncated HEIC magic-only bytes remain not certified absent (`applicable: false` or inspect maps to indeterminate / not-applicable upstream).
4. After strip of a present fixture, reinspect is `present: false` and codec remains the same.

Reuse the magic-only fixtures from `tests/cert-c2pa.test.ts` for the undecodable control.

- [ ] **Step 2: Run** `pnpm test tests/formats-raster-phase-b.test.ts` — expect FAIL.

- [ ] **Step 3: Implement parsers** in `src/formats/raster.ts` (or imported codec helpers). Parse container boxes or chunks only. Remove hard-bound provenance metadata chunks. Do not alter pixel sample arrays for mark removal.

- [ ] **Step 4: Run** the Phase B raster tests and `tests/cert-c2pa.test.ts`. Magic-only undecodable cases must still refuse certified absent. Parsed cases may become applicable.

- [ ] **Step 5: Commit listed paths.**

---

### Task 4: GIF BMP TIFF metadata

**Files:**
- Modify: `src/formats/raster.ts`
- Modify: `tests/formats-raster-phase-b.test.ts`

**Interfaces:**
- Consumes: Task 2 codec detection
- Produces: applicable GIF/BMP/TIFF provenance inspect/strip

- [ ] **Step 1: Write failing fixtures** for GIF XMP application extension, BMP metadata payload if present in format, and TIFF IFD XMP/EXIF provenance tags used as hard-bound evidence.

- [ ] **Step 2: Run tests** — expect FAIL.

- [ ] **Step 3: Implement** GIF/BMP/TIFF metadata read and strip paths. On parse failure after magic match, keep not-applicable or indeterminate. Never absent.

- [ ] **Step 4: Assert** source search in tests rejects `markClass: "pixel"` registration in Phase B format modules.

- [ ] **Step 5: Commit listed paths.**

---

### Task 5: Shared OOXML plus XLSX and PPTX packs

**Files:**
- Create: `src/formats/ooxml.ts`, `src/formats/xlsx.ts`, `src/formats/pptx.ts`
- Create: `src/packs/xlsx.ts`, `src/packs/pptx.ts`
- Create: `tests/packs-xlsx-pptx.test.ts`
- Modify: `src/core/builtin-registry.ts`

**Interfaces:**
- Consumes: `unzipCapped`, `zipMembers`, docProps scrub field list pattern from docx
- Produces: `xlsxPack` id `anthropies.xlsx`, `pptxPack` id `anthropies.pptx`

- [ ] **Step 1: Write failing pack tests**

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"

describe("packs_xlsx_pptx", () => {
  it("xlsx source avoids full-zip utf8 and score", () => {
    const src = readFileSync(new URL("../src/packs/xlsx.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("pptx source avoids full-zip utf8 and score", () => {
    const src = readFileSync(new URL("../src/packs/pptx.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })
})
```

Add fixture-based inspect present and transform scrub tests using tiny OOXML zips with `docProps/core.xml`.

- [ ] **Step 2: Run** `pnpm test tests/packs-xlsx-pptx.test.ts` — expect FAIL.

- [ ] **Step 3: Implement** `ooxml.ts` helpers, format modules, and packs shaped like Phase A docx pack (inspect+remove, markClass `provenance-metadata`, channel `c2pa`, implementationVersion `0.4.0`). Register both packs in `builtinRegistry()`.

- [ ] **Step 4: Run** pack tests plus zip-cap negative control.

- [ ] **Step 5: Commit listed paths.**

---

### Task 6: EPUB pack

**Files:**
- Create: `src/formats/epub.ts`, `src/packs/epub.ts`
- Create: `tests/packs-epub.test.ts`
- Modify: `src/core/builtin-registry.ts`

**Interfaces:**
- Consumes: `unzipCapped`, Kind `epub`
- Produces: `epubPack` id `anthropies.epub`

- [ ] **Step 1: Write failing tests** for OPF creator present, full-zip UTF-8 ban, zip-bomb fail-closed, and no score fields.

- [ ] **Step 2: Run** `pnpm test tests/packs-epub.test.ts` — expect FAIL.

- [ ] **Step 3: Implement** EPUB member-scoped inspect/strip. Prefer `META-INF/container.xml` then OPF metadata. Do not claim pixel-clean on embedded images unless they pass through raster strip on a bounded extracted artifact path (optional follow-up; default is metadata-only for EPUB package documents).

- [ ] **Step 4: Register** `epubPack`. Run tests.

- [ ] **Step 5: Commit listed paths.**

---

### Task 7: Structural PDF

**Files:**
- Modify: `src/formats/pdf.ts`
- Create: `tests/formats-pdf-structural.test.ts`

**Interfaces:**
- Consumes: existing `inspectPdfBytes`, `PdfTools`
- Produces: structure-aware inspect that avoids content-stream false positives; degraded strip unchanged in meaning

- [ ] **Step 1: Write failing tests**

1. PDF with document XMP algorithmic-media marker → present.
2. PDF whose only `c2pa` ASCII sits inside a compressed content stream with no document metadata → not certified present from that noise alone.
3. Tool-missing strip remains degraded and not certified absent.
4. Tool-present strip still emits tool labels when removal succeeds.

- [ ] **Step 2: Run** `pnpm test tests/formats-pdf-structural.test.ts` — expect FAIL.

- [ ] **Step 3: Implement** structural inspect. Keep `pdfPack` as the inspect owner. Keep remove path on pdf-tools / PdfTools with `tool-missing` degradation.

- [ ] **Step 4: Run** PDF structural tests and existing `tests/cert-pdf.test.ts`.

- [ ] **Step 5: Commit listed paths.**

---

### Task 8: Capabilities advertisement and final gate

**Files:**
- Modify: `src/http/server.ts` (if packs are not solely from `builtinRegistry().list()`)
- Modify: `tests/http-capabilities.test.ts`
- Modify: `src/core/builtin-registry.ts` if any pack missing

**Interfaces:**
- Consumes: packs from Tasks 5–6
- Produces: capabilities inventory including Phase B ids; health `0.3.0`

- [ ] **Step 1: Extend** `tests/http-capabilities.test.ts` so `packs[].id` includes `anthropies.xlsx`, `anthropies.pptx`, and `anthropies.epub`. Keep `GET /health reports 0.3.0`.

- [ ] **Step 2: Run** `pnpm test tests/http-capabilities.test.ts` — expect FAIL until registered.

- [ ] **Step 3: Ensure** registry and HTTP list the packs. Assert `layerAPack.manifest.artifactKinds` stays `["text", "svg", "html", "md"]`.

- [ ] **Step 4: Run** `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`.

- [ ] **Step 5: Commit listed paths.** OpenSpec archive is a separate Foreman unit after Sol+Claude are not BLOCKED.

---

## Spec coverage

- BMP/TIFF classify — Task 2
- Raster kind stability for GIF/WebP/AVIF/HEIC — Task 2
- No pixel algorithms — Tasks 3–4
- WebP/AVIF/HEIC applicable parse — Task 3
- GIF/BMP/TIFF metadata — Task 4
- Kind xlsx/pptx/epub and classify — Task 2
- XLSX/PPTX OOXML no full-zip UTF-8 — Task 5
- EPUB member-scoped and zip bomb — Task 6
- Structural PDF and tool degradation — Task 7
- Capabilities + health 0.3.0 — Task 8
- layer-a excludes zip kinds — Task 8
- No mixed score — Tasks 5–6, 8
- Freeze unit docs only — Task 1

## Execution

Foreman write-first Grok, one task per five-part spec after the freeze unit. Independent `pnpm test` plus `tsc`. OpenSpec-vs-code Sol QA/code/docs plus Claude. BLOCKED goes back to Grok. Architect does not hand-patch kernel code. Do not `git add -A`. Do not commit `knowledge/raw` or `.grok`.
