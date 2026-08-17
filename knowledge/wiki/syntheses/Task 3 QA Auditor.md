---
type: synthesis
aliases: ["Task 3 QA auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 3 QA Auditor

**Verdict: APPROVE.** Zero blockers. Family 1 locks `cert_layer_a_roundtrip`, PNG/DOCX `BinaryInput` with no write, `--json` stdout as one Schema Report, and inspect exit 1 on a planted trailer.

TDD RED was missing `layer-a.js` / `cleaner.js` (brief-expected), then GREEN. Trailer inspect is residual exit 1. PNG is `BinaryInput` exit 2 and does not write.

See [[Wave 1 Implementation]] for the family sequence. Spec §16.2 stdin/JPEG/PDF and inspect-after-clean are later-family named-test remainder, not this task’s brief gate.
