# Task 6 implementer note (markup + office + PDF)

Date: 2026-08-17
Role: implementer
Task: Markup + office + PDF (Families 3–5)

## What I changed

- Created `fixtures/c2pa/fixture-c2pa-present.svg`. Planted `<metadata>c2pa planted</metadata>`. Not a signed Claude Output. Not WR bytes.
- Created `src/formats/svg.ts`, `html.ts`, `md.ts`. Strip metadata / generator / `data-ai*` / JSON-LD AI keys / YAML frontmatter AI keys (`ai_generated`, `generator: claude`, …). Layer A after the meta strip.
- Created `src/formats/zip.ts`, `docx.ts`, `odt.ts`. In-memory `fflate` on `Uint8Array`. No `node:fs`. 128 MiB uncompressed cap per member and sum, checked from the central directory before inflate. DOCX scrubs `docProps` / `customXml`, Layer A on `w:t`, prunes dangling rels. ODT scrubs `meta.xml` / `meta:generator`, Layer A on `text:p`.
- Created `src/formats/pdf.ts`. `PdfTools` runs `ProcCommand.make("exiftool", …)` then `ProcCommand.make("qpdf", "--linearize", …)`. Never `runInShell`. Missing tool is a Finding, `degraded: true`, dest written, exit 0.
- Wired Inspector / Cleaner for svg / html / md / docx / odt / pdf. `makeContainerReport` carries both deterministic and c2pa channels. SVG keeps the soft-binding residual sentence.
- Tests: SVG row on `cert_c2pa_png_jpeg_svg`, `zip_bomb_and_caps` (16-byte cap on `unzipCapped` plus a claimed-200-MiB CD, not a real bomb), `cert_markup_html_md`, `cert_office_docx_odt`, `cert_pdf_degraded` with a `PdfTools` test double.
- Truncated DOCX PK prefix is now `DecodeError` (same pattern as truncated PNG after Task 5).
- Inspector/Cleaner dispatch is one table, so Families 3–5 landed in one feat commit rather than three.

## Why

Families 3–5 have to certify container metadata and Layer A on text-bearing kinds, refuse zip bombs, and treat missing PDF tools as degraded success, not Fail. Default tests must not construct `HttpClient` or require qpdf/exiftool.

## Residual risks

- Embedded raster data URIs inside SVG/HTML/MD and embedded media in DOCX are not stripped this task. Pixel removal is out of scope.
- XLSX / PPTX / EPUB classify as `binary` or stay unhandled. Not Wave 1 kinds.
- `Layer.provide` of a `PdfTools` double on `Cleaner.Default` may not replace a sealed Default; CI without qpdf/exiftool still hits the live degraded path. The double plus `residualDrivesExit` still lock the contract.
- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.

## Almost did, did not

- Almost added `node:fs` temp files via `fs/promises`. Did not. PDF temps go through `FileSystem`.
- Almost used `Command.runInShell`. Did not. `ProcCommand.make` only.
- Almost committed a real zip bomb. Did not. Patched 16-byte cap and a lying CD size field.
- Almost implemented EPUB / XLSX / PPTX because WR does. Did not. Brief is svg/html/md/docx/odt/pdf.
- Almost dispatched STYLE/QA/DOCS subagents. Parent instruction: do not dispatch.
