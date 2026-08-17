---
type: synthesis
aliases: ["Task 7 style auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 7 Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 2.

`Capturer` is `Effect.Service` + `Default`. `HttpClient` is yielded only after allowlist + key and provided only on `capture`/`demo` Live. Env is `Config`, never `process.env`. Fails are `PreMarkModel` / `MissingApiKey`. No `node:fs`. `@effect/cli` + ESM + `0.2.0`.

NIT: no first-class `Capturer.Test` (spec §5.1); dual allowlist + HTTP `orDie` (demo skip is §11.5). Same Test-layer residual as Tasks 3–6. Does not block [[Wave 1 Implementation]] Task 7.

See [[Task 7 Implementer Note]] for what landed.
