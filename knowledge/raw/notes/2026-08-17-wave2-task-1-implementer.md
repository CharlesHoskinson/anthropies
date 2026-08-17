# Wave 2 Task 1 implementer note (HTTP inspect/clean)

Date: 2026-08-17
Role: implementer
Task: HTTP inspect/clean service

## What I changed

- Bumped `package.json` to `0.3.0`. CLI `run(..., { version })` stays `0.2.0` until Task 2 adds `serve`.
- Added `serverApiKey` (`Config.option(Config.redacted("ANTHROPIES_SERVER_API_KEY"))`) to `src/config.ts` / `appConfig`. Library code still does not read `process.env`.
- Created `src/http/schema.ts`: request/response Schemas, `serviceVersion`, `decodeRequestFile` (256 MiB decoded cap, invalid base64 → `DecodeError`, over-cap → `InputTooLarge`).
- Created `src/http/server.ts`: `@effect/platform` `HttpRouter` + `HttpServer.serve`. Exported `router` and `HttpApp` Layer wrapping Wave 1 `Inspector.Default` + `Cleaner.Default`.
- Routes: `GET /health` `{ ok: true, version: "0.3.0" }`; `GET /capabilities` `{ version, tools: { qpdf, exiftool, c2patool }, scorers: { officialDetect } }`; `POST /inspect` `{ ok, kind, report }`; `POST /clean` same + `{ cleaned }` base64. No `/humanize`. No `/openapi.json` (Task 2).
- Bearer required iff `ANTHROPIES_SERVER_API_KEY` is set and non-empty. Missing/wrong key → 401 `{ ok: false, error: "unauthorized" }` on every route, including health.
- Decoded input over 256 MiB or invalid base64 → 400. Fails (`BinaryInput`, `DecodeError`, `InputTooLarge`, `WriteGuard`) → 400. Inspector/Cleaner see a scoped temp file via `FileSystem.makeTempDirectoryScoped`.
- `report.honesty` is the Wave 1 stanza unchanged. Official finding stays `unavailable`. No score field.
- Tests: `tests/http-server.test.ts` boots `HttpApp` in-process via `NodeHttpServer.layerTest`. Trailer fixture as base64 → deterministic `present`, official `unavailable`. Also health, capabilities, clean, 401, invalid base64, cap helper.

## Why

Wave 2 family 1 is the HTTP parity surface Wave 1 deferred. The skill/host can inspect and clean over loopback without Python and without a local Node beyond `curl` once Task 2/3 land. CLI remains the default; this Layer is what `serve` will own.

## Residual risks

- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- `capabilities.scorers.officialDetect` is `true` when `ANTHROPIC_DETECT_URL` is set, but Wave 1 reporters still hardcode `OfficialUnavailable`. Honest: the adapter is not wired on inspect/clean.
- `HttpApp` requires an `HttpServer` implementation. Tests use `NodeHttpServer.layerTest`. Task 2 must bind loopback without importing `node:http` in library code (eslint forbids it).
- Cleaner still `writeAtomic`s the scoped temp (in-place). Extra disk I/O, cleaned up with the request Scope.
- Auth uses string compare on the bearer, not constant-time. Local loopback service.
- CLI help/version still `0.2.0`. README/skill still describe CLI-only. Task 2/3.

## Almost did, did not

- Almost added `inspectBytes` / `cleanBytes` on Inspector/Cleaner. Did not. Brief: prefer scoped temp if they need a path.
- Almost added `GET /openapi.json` and `anthropies serve`. Did not. Task 2.
- Almost added `/humanize`. Did not. Spec: humanize stays CLI-only.
- Almost claimed official-kill or mixed a score. Did not. Honesty stanza is pass-through.
- Almost used `node:http` or `process.env`. Did not. `HttpRouter` / `HttpServer` / `Config` only.
- Almost dispatched STYLE/QA/DOCS subagents. Parent: do not dispatch.
