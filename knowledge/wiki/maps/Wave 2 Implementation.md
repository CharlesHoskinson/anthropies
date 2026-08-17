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

- [[Wave 2 Task 5 Implementer Note]] — GitHub Actions CI; Node 22; ubuntu+windows; frozen-lockfile test+build
- [[Wave 2 Task 4 Implementer Note]] — Node 22 image; compose `127.0.0.1:8765:8765`; no heavy backends
- [[Wave 2 Task 3 Implementer Note]] — skill HTTP path; `ANTHROPIES_SERVICE_URL`; health first; npx fallback
- [[Wave 2 Task 1 Style Auditor]] — STYLE APPROVE; platform HttpServer; FileSystem temps; Fail≠Finding; no node:fs
- [[Wave 2 Task 1 Implementer Note]] — `HttpApp` Layer; inspect/clean; bearer iff key; 256 MiB cap; official unavailable; no `/humanize`
- [[Wave 2 Task 1 QA Auditor]] — QA APPROVE; trailer fixture, official unavailable, bearer 401, 256 MiB, no `/humanize`
- [[Wave 2 Task 1 Docs Auditor]] — DOCS APPROVE; honesty on report; 0.3.0; no official-kill
- [[Wave 2 Task 2 Implementer Note]] — OpenAPI 3.0.3; `serve` loopback `127.0.0.1:8765`; no `/humanize`
- [[Wave 2 Task 2 Style Auditor]] — STYLE APPROVE; platform HttpServer; `@effect/cli` serve; no raw `node:http`
- [[Wave 2 Task 2 QA Auditor]] — QA APPROVE; OpenAPI 3.0.3 paths; serve loopback; no `/humanize`
- [[Wave 2 Task 2 Docs Auditor]] — DOCS APPROVE; honesty on report; 0.3.0; serve help; no official-kill

## Task 1 (HTTP inspect/clean)

`@effect/platform` HttpServer wrapping Wave 1 Inspector and Cleaner. Version `0.3.0`. Named test `tests/http-server.test.ts`.

- [[Wave 2 Task 1 Implementer Note]] — HTTP inspect/clean implementer thoughts
- [[Wave 2 Task 1 Style Auditor]] — STYLE APPROVE; 0 blockers; 3 nits (DecodeError remap, duck-typed catch, unused HealthResponse)
- [[Wave 2 Task 1 QA Auditor]] — QA APPROVE; named http-server checks pass
- [[Wave 2 Task 1 Docs Auditor]] — DOCS APPROVE; honesty stanza pass-through; no official-kill

## Task 2 (OpenAPI + serve CLI)

`GET /openapi.json` is OpenAPI 3.0.3 with `/health` `/capabilities` `/inspect` `/clean`. `anthropies serve` defaults to `127.0.0.1:8765`. No `/humanize`.

- [[Wave 2 Task 2 Implementer Note]] — OpenAPI + serve implementer thoughts
- [[Wave 2 Task 2 Style Auditor]] — STYLE APPROVE; 0 blockers; 2 nits (eslint `http` carve-out, OpenAPI `as`)
- [[Wave 2 Task 2 QA Auditor]] — QA APPROVE; named OpenAPI + serve-help checks pass
- [[Wave 2 Task 2 Docs Auditor]] — DOCS APPROVE; honesty; 0.3.0; serve --help; no official-kill

## Task 3 (Skill HTTP path)

`skills/purge-anthropies/SKILL.md` prefers `ANTHROPIES_SERVICE_URL` (default `http://127.0.0.1:8765`). Health-check first. curl `POST /inspect` and `POST /clean` with base64. `npx anthropies` is the local fallback. README version `0.3.0` documents `anthropies serve`.

- [[Wave 2 Task 3 Implementer Note]] — skill HTTP client path implementer thoughts

## Task 4 (Docker + compose)

Node 22 image runs `node dist/cli.js serve --host 0.0.0.0 --port 8765`. `compose.yaml` maps `127.0.0.1:8765:8765`. No qpdf/exiftool/c2patool. Version `0.3.0`.

- [[Wave 2 Task 4 Implementer Note]] — Docker + compose implementer thoughts

## Task 5 (GitHub CI)

`.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm build` on `ubuntu-latest` and `windows-latest`. Node 22. Push/PR to `main`.

- [[Wave 2 Task 5 Implementer Note]] — GitHub Actions CI implementer thoughts
