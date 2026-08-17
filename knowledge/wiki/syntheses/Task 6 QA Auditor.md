---
type: synthesis
aliases: ["Task 6 QA auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 6 QA Auditor

**Verdict: APPROVE.** Zero blockers. Named tests lock `cert_c2pa_png_jpeg_svg` (SVG row), `zip_bomb_and_caps`, and PDF degraded exit 0 via `residualDrivesExit` + dest write. `--json` stdout stays Schema-only. Official stays `unavailable`; no official-detect lie.

TDD RED was SVG `BinaryInput` plus missing `zip.js`, then GREEN 31/13. Missing qpdf/exiftool is Finding + `degraded: true` and does not drive exit 1. Zip cap is checked from the central directory before inflate.

See [[Wave 1 Implementation]] for the family sequence. PDF honesty `c2pa: degraded` is a docs verb issue, not residual-exit laundering.
