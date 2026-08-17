# Wave 2 Task 2 implementer note (OpenAPI + serve CLI)

Date: 2026-08-17
Role: implementer
Task: OpenAPI document and `anthropies serve`

## What I changed

- Created `src/http/openapi.ts`: static OpenAPI 3.0.3 document plus `defaultServeHost` (`127.0.0.1`) and `defaultServePort` (`8765`).
- Document paths: `GET /health`, `GET /capabilities`, `GET /openapi.json`, `POST /inspect`, `POST /clean`. No `/humanize`. Info description states the service does not humanize and does not claim official-detector failure. Bearer is optional and required only when `ANTHROPIES_SERVER_API_KEY` is set.
- Wired `GET /openapi.json` on the existing `HttpRouter` in `src/http/server.ts`. Same `authorize` middleware as the other routes.
- Added `anthropies serve --host --port` in `src/cli.ts`. Defaults are loopback `127.0.0.1:8765`. Remote bind requires an explicit `--host`. Process owns FileSystem via `HttpApp` + `NodeHttpServer.layer(createServer, { host, port })`.
- Bumped `CliCommand.run` version from `0.2.0` to `0.3.0` (package was already `0.3.0` in Task 1).
- eslint: `src/cli.ts` may import `node:http` so `NodeHttpServer.layer` can receive `createServer`. The HTTP layer (`src/http/server.ts`) still does not import `node:http`.
- Tests: `GET /openapi.json` is 3.0.3 with `/health` `/capabilities` `/inspect` `/clean` and no `/humanize`. `serve --help` documents the loopback defaults.

## Why

Wave 2 family 2 is the discoverability and process-ownership surface Task 1 deferred. The skill/host can read `/openapi.json` and the operator starts the same `HttpApp` with `anthropies serve` without writing a Node script. CLI remains the default entry; serve is the long-running owner of Inspector/Cleaner.

## Residual risks

- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- Effect CLI help does not print `Options.withDefault` values. Defaults are restated in the option descriptions so `--help` names `127.0.0.1` and `8765`.
- `createServer` lives in `cli.ts` only. Docker Task 4 will pass `--host 0.0.0.0`; that is an explicit remote bind, not a default change.
- README still says version `0.2.0` and CLI-only. `docs/CLAIMS.md` CLI help list has no `serve` row. Out of this task's file list.
- OpenAPI `report` schema is intentionally loose (`additionalProperties: true`). Honesty is described, not re-encoded. Wave 1 Report remains the source of truth.
- `/openapi.json` sits behind the same bearer gate as `/health`. Discoverability vs auth consistency; spec did not carve it out.

## Almost did, did not

- Almost rewrote the router as `@effect/platform` HttpApi to generate OpenAPI. Did not. Effect's `OpenAPISpec` is 3.1.0; the spec locks 3.0.3. Static document matches the live routes.
- Almost added `/humanize`. Did not. Spec: humanize stays CLI-only.
- Almost claimed official-kill or mixed a score into the document. Did not.
- Almost imported `node:http` in `src/http/server.ts`. Did not. Bind stays in the CLI.
- Almost started a live bind test on a random port. Did not. Help + in-process `/openapi.json` cover the brief. Task 4 can exercise `0.0.0.0`.
- Almost dispatched STYLE/QA/DOCS subagents. Parent: do not dispatch.
