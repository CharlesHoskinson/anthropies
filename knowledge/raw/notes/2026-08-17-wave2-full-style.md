# Wave 2 FULL-BRANCH STYLE auditor note

Date: 2026-08-17
Role: STYLE (TypeScript/Effect style)
Scope: Full branch `origin/main...HEAD` (`review-full-origin-main.diff`). Focus: `src/`, `tests/`, `package.json`, Docker, CI, skill.
Base: `origin/main` = `2d9b31a`
HEAD: `feat/wave2-service` (includes merge of `origin/main`; raster fix `89cef71` is present on main, not a Wave 2 product delta)
Spec: `docs/superpowers/specs/2026-08-17-anthropies-wave2-design.md` §2 / §3
Plan: `docs/superpowers/plans/2026-08-17-anthropies-wave2.md`

Prior: Tasks 1–5 STYLE/QA/DOCS all APPROVE. This pass is the whole Wave 2 surface.

## Verdict

**APPROVE**

- BLOCKER: 0
- MAJOR: 0
- NIT: 3

## STYLE gate (full branch)

Style fails on Effect 4, forbidden imports in `src/` (except the `NodeHttpServer` `createServer` adapter), Fail/Finding mix, raw `node:http` as the app server, express/fastify/hono, HTTP `/humanize`, destamp / official-kill / undetectable as a capability, LAN compose publish, heavy backends, missing CI OS or `pnpm test`/`pnpm build`, or a skill that invents HTTP success.

Nits from family trios (`cap_drop`, unpinned action SHAs, unpinned slim digest) do not become blockers.

