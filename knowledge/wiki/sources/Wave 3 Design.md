---
type: source
aliases: ["Wave 3 spec", "Wave 3 Layer B"]
tags: [source, type/source, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
---

# Wave 3 Design

Locked leapfrog spec at `docs/superpowers/specs/2026-08-17-anthropies-wave3-design.md`. Ships `0.4.0`. Depends on Wave 1; may land before or after Wave 2 HTTP. Do not rewrite `src/http/` here.

Family 1: real ollama / openai-compatible rewrite + `rewrite_metric` computed after a successful rewrite (`status: computed` when `n >= 200` prose tokens). print-prompt stays default (`not-run`). Origin blocklist unchanged. Tests use a fake HTTP backend.

See [[Wave 3 Task 1 Implementer Note]]. Related: [[Wave 1 Design]].
