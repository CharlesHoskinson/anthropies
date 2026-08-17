# Wave 2 PR #7 independent Grok merge review

Date: 2026-08-17
Role: independent Grok 4.6 merge review
PR: https://github.com/CharlesHoskinson/anthropies/pull/7
Branch: feat/wave2-service
Worktree: /home/charles/repos/anthropies/.worktrees/feat-wave2-service
Base: origin/main
HEAD: 809a02e (plugin 0.3.0 + full-diff audit ingest)
Spec: docs/superpowers/specs/2026-08-17-anthropies-wave2-design.md
Plan: docs/superpowers/plans/2026-08-17-anthropies-wave2.md
Verdict: MERGE

Did not modify product source. Did not commit. Did not push. Did not post a GitHub review.

Prior Task 1–5 STYLE/QA/DOCS APPROVE. Full-diff STYLE/QA/DOCS APPROVE. Parent ran `pnpm test` (51 passed) and `pnpm build` (green) after merging origin/main (includes 89cef71). This pass re-read the tree.

## Hard blockers (fail = hold)

| Check | Result |
|---|---|
| POST /humanize exists | PASS — router + OpenAPI + test: no /humanize. HttpApp is Inspector+Cleaner only. CLI humanize stays. |
| Compose publishes LAN (8765:8765 without 127.0.0.1) | PASS — `"127.0.0.1:8765:8765"`. In-container 0.0.0.0 is the namespace bind. |
| official-kill / destamp / undetectable as a capability | PASS — OpenAPI/CLI/skill/CLAIMS deny. OfficialUnavailable. Honesty denials stay. Tests reject undetectable / watermark removed. |
| CI missing ubuntu or windows, or missing pnpm test / pnpm build | PASS — ci.yml ubuntu-latest + windows-latest; frozen-lockfile, test, build; Node 22. |
| raw express/fastify/hono instead of @effect/platform HttpServer | PASS — HttpRouter + HttpServer.serve. createServer is NodeHttpServer factory only. |
| unparsed rasters certified c2pa absent (89cef71 must be present) | PASS — 4ee58e1 merged origin/main. applicable:false → degraded / c2pa: not-applicable. cert_c2pa_unparsed_raster locks webp/avif/heic. |
| Effect 4 | PASS — package + lockfile effect@3.22.1. Frozen lockfile. |

## Surfaces I actually re-read

- `src/http/server.ts` — GET health/capabilities/openapi; POST inspect/clean; Bearer iff key; decode + 256 MiB cap; scoped temp basename; Fail → 400; no Humanizer.
- `src/http/openapi.ts` / `schema.ts` — OpenAPI 3.0.3; serviceVersion 0.3.0; defaultServeHost 127.0.0.1:8765; officialDetect “Not a score.”
- `src/cli.ts` — serve Options.withDefault; createServer only as layer factory; help: does not humanize; never claims official text-kill.
- `compose.yaml` + `Dockerfile` — loopback publish; slim Node 22; no qpdf/exiftool/c2patool; read_only + tmpfs /tmp; USER node; image anthropies:0.3.0.
- `.github/workflows/ci.yml` — only workflow; push/PR main; ubuntu+windows; pnpm test then build.
- Raster honesty — `raster.ts` `applicable: false` for unparsed; `c2pa.ts` Finding degraded; `reporter.ts` `makeRasterReport` honesty `not-applicable`.
- Skill — ANTHROPIES_SERVICE_URL default http://127.0.0.1:8765; curl -sS -f /health first; no invented success; npx fallback; no HTTP /humanize.
- plugin.json now 0.3.0 (closes the full-docs NIT on version). Description dropped “(once implemented)” for C2PA — C2PA family is on the tree.
- package.json / pnpm-lock.yaml — effect 3.22.1, not 4.

## Findings

BLOCKER: none
MAJOR: none

NIT: writeUpload remaps PlatformError → DecodeError (wrong Fail tag; still 400).
NIT: catchHttpFail duck-types _tag via a string Set.
NIT: 256 MiB HTTP 400 is helper-only; no live POST /humanize absence assertion; Bearer only tested on /health.
NIT: officialDetect is URL presence, not adapter liveness. Reporter still hard-codes OfficialUnavailable.
NIT: serve defaults help-tested, not live-bound. Unpinned action SHAs / slim digest. Windows matrix unproven until first Actions run.
NIT: GIF unparsed path not named in cert_c2pa_unparsed_raster.
NIT: README command×channel table omits serve. CLAIMS plugin sentence still says “(once implemented)”. Manifesto paraphrases undetectable outside the quotation (Wave 1 leftover; keep manifesto).

## Not a hold

In-container 0.0.0.0 is not a LAN publish. createServer is the platform adapter. HEALTHCHECK fetch is image-local, not a src/ forbidden import. Static OpenAPI 3.0.3 is what the spec locked. Wave 3 Layer B / multipart / TLS stay out.

## Conclusion

Independent merge review agrees with the family and full-diff trios. Hard-blocker table is all PASS. **MERGE.**
