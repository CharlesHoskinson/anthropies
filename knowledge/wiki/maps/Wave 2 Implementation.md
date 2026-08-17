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

- [[Wave 2 Task 1 Implementer Note]] — `HttpApp` Layer; inspect/clean; bearer iff key; 256 MiB cap; official unavailable; no `/humanize`

## Task 1 (HTTP inspect/clean)

`@effect/platform` HttpServer wrapping Wave 1 Inspector and Cleaner. Version `0.3.0`. Named test `tests/http-server.test.ts`.

- [[Wave 2 Task 1 Implementer Note]] — HTTP inspect/clean implementer thoughts

## Task 2 (OpenAPI + serve CLI)

Not started. `GET /openapi.json`, `anthropies serve --host 127.0.0.1 --port 8765`.

## Task 3 (Skill HTTP path)

Not started. `ANTHROPIES_SERVICE_URL`, curl examples, health-check first.

## Task 4 (Docker + compose)

Not started.

## Task 5 (GitHub CI)

Not started.
