# Anthropies Wave 2 Design

**Date:** 2026-08-17  
**Status:** Approved to implement (locked Wave 1 strategy: feature-parity surface)  
**Version this wave ships:** 0.3.0  
**Depends on:** Wave 1 on `main` (`docs/superpowers/specs/2026-08-16-anthropies-wave1-design.md`)

## 1. Goal

Add the WR parity surface Wave 1 deferred: a local HTTP service, OpenAPI, Docker, and CI. The skill may drive inspect/clean over HTTP so the agent host needs no Python and no local Node beyond `curl`. The CLI remains the default; `anthropies serve` is the process that owns FileSystem.

## 2. Locked

- Same Effect 3 stack. Same Report schema, Fail≠Finding, four unmixed channels, honesty stanza.
- Bind loopback by default (`127.0.0.1:8765`).
- Optional `ANTHROPIES_SERVER_API_KEY` → require `Authorization: Bearer`.
- Payloads: JSON `{ file: base64, name, options? }` → `{ ok, kind, report, cleaned? }` where `cleaned` is base64.
- Routes: `GET /health`, `GET /capabilities`, `GET /openapi.json`, `POST /inspect`, `POST /clean`.
- `/clean` does **not** run Layer B. Humanize stays CLI-only this wave.
- No MarkLLM, pixel, CtrlRegen, directory crawl.
- Official adapter still `unavailable` unless `ANTHROPIC_DETECT_URL` is set.
- Forbidden imports unchanged. HTTP layer uses `@effect/platform` HttpServer, not raw `node:http`.
- Skill: prefer `ANTHROPIES_SERVICE_URL` (default `http://127.0.0.1:8765`). If health fails, say so; do not invent a local fallback that contradicts the operator.
- CI: GitHub Actions `pnpm test` + `pnpm build` on push/PR (ubuntu + windows).
- Docker: one core image, `8765`, read-only root + tmpfs if easy, no heavy backends.

## 3. Architecture

```
curl / skill
    │
    ▼
HttpServer  GET /health|/capabilities|/openapi.json
            POST /inspect|/clean
    │
    ▼
decode base64 → temp or bytes → Inspector | Cleaner (Wave 1 services)
    │
    ▼
Report JSON + optional cleaned base64
```

`serve` is a CliCommand. Live layer: `Inspector.Default` + `Cleaner.Default` + `HttpServer`.

Capabilities report: `{ version, tools: { qpdf, exiftool, c2patool }, scorers: { officialDetect: boolean } }`.

## 4. Families

1. HTTP server + tests (`tests/http-server.test.ts`)
2. OpenAPI document matches routes
3. `anthropies serve` CLI
4. Skill HTTP client path
5. Dockerfile + compose.yaml
6. `.github/workflows/ci.yml`

Same 1 implementer + 3 Grok 4.6 auditors per family. Wiki notes required.

## 5. Out of scope

Wave 3 Layer B leapfrog. Remote bind except explicit `--host`. Multipart uploads. TLS.
