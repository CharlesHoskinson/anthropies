# Wave 2 full-branch QA auditor note

Date: 2026-08-17
Role: QA
Scope: Full branch `feat/wave2-service` vs Wave 2 design §2 (merge gate)
Verdict: APPROVE
Diff: `origin/main...HEAD` (`2d9b31a...1660c145`)
Review: `.superpowers/sdd/2026-08-17-anthropies-wave2/review-full-origin-main.diff`

## Checks (this persona)

| Check | Result |
|---|---|
| Routes: GET /health /capabilities /openapi.json; POST /inspect /clean; no POST /humanize | PASS |
| Payloads: JSON { file: base64, name, options? } → { ok, kind, report, cleaned? } | PASS |
| Loopback default 127.0.0.1:8765 | PASS |
| Optional API key ANTHROPIES_SERVER_API_KEY → Authorization Bearer | PASS |
| OpenAPI matches routes | PASS |
| tests/http-server.test.ts covers routes; tests/serve-cli.test.ts covers loopback help | PASS |
| Docker CMD serve --host 0.0.0.0 --port 8765; compose 127.0.0.1:8765:8765; no heavy backends | PASS |
| CI pnpm test + pnpm build on ubuntu + windows | PASS |
| Raster honesty: 89cef71 present; unparsed rasters not-applicable, not certified absent | PASS |
| Official unavailable unless ANTHROPIC_DETECT_URL | PASS |
| Tests green | PASS (parent: 51 passed + build green; 51 `it` cases re-read) |

## Surfaces

- Router (`src/http/server.ts`): `GET /health`, `GET /capabilities`, `GET /openapi.json`, `POST /inspect`, `POST /clean`. Comment and tree: no `/humanize`. `HttpApp` provides `Inspector.Default` + `Cleaner.Default` only — no `Humanizer`. CLI `humanize` stays a subcommand (correct).
- Payloads: `FileRequest` is `{ file, name, options?: { forceText } }`. Inspect encodes `{ ok, kind, report }`. Clean encodes `{ ok, kind, report, cleaned }` with `Uint8ArrayFromBase64`. Named test POSTs `fixtures/layer-a/trailer-claude.txt` as base64; clean returns base64 without `noreply@anthropic.com`.
- Loopback: `defaultServeHost = "127.0.0.1"`, `defaultServePort = 8765`. `src/cli.ts` `Options.withDefault`. OpenAPI `servers[0].url` is `http://127.0.0.1:8765`. `tests/serve-cli.test.ts` asserts `serve --help` names `--host`, `127.0.0.1`, `--port`, `8765`.
- Bearer: `serverApiKey = Config.option(Config.redacted("ANTHROPIES_SERVER_API_KEY"))`. Unset or empty → open. Set → `Authorization` must equal `Bearer ${key}` else 401 `{ ok: false, error: "unauthorized" }`. `KeyedLive` covers missing / wrong / valid on `/health`.
- OpenAPI: `openapi: "3.0.3"`; paths `/health` `/capabilities` `/openapi.json` `/inspect` `/clean`; `paths` has no `/humanize`. Live `GET /openapi.json` in `http-server.test.ts` asserts the same.
- Docker: runtime `CMD ["node", "dist/cli.js", "serve", "--host", "0.0.0.0", "--port", "8765"]`. In-container bind is `0.0.0.0` so compose publish works. `compose.yaml` ports `"127.0.0.1:8765:8765"` — not a LAN bind. No apt / qpdf / exiftool / c2patool. `read_only: true` + `tmpfs: /tmp`. Image `anthropies:0.3.0`.
- CI: only workflow `.github/workflows/ci.yml`. `push` + `pull_request` → `main`. Matrix `ubuntu-latest` + `windows-latest`. Node 22. `pnpm install --frozen-lockfile` → `pnpm test` → `pnpm build`. No `pnpm test:live`. No heavy backends.
- Raster honesty: `89cef7189f7f8d3ab1fca094d88c42f36c00c481` (`fix: do not certify C2PA absent on unparsed rasters`) is on `main` between Wave 1 and `2d9b31a`. Branch merged `origin/main` at `4ee58e14`. `inspectRasterBytes` / `stripRasterBytes` return `applicable: false` for gif/webp/avif/heic. `makeRasterReport` maps that to Finding `degraded`, honesty `c2pa: not-applicable`, `report.degraded: true`. Never `c2pa: absent`. `cert_c2pa_unparsed_raster` locks webp/avif/heic.
- Official: every `Reporter` builder hard-codes `OfficialUnavailable`. No `"score"` on encode. Honesty: `unavailable (ANTHROPIC_DETECT_URL unset)` + does-not-prove official detector / human-written. Capabilities `officialDetect` is `Option.isSome(ANTHROPIC_DETECT_URL)` — a presence bit, not a live adapter. HTTP tests assert official `unavailable` and no `"score"`.
- Tests: 51 `it`/`it.scoped` cases in `tests/`. Wave 2 named files: `http-server.test.ts` (10) + `serve-cli.test.ts` (1). Parent recorded `pnpm test` 51 passed and `pnpm build` green after the main merge. This auditor re-read the tests and product sources; no shell to re-run.

## Findings

BLOCKER: none. None of the hard fail conditions are met (missing route, `/humanize` exists, LAN compose publish, tests red, raster still certifies absent on WebP, official-kill claim).

MAJOR: none.

NIT: 256 MiB HTTP 400 is not hit; only the helper with `cap=1`. Invalid-base64 400 is HTTP-level.

NIT: No assertion that `POST /humanize` is absent. `HttpRouter.catchAll` would map unknown routes to 400, not run Layer B.

NIT: Bearer 401/200 only exercised on `GET /health`. `authorize` wraps the whole router.

NIT: `officialDetect` is URL-set, not adapter-live. URL-set would advertise a scorer inspect/clean do not run. Disclosed since Task 1.

NIT: serve default is help-tested, not live-bound.

NIT: unpinned action SHAs; no `workflow_dispatch`; Windows matrix unproven until first Actions run.

NIT: GIF shares the unparsed raster path but is not named in `cert_c2pa_unparsed_raster`.

## Not done (correct)

Wave 3 Layer B leapfrog. HTTP `/humanize`. Multipart. TLS. Remote bind except explicit `--host`. Installing qpdf/exiftool/c2patool in the image or on CI. Official adapter beyond the URL presence bit. MarkLLM / pixel / CtrlRegen / directory crawl.
