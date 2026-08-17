---
type: synthesis
aliases: ["Wave 3 Task 2 QA auditor", "W3T2 QA"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 3 Task 2 Implementer Note]]"
  - "[[Wave 3 Task 1 QA Auditor]]"
---

# Wave 3 Task 2 QA Auditor

**Verdict: APPROVE.** Zero blockers. Family 2 requires clause-order / sentence-boundary / discourse-marker change (H-gram break) in `PROSE_PROMPT` and `CODE_PROMPT`, keeps facts/URLs/fences byte-stable, and snapshot-tests print-prompt text for those rules.

No official-kill / undetectable / beats-detector language in the prompts. print-prompt stays `rewrite_metric.status = not-run`. Code prompt still refuses public-API / behavior edits.

Residual: Family 3 README / skill title-restoration copy. Tests are regex contains, not vitest snapshot files.

See [[Wave 3 Design]] Family 2.
