---
type: synthesis
aliases: ["Task 6 style auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 6 Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 2.

`PdfTools` is `Effect.Service` + `Default`. Zip is in-memory `fflate` with the 128 MiB cap checked from the central directory before inflate. `ProcCommand.make` only — no `runInShell`, no `shell: true`. Missing qpdf/exiftool is a Finding + `degraded: true`, not `DecodeError`. Inspector/Cleaner `R` is `FileSystem` (+ `CommandExecutor` on the PDF branch). No `node:fs`, no `HttpClient`.

NIT: no first-class `PdfTools.Test` (spec §5.1); PDF temps are sibling files, not scoped. Same Test-layer residual as Tasks 3–5. Does not block [[Wave 1 Implementation]] Task 6.

See [[Task 6 Implementer Note]] for what landed.
