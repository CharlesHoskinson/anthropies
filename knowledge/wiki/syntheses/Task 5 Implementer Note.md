---
type: synthesis
aliases: ["Task 5 implementer"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 5 Implementer Note

Raster hard-bound C2PA inspect/strip is on the tree for PNG and JPEG.

Locked surfaces now match [[Wave 1 Design]] §7 / §10 / §13 / §16.2:

- Synthetic `fixture-c2pa-present.png` / `.jpg` plant ASCII `c2pa` in `tEXt` / APP11. Not a Claude signature.
- `C2pa.inspect` / `C2pa.strip` are stdlib parsers. PNG drops `caBX`, `c2pa`/`jumb` payloads, and XMP/C2PA text chunks; keeps `IHDR`/`IDAT`/`IEND`. JPEG drops APP11 and APP1 XMP.
- Image reports always include the soft-binding residual sentence. Soft-binding and pixel marks stay out of scope.
- Inspect of planted C2PA exits 1 in human and `--json`. Successful strip exits 0. `residualDrivesExit` does not launder leftover `present` unless `degraded`.
- `c2patool` is optional. `No claim found` / `No JUMBF data found` ⇒ `has_manifest === false`. Missing tool is not a fail.
- After tests green, skill YAML gained only: `clean hard-bound C2PA metadata from owned png/jpg/svg (and other supported files).`

See [[Wave 1 Implementation]] for the family sequence. Residual: WebP/AVIF/HEIC are classified but not stripped here; SVG is Task 6; auditor trio not dispatched.
