---
type: map
aliases: ["Wave 2 Implementation MOC"]
tags: [moc, type/map, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: draft
scope: Task-by-task Wave 2 implementation and auditor notes
---

# Wave 2 Implementation (MOC)

One implementer and three Grok 4.6 auditors (style, QA, docs) per family. Each writes a raw note; notes are ingested here.

## Sources

- [[Wave 2 Design]]
- [[Wave 1 Implementation]]

## Concepts

## Entities

## Syntheses

- [[Wave 2 Task 1 Style Auditor]] — STYLE APPROVE; platform HttpServer; FileSystem temps; Fail≠Finding; no node:fs
- [[Wave 2 Task 1 Implementer Note]] — `HttpApp` Layer; inspect/clean; bearer iff key; 256 MiB cap; official unavailable; no `/humanize`
- [[Wave 2 Task 1 QA Auditor]] — QA APPROVE; trailer fixture, official unavailable, bearer 401, 256 MiB, no `/humanize`
- [[Wave 2 Task 1 Docs Auditor]] — DOCS APPROVE; honesty on report; 0.3.0; no official-kill
- [[Wave 2 Task 2 Implementer Note]] — OpenAPI 3.0.3; `serve` loopback `127.0.0.1:8765`; no `/humanize`

## Task 1 (HTTP inspect/clean)

`@effect/platform` HttpServer wrapping Wave 1 Inspector and Cleaner. Version `0.3.0`. Named test `tests/http-server.test.ts`.

- [[Wave 2 Task 1 Implementer Note]] — HTTP inspect/clean implementer thoughts
- [[Wave 2 Task 1 Style Auditor]] — STYLE APPROVE; 0 blockers; 3 nits (DecodeError remap, duck-typed catch, unused HealthResponse)
- [[Wave 2 Task 1 QA Auditor]] — QA APPROVE; named http-server checks pass
- [[Wave 2 Task 1 Docs Auditor]] — DOCS APPROVE; honesty stanza pass-through; no official-kill

## Task 2 (OpenAPI + serve CLI)

`GET /openapi.json` is OpenAPI 3.0.3 with `/health` `/capabilities` `/inspect` `/clean`. `anthropies serve` defaults to `127.0.0.1:8765`. No `/humanize`.

- [[Wave 2 Task 2 Implementer Note]] — OpenAPI + serve implementer thoughts

## Task 3 (Skill HTTP path)

Not started. `ANTHROPIES_SERVICE_URL`, curl examples, health-check first.

## Task 4 (Docker + compose)

Not started.

## Task 5 (GitHub CI)

Not started.
