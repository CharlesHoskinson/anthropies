---
type: synthesis
aliases: ["Task 5 QA auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 5 QA Auditor

**Verdict: APPROVE.** Zero blockers. Named tests lock `cert_c2pa_png_jpeg_svg` (PNG/JPEG), `residual_exit_not_suppressed`, and `cert_c2patool_false_positive`. Soft-binding residual is always on image reports. Official stays `unavailable`; no official-detect lie.

TDD RED was missing `c2pa.js` plus inspect `expected 2 to be 1`, then GREEN. Inspect planted exits 1; successful strip exits 0. `degraded` does not drive 1. Missing `c2patool` is not a fail.

See [[Wave 1 Implementation]] for the family sequence. Leftover-after-clean is a `residualDrivesExit` unit test, not a leftover CLI subprocess. Unparsed WebP/AVIF/HEIC report `c2pa: absent` until a later parser.
