---
type: map
aliases: ["Wave 1 Overview MOC"]
tags: [moc, type/map, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: draft
scope: Anthropies Wave 1 implementation thesis
---

# Wave 1 Overview (MOC)

Implementation notes compiled from the Wave 1 spec, plan, implementers, and three auditor personas. Wave 2 notes start on [[Wave 2 Implementation]].

## Sources

- [[Wave 3 Design]] — locked Wave 3 Layer B leapfrog spec
- [[Wave 1 Design]] — locked Wave 1 spec
- [[Wave 2 Design]] — locked Wave 2 spec

## Concepts

## Entities

## Syntheses

- [[Wave 3 Full Diff QA Auditor]] — QA APPROVE; real rewrite; fake HTTP; computed metric not a pass bar; origin blocklist; no /humanize; no official-kill
- [[Wave 3 Full Diff Style Auditor]] — STYLE APPROVE on origin/main...HEAD; Effect 3; no /humanize; print-prompt default; rewrite_metric not a CI bar; 0.4.0
- [[Wave 3 Full Diff Docs Auditor]] — DOCS APPROVE; full-branch title restoration + residual risk; CLAIMS humanize row; destamp denial; origin blocklist; 0.4.0; no official-kill
- [[Wave 3 Task 3 Docs Auditor]] — DOCS APPROVE; README/skill title restoration + residual risk; CLAIMS humanize row; no official-kill
- [[Wave 3 Task 3 QA Auditor]] — QA APPROVE; title restoration + residual risk; print-prompt does not destamp; no official-kill
- [[Wave 3 Task 3 Implementer Note]] — Family 3 title-restoration copy; residual risk; print-prompt does not destamp; no official-kill
- [[Wave 3 Task 2 Docs Auditor]] — DOCS APPROVE; required structure-change prompts; no undetectable/beats detector; print-prompt does not destamp
- [[Wave 3 Task 2 QA Auditor]] — QA APPROVE; structure-rule print-prompt snapshots; facts/URLs/fences; no official-kill
- [[Wave 3 Task 2 Style Auditor]] — STYLE APPROVE; prompt constants; structure-rule tests; no node:fs
- [[Wave 3 Task 2 Implementer Note]] — Family 2 required structure-change prompts; print-prompt snapshot tests; no official-kill
- [[Wave 3 Task 1 QA Auditor]] — QA APPROVE; fake HTTP; computed vs not-run; origin block; no live model; no official-kill
- [[Wave 3 Task 1 Implementer Note]] — Family 1 real rewrite path; ollama / openai-compatible POST; rewrite_metric computed; 0.4.0
- [[Wave 2 Full Diff QA Auditor]] — QA APPROVE; routes/payloads/loopback/bearer/OpenAPI/Docker/CI; 89cef71 raster honesty; 51 tests
- [[Wave 2 Full Diff Style Auditor]] — STYLE APPROVE; Effect 3; platform HttpServer; loopback serve; no /humanize; no forbidden src imports
- [[Wave 2 Full Diff Docs Auditor]] — DOCS APPROVE; full-branch serve/loopback/Docker/CI; 0.3.0; no destamp/official-kill
- [[Wave 2 Task 5 QA Auditor]] — QA APPROVE; ci.yml push/PR main; ubuntu+windows; Node 22; frozen-lockfile test+build
- [[Wave 2 Task 5 Docs Auditor]] — DOCS APPROVE; GitHub Actions ci.yml; no destamp/official-kill; no /humanize
- [[Wave 2 Task 5 Style Auditor]] — STYLE APPROVE; Node 22; ubuntu+windows; frozen-lockfile test then build; no heavy backends
- [[Wave 2 Task 5 Implementer Note]] — GitHub Actions CI; Node 22; ubuntu+windows; frozen-lockfile test+build
- [[Wave 2 Task 4 Implementer Note]] — Node 22 Docker; compose loopback 127.0.0.1:8765; no heavy backends; 0.3.0
- [[Wave 2 Task 3 Implementer Note]] — skill HTTP path; ANTHROPIES_SERVICE_URL; health first; npx fallback; 0.3.0 serve
- [[Wave 2 Task 2 Docs Auditor]] — DOCS APPROVE; honesty on report; 0.3.0; serve --help loopback; no official-kill
- [[Wave 2 Task 2 QA Auditor]] — QA APPROVE; OpenAPI 3.0.3 paths; serve loopback 127.0.0.1:8765; no /humanize
- [[Wave 2 Task 2 Style Auditor]] — STYLE APPROVE; platform HttpServer; @effect/cli serve; no raw node:http
- [[Wave 2 Task 2 Implementer Note]] — OpenAPI 3.0.3; serve loopback 127.0.0.1:8765; no /humanize
- [[Wave 2 Task 1 QA Auditor]] — QA APPROVE; trailer fixture, official unavailable, bearer 401, 256 MiB, no /humanize
- [[Wave 2 Task 1 Style Auditor]] — STYLE APPROVE; platform HttpServer; FileSystem temps; Fail≠Finding; no node:fs
- [[Wave 2 Task 1 Implementer Note]] — HttpApp Layer; inspect/clean; 0.3.0; official stays unavailable; no /humanize
- [[Wave 1 Full Style Audit]] — STYLE APPROVE on e4a76b6..4419c7a; Effect 3; no forbidden imports; Fail≠Finding; per-command R; no HTTP service
- [[Wave 1 Full QA Audit]] — QA APPROVE; §16.2 named tests, --json purity, residual exit 1, official unavailable, Python gone
- [[Wave 1 Full Docs Audit]] — DOCS APPROVE; full-branch honesty box; capture not sample; npx; 0.2.0; no destamp/official-kill
- [[Task 7 Style Auditor]] — STYLE APPROVE; Capturer Effect.Service; HttpClient only on capture/demo Live; Config not process.env
- [[Task 7 Docs Auditor]] — DOCS APPROVE; honesty box first; capture not sample; npx; 0.2.0; no destamp/official-kill
- [[Task 7 Implementer Note]] — Family 6: capture / demo; empty allowlist; npx retarget; Python deleted; official stays unavailable
- [[Task 6 QA Auditor]] — QA APPROVE; SVG c2pa row, zip_bomb_and_caps, PDF degraded exit 0; no official-detect lie
- [[Task 6 Style Auditor]] — STYLE APPROVE; fflate CD cap; ProcCommand.make only; missing tools degrade
- [[Task 6 Docs Auditor]] — DOCS APPROVE-WITH-CHANGES; PDF honesty must not say c2pa: degraded
- [[Task 6 Implementer Note]] — Families 3–5: SVG/HTML/MD + Layer A; DOCX/ODT zip cap; PDF missing-tool degrades; no HttpClient
- [[Task 5 Implementer Note]] — raster C2PA inspect/strip for PNG/JPEG; soft-binding residual; FileSystem-only; skill trigger restored
- [[Task 4 QA Auditor]] — QA APPROVE; origin_blocklist, print-prompt not-run, OriginBlocked exit 2, bytes unchanged
- [[Task 4 Style Auditor]] — STYLE APPROVE; originBlocked pure; Humanizer Effect.Service; FileSystem-only; OriginBlocked TaggedError
- [[Task 4 Docs Auditor]] — DOCS APPROVE; no official-kill; print-prompt does not say watermark removed; CLI help still honest
- [[Task 4 Implementer Note]] — print-prompt humanize + origin blocklist; FileSystem-only; rewrite_metric not-run
- [[Task 3 QA Auditor]] — QA APPROVE; Layer A cert, trailer exit 1, PNG BinaryInput no-write, --json parseable
- [[Task 3 Docs Auditor]] — DOCS APPROVE; honesty stanza required; no watermark-removed verdict
- [[Task 3 Implementer Note]] — classify + Layer A + text inspect/clean; FileSystem-only Inspector/Cleaner; BinaryInput fail-closed
- [[Task 2 Implementer Note]] — Effect 3 ESM CLI scaffold at 0.2.0; Report has no suspicious; honesty stanza locked
- [[Task 1 Implementer Note]] — Family 0 honesty patch landed; no official-kill or C2PA-from-Claude claims in skill/plugin/slash
- [[Task 1 Implementer Note]] — honesty-patch implementer thoughts
- [[Task 1 Style Auditor]] — STYLE verdict on Task 1
- [[Task 1 QA Auditor]] — QA verdict on Task 1
- [[Task 1 Docs Auditor]] — DOCS verdict on Task 1
- [[Task 2 Implementer Note]] — Effect 3 scaffold implementer
- [[Task 2 Style Auditor]] — STYLE verdict on Task 2
- [[Task 2 QA Auditor]] — QA verdict on Task 2
- [[Task 2 Docs Auditor]] — DOCS verdict on Task 2
- [[Task 3 Implementer Note]] — Layer A and text CLI implementer
- [[Task 3 Style Auditor]] — STYLE verdict on Task 3
- [[Task 3 QA Auditor]] — QA verdict on Task 3
- [[Task 3 Docs Auditor]] — DOCS verdict on Task 3
- [[Task 4 Implementer Note]] — print-prompt humanize implementer
- [[Task 4 QA Auditor]] — QA verdict on Task 4
- [[Task 4 Implementer Note]] — humanize implementer
- [[Task 4 Style Auditor]] — STYLE verdict on Task 4
- [[Task 4 Docs Auditor]] — DOCS verdict on Task 4
- [[Task 5 Implementer Note]] — raster C2PA implementer
- [[Task 5 Style Auditor]] — STYLE verdict on Task 5
- [[Task 5 QA Auditor]] — QA verdict on Task 5
- [[Task 5 Docs Auditor]] — DOCS verdict on Task 5
- [[Task 6 Implementer Note]] — markup/office/PDF implementer
- [[Task 6 Style Auditor]] — STYLE verdict on Task 6
- [[Task 6 QA Auditor]] — QA verdict on Task 6
- [[Task 6 Docs Auditor]] — DOCS verdict on Task 6
- [[Task 7 Implementer Note]] — capture/demo implementer
- [[Task 7 Style Auditor]] — STYLE verdict on Task 7
- [[Task 7 QA Auditor]] — QA verdict on Task 7
- [[Task 7 Docs Auditor]] — DOCS verdict on Task 7
- [[Wave 1 Full Style Audit]] — full-branch STYLE
- [[Wave 1 Full QA Audit]] — full-branch QA
- [[Wave 1 Full Docs Audit]] — full-branch DOCS
- [[Wave 2 Task 1 Implementer Note]] — HTTP service implementer
- [[Wave 2 Task 1 Docs Auditor]] — DOCS
- [[Wave 2 Task 2 Implementer Note]] — OpenAPI and serve
