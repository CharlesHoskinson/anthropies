---
type: synthesis
aliases: ["Wave 3 full style auditor", "Wave 3 full-diff STYLE"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 3 Task 1 Style Auditor]]"
  - "[[Wave 3 Task 2 Style Auditor]]"
  - "[[Wave 3 Task 3 Style Auditor]]"
  - "[[Wave 1 Full Style Audit]]"
---

# Wave 3 Full Diff Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 2.

Full branch `origin/main...HEAD` holds the Wave 3 STYLE hard gate. Effect 3.22.1 ESM Node 22. No inbound HTTP `/humanize` and no `src/http/` rewrite. Origin tokens unchanged (`claude|anthropic|gemini|google-gemini|synthid`). Default backend stays `print-prompt` and does not destamp. Real ollama / openai-compatible rewrite POSTs via `@effect/platform` `HttpClient` (loopback `127.0.0.1:11434`; remote needs `ANTHROPIES_REWRITE_ALLOW_REMOTE=1`). `rewrite_metric` is computed after a successful rewrite (`computed` at `n >= 200` prose) and is never a CI pass bar. Prompts require clause-order / H-gram break and keep facts/URLs/fences. Ship version `0.4.0`. No MarkLLM, pixel, or CtrlRegen. No forbidden imports. Fail≠Finding. destamp / official-kill / undetectable are denials, not capabilities.

Nits: README How-to-run still says `0.2.0`; `completeRewrite` hides `HttpClient` behind `serviceOption` (`R = never`). Family 1–3 nits stay nits; none are honesty violations.

See [[Wave 3 Design]], [[Wave 3 Task 1 Style Auditor]], [[Wave 3 Task 2 Style Auditor]], [[Wave 3 Task 3 Style Auditor]], and [[Wave 1 Full Style Audit]].
