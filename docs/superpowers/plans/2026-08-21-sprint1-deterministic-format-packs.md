# Sprint 1 Deterministic Format Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap existing Anthropies format handlers as CapabilityPack values, then extend the format matrix, without new algorithms or mixed report scores.

**Architecture:** Sprint 0 kernel (`inspectArtifact` / `transformArtifact` / `builtinRegistry`) stays. New packs live under `src/packs/` and import `src/formats/*`. Inspector/Cleaner keep public signatures. HTTP `serviceVersion` stays `"0.3.0"`.

**Tech Stack:** TypeScript, Effect 3 Schema.Class, Vitest, existing `inspectDocx` / `cleanHtmlText` / `PdfTools`.

## Global Constraints

- No new watermark algorithms. Wrap existing functions.
- Do not UTF-8-decode `docx`/`odt` zips as Layer A pack input.
- Four report channels stay unmixed. No `score` / `watermarkScore`.
- HTTP `serviceVersion` stays `"0.3.0"`.
- Do not edit `src/report.ts` honesty stanza strings.
- Grok implements from write-first five-part specs. Codex Sol audits OpenSpec vs diff. Architect does not hand-patch kernel code.
- New Endstop contract required before implement (r3 is Sprint 0).

---

### Task 1: HTML and Markdown metadata packs

**Files:**
- Create: `src/packs/html.ts`, `src/packs/md.ts`, `tests/packs-html-md.test.ts`
- Modify: `src/core/builtin-registry.ts`

**Interfaces:**
- Consumes: `inspectHtmlText`, `cleanHtmlText`, `inspectMdText`, `cleanMdText`, `CapabilityPack`, `makeArtifact`
- Produces: `htmlPack`, `mdPack` registered in `builtinRegistry()`

- [ ] **Step 1: Write the failing test** `tests/packs-html-md.test.ts` with titles `html source imports inspectHtmlText`, `md source imports inspectMdText`, `html generator meta is present`.
- [ ] **Step 2: Run** `pnpm test tests/packs-html-md.test.ts` — expect FAIL (files missing).
- [ ] **Step 3: Implement wrappers that call the existing format functions only.**
- [ ] **Step 4: Re-run the test — expect PASS. `pnpm exec tsc -p tsconfig.json --noEmit` exit 0.**
- [ ] **Step 5: Commit listed paths only. Do not `git add -A`.**

### Task 2: DOCX and ODT packs

**Files:**
- Create: `src/packs/docx.ts`, `src/packs/odt.ts`, `tests/packs-office.test.ts`

**Interfaces:**
- Consumes: `inspectDocx`, `cleanDocx`, `inspectOdt`, `cleanOdt`
- Produces: `docxPack`, `odtPack`

- [ ] **Step 1: Write tests that assert `from "../formats/docx.js"` and no UTF-8 zip round-trip.**
- [ ] **Step 2: Run tests — expect FAIL.**
- [ ] **Step 3: Implement packs. `artifactKinds` are `docx` / `odt` only.**
- [ ] **Step 4: Run `pnpm test tests/packs-office.test.ts tests/cert-office.test.ts` — expect PASS.**
- [ ] **Step 5: Commit listed paths.**

### Task 3: Raster strip and PDF tools packs

**Files:**
- Create: `src/packs/raster.ts`, `src/packs/pdf-tools.ts`, `tests/packs-raster-pdf.test.ts`
- Do not replace `c2paPack` or stdlib `pdfPack`.

**Interfaces:**
- Consumes: `stripRasterBytes`, `inspectRasterBytes`, `PdfTools`
- Produces: `rasterPack` (strip), `pdfToolsPack` (degraded honesty when qpdf/exiftool missing)

- [ ] **Step 1: Write tests for strip import and degraded PDF not certified absent.**
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement. Missing tools SHALL set degraded, not absent-as-clean.**
- [ ] **Step 4: Run `pnpm test tests/packs-raster-pdf.test.ts tests/cert-pdf.test.ts tests/cert-c2pa.test.ts`.**
- [ ] **Step 5: Commit listed paths.**

### Task 4: Advertise packs on GET /capabilities

**Files:**
- Modify: `src/http/server.ts`, `tests/http-capabilities.test.ts`

- [ ] **Step 1: Extend the capabilities test so packs[].id includes `anthropies.html`, `anthropies.md`, `anthropies.docx`, `anthropies.odt`.**
- [ ] **Step 2: Run `pnpm test tests/http-capabilities.test.ts` — expect FAIL.**
- [ ] **Step 3: Register the new packs in the server inventory / builtinRegistry.**
- [ ] **Step 4: Run the test plus `tests/http-server.test.ts`. Health stays `{ ok: true, version: "0.3.0" }`.**
- [ ] **Step 5: Commit listed paths.**

### Task 5: Phase B codecs (blocked until Phase A OpenSpec archive)

WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, structural PDF. Separate OpenSpec change. Do not start until Tasks 1–4 are archived and Sol+Claude are not BLOCKED.

## Spec coverage

- ROADMAP Sprint 1 sequence items 1–2 → Tasks 1–4
- Sequence items 3–6 → Task 5 (later OpenSpec)
- No zip UTF-8 → Task 2
- `/capabilities` advertising → Task 4
