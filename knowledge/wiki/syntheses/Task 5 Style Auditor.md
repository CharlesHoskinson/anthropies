---
type: synthesis
aliases: ["Task 5 style auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 5 Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 1.

`C2pa` is `Effect.Service` + `Default`. Raster parse is pure bytes. Inspector/Cleaner `R` is `FileSystem` — no `HttpClient`, no `node:fs`, no `CommandExecutor` on the default path. Truncated raster is `DecodeError`. `c2pa` present/absent is a Finding. Residual is CLI exit 1, not a Fail.

NIT: no `Test` layer (spec §5.1). Same residual as Tasks 3–4. Does not block [[Wave 1 Implementation]] Task 5.

See [[Task 5 Implementer Note]] for what landed.
