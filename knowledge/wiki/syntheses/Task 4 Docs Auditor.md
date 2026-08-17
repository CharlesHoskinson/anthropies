---
type: synthesis
aliases: ["Task 4 docs auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 4 Docs Auditor

**APPROVE.** Print-prompt `humanize` copy matches [[Wave 1 Design]] §11.3 / §13 and CLAIMS. 0 blockers.

No official-kill claims. Print-prompt does not say `watermark removed`. CLI help still locked (inspect never a single watermark score; clean does not remove the keyed text mark; humanize is best-effort on a non-origin model; demo never claims official text-kill). Honesty stanza still required. Tests are `origin_blocklist` / `humanize_print_prompt_default`, not `removesWatermark`. See [[Wave 1 Implementation]].
