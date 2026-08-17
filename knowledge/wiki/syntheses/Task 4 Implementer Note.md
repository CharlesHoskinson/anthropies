---
type: synthesis
aliases: ["Task 4 implementer"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 4 Implementer Note

Print-prompt `humanize` and the origin blocklist are on the tree.

Locked surfaces now match [[Wave 1 Design]] §5 / §7 / §11.3:

- `originBlocked` refuses `claude`, `anthropic`, `gemini`, `google-gemini`, `synthid` on backend or model.
- Default backend `print-prompt` returns the ported `PROSE_PROMPT` / `CODE_PROMPT` plus Layer-A-cleaned text. It is not a rewrite.
- `rewrite_metric.status` is `not-run`. Statistical finding is `best-effort`. Honesty matches `/best-effort/`. No removal claim.
- `Humanizer` is `Effect.Service`. `R` is `FileSystem`. No `HttpClient`.
- `OriginBlocked` exits 2 and does not write. Input bytes stay identical.

See [[Wave 1 Implementation]] for the family sequence. Residual: typed backend Config cannot carry `claude` (model string can); ollama HTTP is not implemented; auditor trio not dispatched.
