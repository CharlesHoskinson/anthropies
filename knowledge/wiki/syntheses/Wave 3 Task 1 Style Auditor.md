---
type: synthesis
aliases: ["Wave 3 Task 1 style auditor"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 3 Task 1 Implementer Note]]"
  - "[[Task 4 Style Auditor]]"
---

# Wave 3 Task 1 Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 3.

Rewrite POSTs go through `@effect/platform` `HttpClient`, not `node:http`. Origin tokens unchanged; `OriginBlocked` stays a TaggedError Fail and runs before POST. Loopback default (`127.0.0.1:11434`); non-loopback needs `ANTHROPIES_REWRITE_ALLOW_REMOTE=1`. print-prompt default stays FileSystem-only (`serviceOption`, no `HttpClient` on `Humanizer.Default`). CLI `humanize` provides `NodeHttpClient.layer`. Config, not `process.env`.

Nits: `completeRewrite` hides `HttpClient` from typed `R`; `new URL()` try/catch; `bodyUnsafeJson` instead of Schema encode. None hold Family 2.

See [[Wave 3 Task 1 Implementer Note]] for what landed.
