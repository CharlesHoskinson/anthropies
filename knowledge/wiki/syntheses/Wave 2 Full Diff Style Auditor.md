---
type: synthesis
aliases: ["Wave 2 full style auditor", "Wave 2 Full Diff Style Auditor"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 1 Full Style Audit]]"
  - "[[Wave 2 Full Diff QA Auditor]]"
  - "[[Wave 2 Full Diff Docs Auditor]]"
  - "[[Wave 2 Task 1 Style Auditor]]"
  - "[[Wave 2 Task 5 Style Auditor]]"
provenance: "knowledge/raw/notes/2026-08-17-wave2-full-style.md"
diff: "origin/main...HEAD"
---

# Wave 2 Full Diff Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 3.

Full branch `origin/main...HEAD` holds the Wave 2 STYLE hard gate: Effect 3.22.1 (not 4), ESM Node 22, version `0.3.0`. HTTP is `@effect/platform` `HttpRouter` + `HttpServer.serve`, not express/fastify/hono. `createServer` is only the `NodeHttpServer.layer` adapter. Routes are GET `/health` `/capabilities` `/openapi.json` and POST `/inspect` `/clean`. No POST `/humanize`. `anthropies serve` defaults to `127.0.0.1:8765`; remote bind needs `--host`. One `node:22-bookworm-slim` image; compose publishes `127.0.0.1:8765:8765`; no qpdf / exiftool / c2patool / MarkLLM / pixel. CI runs `pnpm test` then `pnpm build` on `ubuntu-latest` + `windows-latest` for push/PR to `main`. No `node:fs` / `process.env` / `fetch` / `Effect.runPromise` / `any` / default exports in `src/`. Fails stay TaggedError → 400; Findings stay on 200 Report. Official stays unavailable unless `ANTHROPIC_DETECT_URL`. Skill prefers `ANTHROPIES_SERVICE_URL`, health-checks first, and does not invent HTTP success.

Nits: temp write remapped to `DecodeError`; `catchHttpFail` duck-types `_tag`; unused `HealthResponse` / OpenAPI `as` / eslint bare-`http` carve-out. Family nits (`cap_drop`, unpinned action SHAs, unpinned slim digest) do not become blockers. None block [[Wave 2 Implementation]].

See per-family [[Wave 2 Task 1 Style Auditor]] through [[Wave 2 Task 5 Style Auditor]], plus [[Wave 2 Full Diff QA Auditor]] and [[Wave 2 Full Diff Docs Auditor]].