| Check | Result | Cite |
|---|---|---|
| Effect 3, not 4. ESM Node 22. Version 0.3.0 | PASS | `package.json:2,5,9-10,26` `0.3.0`, `"type": "module"`, `node: ">=22"`, `effect@^3.22.1`. Lockfile pins `effect@3.22.1`. `tsconfig.json` `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `NodeNext`, `verbatimModuleSyntax`. `cli.ts:178` `CliCommand.run` version `0.3.0`. `schema.ts:8` `serviceVersion = "0.3.0"`. Compose image `anthropies:0.3.0`. |
| `@effect/platform` HttpServer, not raw `node:http` as the app server | PASS | `src/http/server.ts:1-6,174-188` `HttpRouter` + `HttpServer.serve`. No express/fastify/hono. Tests `NodeHttpServer.layerTest` (`http-server.test.ts:11-14`). `cli.ts:6,163-165` imports `createServer` only as `NodeHttpServer.layer(createServer, { host, port })`. No `listen`, no `IncomingMessage`/`ServerResponse`. HTTP layer has zero `node:http`. |
| Routes: GET `/health` `/capabilities` `/openapi.json`, POST `/inspect` `/clean`. No POST `/humanize` | PASS | `server.ts:175-180`. `openapi.ts:89-211` OpenAPI `3.0.3` same paths. Test asserts `not.toHaveProperty("/humanize")` (`http-server.test.ts:80`). CLI `humanize` stays (`cli.ts:104-133,175`). `HttpApp` provides `Inspector.Default` + `Cleaner.Default` only (`server.ts:185-188`). |
| Bind loopback `127.0.0.1:8765`. Remote bind requires explicit `--host` | PASS | `openapi.ts:4-7` `defaultServeHost` / `defaultServePort`. `cli.ts:148-158` `Options.withDefault` + “Remote bind requires an explicit `--host`.” `serve-cli.test.ts:19-31` help names `127.0.0.1` and `8765`. |
| Docker: one core slim image; compose publishes `127.0.0.1:8765:8765`; no heavy backends | PASS | `Dockerfile:4,18` `node:22-bookworm-slim` build + runtime. No apt. `pnpm prune --prod`. `CMD ["node", "dist/cli.js", "serve", "--host", "0.0.0.0", "--port", "8765"]`. `compose.yaml:8-10` image `anthropies:0.3.0`, ports `"127.0.0.1:8765:8765"`. No qpdf / exiftool / c2patool / MarkLLM / pixel. `read_only` + `/tmp` tmpfs. `USER node`. |
| CI: `pnpm test` + `pnpm build` on ubuntu-latest + windows-latest, push/PR to `main` | PASS | `.github/workflows/ci.yml` only workflow. `on.push` + `on.pull_request` to `main`. Matrix `ubuntu-latest` + `windows-latest`. Node 22. pnpm `11.22.0` matches Docker `corepack prepare pnpm@11.22.0`. `pnpm install --frozen-lockfile`, then test, then build. No live-capture / official-detect / heavy-backend install. |
| Forbidden imports in `src/` (except `createServer` adapter) | PASS | `rg` over `src/`: no `node:fs` / `fs/promises` / `process.env` / `fetch(` / `Effect.runPromise` / `as unknown as` / `export default`. `any` only as a comment in `config.ts:36` (“Never read process.env”). `createServer` from `node:http` is the documented adapter. Env knobs are `Config` (`config.ts:12-15,36-46`). Temps are `FileSystem.makeTempDirectoryScoped` (`server.ts:65-73`). eslint locks the set (`eslint.config.js:3-61`) with a `src/cli.ts` carve-out for `node:http`. |
| Fail ≠ Finding | PASS | Seven `Schema.TaggedError` Fails in `fail.ts`. HTTP maps `BinaryInput` / `DecodeError` / `InputTooLarge` / `WriteGuard` / `OriginBlocked` → 400 (`server.ts:80-104`). Findings stay on 200 `InspectResponse` / `CleanResponse`. Missing tools stay `degraded` Findings, not 400. CLI `failTags` → exit 2; `ResidualHits` is CLI-only exit 1. |
| Official unavailable unless `ANTHROPIC_DETECT_URL`. No destamp / official-kill / undetectable as a capability | PASS | Reporter still emits `OfficialUnavailable` (`reporter.ts:68-73,114,173`). `capabilities.scorers.officialDetect` is `Option.isSome(ANTHROPIC_DETECT_URL)` — a presence bit, not a score (`server.ts:125-131`, `openapi.ts:152-154`). OpenAPI / skill / CLI / compose deny official-kill and HTTP `/humanize`. |
| Skill prefers `ANTHROPIES_SERVICE_URL`; health-check first; no invented local fallback | PASS | `SKILL.md:26-47` default `http://127.0.0.1:8765`; `curl -sS -f` `/health` first; “If health fails, say so. Do not invent a successful HTTP result.” Operator-required → stop. Else `npx anthropies` / `node dist/cli.js`. No `src/` / Effect / secret leak. |

## Findings

### BLOCKER

None.

### MAJOR

None.

### NIT

1. **`src/http/server.ts:69-70`** — temp `writeFile` `PlatformError` is remapped to `DecodeError`. Wave 1 §9.1 `DecodeError` is truncated image / zip bomb / over budget / undecodable container. A scoped-temp write fail is not a decode. Still a Fail (not a Finding). HTTP 400 is right; the tag is a lie. Same residual as Task 1.

2. **`src/http/server.ts:81-104`** — `catchHttpFail` duck-types `_tag` via `tagOf` + a string `Set`, not `Effect.catchTags`. Fail set is stringly. Unknown errors become 400 `bad_request`. Does not mix Finding onto the error path. Same residual as Task 1.

3. **Encode / lint leftovers** — `HealthResponse` is unused on the encode path (`schema.ts:50-53`; health is `unsafeJson` at `server.ts:117`). OpenAPI test asserts `body as { openapi, paths }` (`http-server.test.ts:71-74`), not `Schema.decodeUnknownSync`. Not the forbidden `as unknown as`. `eslint.config.js:65-71` `src/cli.ts` carve-out also allows unused bare `http`; the used import is only `node:http` `createServer`.

## Not defects

- `createServer` in `cli.ts` is the official `@effect/platform-node` bind factory. Plan “Forbidden: node:http” means no raw HTTP layer; spec §2 is the tighter wording. `HttpApp` stays platform-only.
- Family nits do not become blockers: unpinned `actions/checkout@v4` / `pnpm/action-setup@v4` / `actions/setup-node@v4` SHAs; unpinned `node:22-bookworm-slim` digest; compose omits `cap_drop: [ALL]` / `no-new-privileges`.
- `--host 0.0.0.0` in Docker `CMD` is the in-container namespace bind. Compose publish list keeps it off the LAN.
- Dockerfile HEALTHCHECK uses Node `fetch` inside the image (no curl in slim). Not a `src/` forbidden import.
- `capabilities.scorers.officialDetect` is URL-presence, not a wired adapter. Inspect/clean still emit `OfficialUnavailable`. Presence bit, not a Fail/Finding mix and not official-kill.
- Static OpenAPI 3.0.3 instead of Effect `HttpApi` 3.1. Spec locks 3.0.3.
- `/openapi.json` shares the bearer gate. Spec did not carve it out.
- Raster fix `89cef71` is on `origin/main`. Not in the Wave 2 product delta. `src/formats/raster.ts` has no forbidden imports.
- Wave 1 residuals (no first-class `Test` layers; inspect/clean inferred `R` unions format branches; `Partial<Record>` dispatch) are unchanged and out of this wave’s hard gate.
- `docs/CLAIMS.md` now has a `serve` row. Family notes that reserved this for later are closed.
- `process.argv` only at `CliCommand.run` (`cli.ts:223`). `Console.error` for serve listen line and residual notes. Allowed.

## Closed family residuals (STYLE)

Tasks 1–5 STYLE all APPROVE. Carry-forward nits above still exist and stay nits. Infra nits (`cap_drop`, unpinned SHAs/digest) stay nits.

## Out of this audit

- QA of live bind / first GitHub Actions Windows run.
- DOCS of plugin `0.2.0` / README command×channel table omitting `serve` (full-diff DOCS already APPROVE).
- Wiring an official adapter when `ANTHROPIC_DETECT_URL` is set.

## Conclusion

Full Wave 2 surface matches spec §2 / §3 and the STYLE hard gate: Effect 3, platform HttpServer, locked routes and no `/humanize`, loopback default, one slim image with loopback compose, CI on ubuntu+windows, no forbidden `src/` imports, Fail≠Finding, official stays unavailable, skill health-checks first. APPROVE.
