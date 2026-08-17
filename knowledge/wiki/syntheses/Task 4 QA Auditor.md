---
type: synthesis
aliases: ["Task 4 QA auditor"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 4 QA Auditor

**Verdict: APPROVE.** Zero blockers. Named tests lock `origin_blocklist` and `humanize_print_prompt_default`. Print-prompt returns the prompt with `rewrite_metric.status = "not-run"`. `OriginBlocked` is exit 2 and leaves bytes unchanged.

TDD RED was missing `humanizer.js` (brief-expected), then GREEN. Origin check runs before any write. Default `R` is `FileSystem`; no `HttpClient`.

See [[Wave 1 Implementation]] for the family sequence. CLI exit 2 is teardown-wired, not a subprocess assert. Backend `claude` is a Config defect (Task 2 literal), not this task’s live `OriginBlocked` path.
