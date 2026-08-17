---
type: map
aliases: ["Wave 1 Implementation MOC"]
tags: [moc, type/map, topic/implementation]
created: 2026-08-17
updated: 2026-08-17
status: draft
scope: Task-by-task implementation and auditor notes
---

# Wave 1 Implementation (MOC)

One implementer and three Grok 4.6 auditors (style, QA, docs) per family. Each writes a raw note; notes are ingested here.

## Sources

- [[Wave 1 Design]]

## Concepts

## Entities

## Syntheses

- [[Task 3 Implementer Note]] — Family 1: `classify`, `applyLayerA`, text inspect/clean. Non-text kinds fail closed (`BinaryInput`). `--json` stdout is Schema-only.
- [[Task 2 Implementer Note]] — Effect 3 scaffold at `0.2.0`. `Report` / Fails / Config / CliCommand exist. Claim-forbidden test is green. Handlers are stubs.
- [[Task 1 Implementer Note]] — Family 0 complete. Claims/channels docs exist. Skill keeps Python. Plugin version stays `0.1.0`. Manifesto no longer cites missing legal briefs.

## Task 1 (Family 0)

Honesty patch. Markdown only. Grep over `skills` `commands` `.claude-plugin` is the check.
- [[Task 1 Implementer Note]] — honesty-patch implementer thoughts
- [[Task 1 Style Auditor]] — STYLE verdict on Task 1
- [[Task 1 QA Auditor]] — QA verdict on Task 1
- [[Task 1 Docs Auditor]] — DOCS verdict on Task 1

## Task 2 (Effect scaffold)

Effect 3 + Node 22 ESM CLI at `0.2.0`. Named test `official_claim_forbidden`.
- [[Task 2 Implementer Note]] — scaffold implementer thoughts
- [[Task 2 Implementer Note]] — Effect 3 scaffold implementer
- [[Task 2 Style Auditor]] — STYLE verdict on Task 2
- [[Task 2 QA Auditor]] — QA verdict on Task 2
- [[Task 2 Docs Auditor]] — DOCS verdict on Task 2

## Task 3 (Family 1 text)

Classify + Layer A + text inspect/clean. Named tests `cert_layer_a_roundtrip`, `binary_guard_docx_png_stdin`, `json_stdout_purity`, `write_guard`.
- [[Task 3 Implementer Note]] — classify / Layer A / text inspect/clean implementer thoughts
