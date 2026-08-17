---
type: synthesis
aliases: ["Task 6 implementer"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 6 Implementer Note

Markup, office, and PDF inspect/strip are on the tree for Families 3–5.

Locked surfaces now match [[Wave 1 Design]] §6 / §9 / §10 / §12 / §16.2:

- SVG strips `<metadata>` / XMP, then Layer A. Synthetic `fixture-c2pa-present.svg` plants ASCII `c2pa` in `<metadata>`.
- HTML strips generator / `data-ai*` / JSON-LD AI keys, then Layer A on the body.
- Markdown drops YAML frontmatter AI keys (`ai_generated`, `generator: claude`, …), then Layer A on the body.
- DOCX/ODT rewrite in memory with `fflate` (`Uint8Array` only). Scrub `docProps` / `customXml` / `meta.xml`. Layer A on `w:t` / `text:p`. Prune dangling rels. Uncompressed expansion over 128 MiB (per member or sum) is `DecodeError`, exit 2, no write.
- PDF is `ProcCommand.make("exiftool", …)` then `ProcCommand.make("qpdf", "--linearize", …)`. Never shell. Missing tool → Finding, `degraded: true`, dest written, exit 0.
- Named tests: `cert_c2pa_png_jpeg_svg` (SVG row), `zip_bomb_and_caps`, markup/office/pdf certs. Default `pnpm test` does not construct `HttpClient` and does not require qpdf/exiftool.

See [[Wave 1 Implementation]] for the family sequence. Residual: no embedded-media strip, no EPUB/XLSX/PPTX, auditor trio not dispatched.
