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

- [[Wave 3 Design]]
- [[Wave 1 Design]]

## Concepts

## Entities

## Syntheses

- [[Wave 3 Full Diff QA Auditor]] — QA APPROVE; real rewrite; fake HTTP; computed metric not a pass bar; origin blocklist; no /humanize
- [[Wave 3 Full Diff Style Auditor]] — STYLE APPROVE on full Wave 3 leapfrog; Effect 3; no /humanize; print-prompt default; 0.4.0
- [[Wave 3 Full Diff Docs Auditor]] — DOCS APPROVE; full-branch title restoration + residual risk; CLAIMS humanize row; destamp denial; origin blocklist; 0.4.0
- [[Wave 3 Task 3 Docs Auditor]] — DOCS APPROVE; Family 3 title-restoration copy; CLAIMS humanize row; no official-kill
- [[Wave 3 Task 3 Implementer Note]] — Family 3: README/skill title-restoration copy; CLAIMS humanize row; print-prompt does not destamp
- [[Wave 3 Task 1 Implementer Note]] — Family 1: real rewrite backends + computed rewrite_metric at 0.4.0
- [[Wave 1 Full Style Audit]] — STYLE APPROVE on full branch; Effect 3; Fail≠Finding; per-command R; `@effect/cli`; no HTTP service
- [[Wave 1 Full Docs Audit]] — DOCS APPROVE; full-branch honesty box; capture not sample; npx; 0.2.0
- [[Task 7 Style Auditor]] — STYLE APPROVE; Capturer Effect.Service; HttpClient only on capture/demo Live
- [[Task 7 Implementer Note]] — Family 6: `capture` / `demo`, empty allowlist → `PreMarkModel`, README honesty-first, `npx anthropies`, Python deleted.
- [[Task 6 QA Auditor]] — QA APPROVE; SVG c2pa row, zip_bomb_and_caps, PDF degraded exit 0; --json still Schema-only; no official-detect lie
- [[Task 6 Style Auditor]] — STYLE APPROVE; fflate in-memory; ProcCommand.make only; missing tools are Findings
- [[Task 6 Docs Auditor]] — DOCS APPROVE-WITH-CHANGES; PDF honesty must not say c2pa: degraded
- [[Task 6 Implementer Note]] — Families 3–5: SVG/HTML/MD metadata + Layer A; DOCX/ODT in-memory zip with 128 MiB cap; PDF via ProcCommand with degraded missing-tool path.
- [[Task 5 Implementer Note]] — Family 2: PNG/JPEG hard-bound C2PA inspect/strip. Soft-binding residual always on image reports. Skill trigger restored after tests green.
- [[Task 4 Implementer Note]] — Family 1: print-prompt `humanize` + `originBlocked`. `rewrite_metric.status` is `not-run`. `OriginBlocked` exits 2, bytes unchanged. No `HttpClient`.
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
- [[Task 3 QA Auditor]] — QA verdict on Task 3
- [[Task 3 Docs Auditor]] — DOCS verdict on Task 3
- [[Task 3 Implementer Note]] — Layer A and text CLI implementer
- [[Task 3 Style Auditor]] — STYLE verdict on Task 3

## Task 7 (Family 6 capture / demo / delete Python)

`capture` + `demo`, empty `allowlist.json`, `npx` retarget, delete `src/anthropies`. Named tests `premark_unknown_model`, `official_unavailable_default`, `live_capture_smoke`.
- [[Task 7 Implementer Note]] — capture / demo / Python-delete implementer thoughts
- [[Task 7 QA Auditor]] — QA verdict on Task 7
- [[Task 7 Style Auditor]] — STYLE verdict on Task 7

## Task 6 (Families 3–5 markup, office, PDF)

SVG/HTML/MD metadata + Layer A; DOCX/ODT zip budget; PDF exiftool/qpdf degraded path. Named tests `cert_c2pa_png_jpeg_svg` (SVG row), `zip_bomb_and_caps`.
- [[Task 6 Implementer Note]] — markup / office / PDF implementer thoughts
- [[Task 6 QA Auditor]] — QA verdict on Task 6
- [[Task 6 Style Auditor]] — STYLE verdict on Task 6
- [[Task 6 Docs Auditor]] — DOCS verdict on Task 6

## Task 5 (Family 2 raster C2PA)

PNG/JPEG hard-bound C2PA. Named tests `cert_c2pa_png_jpeg_svg` (PNG/JPEG rows), `cert_c2patool_false_positive`, `residual_exit_not_suppressed`.
- [[Task 5 Implementer Note]] — raster C2PA implementer thoughts

## Task 4 (humanize print-prompt)

Origin blocklist + print-prompt Humanizer. Named tests `origin_blocklist`, `humanize_print_prompt_default`.
- [[Task 4 Implementer Note]] — print-prompt / origin blocklist implementer thoughts
- [[Task 4 QA Auditor]] — QA verdict on Task 4
- [[Task 4 Style Auditor]] — STYLE verdict on Task 4
- [[Task 4 Docs Auditor]] — DOCS verdict on Task 4
- [[Task 4 Implementer Note]] — humanize implementer
- [[Task 5 Style Auditor]] — STYLE verdict on Task 5
- [[Task 5 QA Auditor]] — QA verdict on Task 5
- [[Task 5 Docs Auditor]] — DOCS verdict on Task 5
- [[Task 6 Implementer Note]] — markup/office/PDF implementer
- [[Task 7 Implementer Note]] — capture/demo implementer
- [[Task 7 Docs Auditor]] — DOCS verdict on Task 7
- [[Wave 1 Full Style Audit]] — full-branch STYLE
- [[Wave 1 Full QA Audit]] — full-branch QA
- [[Wave 1 Full Docs Audit]] — full-branch DOCS
