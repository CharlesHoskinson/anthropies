---
type: synthesis
aliases: ["Wave 3 Task 2 style auditor"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 3 Task 2 Implementer Note]]"
  - "[[Wave 3 Task 1 Style Auditor]]"
  - "[[Task 4 Style Auditor]]"
---

# Wave 3 Task 2 Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 0.

`PROSE_PROMPT` and `CODE_PROMPT` are exported constants. `promptFor` only selects. `humanize_prompt_structure_rules` covers prose and code print-prompt. No `node:fs` in `src/` or `tests/`.

See [[Wave 3 Task 2 Implementer Note]] for what landed.
