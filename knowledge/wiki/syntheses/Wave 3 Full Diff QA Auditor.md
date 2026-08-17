---
type: synthesis
aliases: ["Wave 3 full-branch QA auditor", "W3F4 QA", "Wave 3 Full QA Audit"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 3 Task 1 QA Auditor]]"
  - "[[Wave 3 Task 2 QA Auditor]]"
  - "[[Wave 3 Task 3 QA Auditor]]"
  - "[[Wave 3 Full Diff Style Auditor]]"
  - "[[Wave 3 Full Diff Docs Auditor]]"
  - "[[Wave 1 Full QA Audit]]"
  - "[[Wave 1 Implementation]]"
---

# Wave 3 Full Diff QA Auditor

**Verdict: APPROVE.** Zero blockers. Zero majors. Family 4 merge-gate QA on `origin/main...HEAD`.

Real ollama / openai-compatible rewrite POSTs run (loopback default). Default CI uses a fake `HttpClient.make` backend; no live model. `rewrite_metric` is `computed` after a real rewrite when `n >= 200` prose tokens and is never a pass bar. print-prompt stays default (`not-run`, does not destamp). Prompts require clause-order / H-gram break; string tests exist. Origin tokens unchanged. No `src/http/`. Tests do not assert official-detector fail.

`pnpm test` / `pnpm build` were not executed in this auditor process (no shell). Static suite: 17 files / 48 cases. Parent should run them in WSL before merge if a vitest count is required.

See [[Wave 3 Design]]. Prior path: [[Wave 3 Task 1 QA Auditor]], [[Wave 3 Task 2 QA Auditor]], [[Wave 3 Task 3 QA Auditor]]. Sibling full-diff: [[Wave 3 Full Diff Style Auditor]], [[Wave 3 Full Diff Docs Auditor]].
