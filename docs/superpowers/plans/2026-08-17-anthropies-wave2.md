# Anthropies Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED: 1 Grok implementer per task, then 3 grok-4.6 auditors (STYLE, QA, DOCS). Wiki notes in `knowledge/`. Use subagent-driven-development.

**Goal:** Local HTTP inspect/clean service, OpenAPI, Docker, CI.

**Architecture:** `@effect/platform` HttpServer wraps Wave 1 `Inspector` and `Cleaner`. Loopback default. Report schema unchanged.

**Tech Stack:** Effect 3, `@effect/platform-node` HttpServer, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-17-anthropies-wave2-design.md`

## Global Constraints

- Version `0.3.0`.
- Same honesty / CLAIMS.md / four channels as Wave 1.
- No `/humanize` HTTP. No MarkLLM/pixel.
- `ANTHROPIES_SERVER_API_KEY`, `ANTHROPIES_SERVICE_URL`.
- Forbidden: `node:http`, `node:fs`, official-kill claims.

---

### Task 1: HTTP inspect/clean

**Files:**
- Create: `src/http/server.ts`, `src/http/schema.ts`
- Create: `tests/http-server.test.ts`
- Modify: `package.json` version `0.3.0`

**Produces:**
- `export const HttpApp: Layer` serving:
  - `GET /health` → `{ ok: true, version: "0.3.0" }`
  - `GET /capabilities` → version + tools present
  - `POST /inspect` `{ file, name, options?: { forceText } }` → `{ ok, kind, report }`
  - `POST /clean` same + `{ cleaned }` base64
- Bearer required iff `ANTHROPIES_SERVER_API_KEY` set. Missing/wrong key → 401.
- Input size cap 256 MiB (decode fail → 400).
- Honesty stanza remains on `report.honesty`.

- [ ] Write failing `tests/http-server.test.ts` that boots the app in-process, POSTs `fixtures/layer-a/trailer-claude.txt` as base64, expects `report` with deterministic present and official unavailable.
- [ ] Run to fail.
- [ ] Implement server using Wave 1 services on bytes (write temp via FileSystem or add inspectBytes if cheaper — prefer bytes-in helper over disk if Inspector already needs a path: write scoped temp).
- [ ] `pnpm test` green.
- [ ] Wiki note + 3 auditors + commit `feat: HTTP inspect and clean service`

### Task 2: OpenAPI + serve CLI

**Files:** `src/http/openapi.ts`, modify `src/cli.ts` (`serve`), `GET /openapi.json`

- [ ] Failing test: GET `/openapi.json` is OpenAPI 3.0.3 with paths `/health` `/inspect` `/clean`.
- [ ] `anthropies serve --host 127.0.0.1 --port 8765`
- [ ] Wiki + trio + commit

### Task 3: Skill HTTP path

**Files:** `skills/purge-anthropies/SKILL.md`

- [ ] Document `ANTHROPIES_SERVICE_URL`, curl examples, health-check first, no official-kill.
- [ ] Keep `npx anthropies` as local fallback.
- [ ] Wiki + trio + commit

### Task 4: Docker + compose

**Files:** `Dockerfile`, `compose.yaml`, `.dockerignore`

- [ ] Image runs `node dist/cli.js serve --host 0.0.0.0 --port 8765`
- [ ] compose maps `127.0.0.1:8765:8765`
- [ ] Wiki + trio + commit

### Task 5: GitHub CI

**Files:** `.github/workflows/ci.yml`

- [ ] `pnpm test` + `pnpm build` on ubuntu-latest and windows-latest
- [ ] Wiki + trio + commit
- [ ] Full-diff trio before calling Wave 2 done
