---
type: synthesis
aliases: ["Wave 3 Task 2 implementer", "W3T2 implementer"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 3 Task 1 Implementer Note]]"
  - "[[Task 4 Implementer Note]]"
---

# Wave 3 Task 2 Implementer Note

Family 2 stronger rewrite prompts are on the tree. `PROSE_PROMPT` and `CODE_PROMPT` now **require** clause-order, sentence-boundary, and discourse-marker change so original 5-word sequences (H-grams) do not survive. Facts, URLs, and fences stay byte-stable. Code prompts still refuse public-API / behavior edits.

print-prompt is the snapshot surface: `humanize_prompt_structure_rules` asserts the emitted prompt contains those structure rules and does not contain `undetectable` or `beats detector`.

No official-kill language. print-prompt still does not destamp (`rewrite_metric.status = not-run`). Family 3 README / skill title-restoration copy is later.

See [[Wave 3 Design]] Family 2. Prior path: [[Wave 3 Task 1 Implementer Note]].
