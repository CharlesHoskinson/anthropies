# Log

Append-only. One line per event: `## [YYYY-MM-DD] <op> | <title>`.

## [2026-08-17] init | Anthropies Wave 1 Wiki
- Created wiki skeleton.
- Domain: Wave 1 implementation notes and auditor thoughts.

## [2026-08-17] ingest | Task 1 implementer note

## [2026-08-17] ingest | Task 1 auditor trio
- STYLE, QA, DOCS all APPROVE (0 blockers).

## [2026-08-17] ingest | Task 2 implementer note
## [2026-08-17] ingest | Task 2 auditor trio
- STYLE, QA, DOCS all APPROVE.

## [2026-08-17] ingest | Task 3 implementer note

## [2026-08-17] ingest | Task 3 docs auditor
- DOCS APPROVE (0 blockers). Honesty stanza required; no watermark-removed verdict.

## [2026-08-17] ingest | Task 3 QA auditor
- QA APPROVE (0 blockers). Named tests, trailer exit 1, PNG BinaryInput no-write, --json parseable.
## [2026-08-17] ingest | Task 3 auditor trio
- STYLE, QA, DOCS all APPROVE.

## [2026-08-17] ingest | Task 4 implementer note

## [2026-08-17] ingest | Task 4 docs auditor
- DOCS APPROVE (0 blockers). No official-kill; print-prompt does not say watermark removed; CLI help still honest.

## [2026-08-17] ingest | Task 4 style auditor
- STYLE APPROVE (0 blockers). originBlocked pure; Humanizer Effect.Service; no HttpClient in default path; OriginBlocked TaggedError.

## [2026-08-17] ingest | Task 4 QA auditor
- QA APPROVE (0 blockers). origin_blocklist, print-prompt not-run, OriginBlocked exit 2, bytes unchanged.
## [2026-08-17] ingest | Task 4 auditor trio
- STYLE, QA, DOCS all APPROVE.

## [2026-08-17] ingest | Task 5 implementer note
## [2026-08-17] ingest | Task 5 auditor trio
- STYLE, QA, DOCS all APPROVE.

## [2026-08-17] ingest | Task 7 implementer note
- Family 6: capture / demo, empty allowlist, npx retarget, Python deleted.

## [2026-08-17] ingest | Task 6 implementer note
- Families 3–5: SVG/HTML/MD metadata + Layer A; DOCX/ODT zip budget; PDF ProcCommand degraded path.

## [2026-08-17] ingest | Task 6 QA auditor
- QA APPROVE (0 blockers). SVG c2pa row, zip_bomb_and_caps, PDF degraded exit 0, --json Schema-only, no official-detect lie.
## [2026-08-17] ingest | Task 6 auditor trio
- STYLE APPROVE, QA APPROVE, DOCS APPROVE-WITH-CHANGES then rereview ADDRESSED.

## [2026-08-17] ingest | Task 7 docs auditor
- DOCS APPROVE (0 blockers). Honesty box first; capture not sample; npx; 0.2.0; no destamp/official-kill.

## [2026-08-17] ingest | Task 7 QA auditor
- QA APPROVE (0 blockers). premark_unknown_model, official_unavailable_default, live skip; empty allowlist; demo not gold; --json Schema-only; no official-detect lie; Python deleted.

## [2026-08-17] ingest | Task 7 style auditor
- STYLE APPROVE (0 blockers). Capturer Effect.Service; HttpClient only on capture/demo Live; Config not process.env; Fail PreMarkModel/MissingApiKey.
## [2026-08-17] ingest | Task 7 auditor trio
- STYLE, QA, DOCS all APPROVE.

## [2026-08-17] ingest | Wave 1 full-branch QA
- QA APPROVE (0 blockers). Named §16.2 tests present; --json Schema-only; residual exit 1 unless degraded; official unavailable; no official-detect lie; Python deleted.

## [2026-08-17] ingest | Wave 1 full-branch STYLE auditor
- STYLE APPROVE (0 blockers). Effect 3; no forbidden imports; Fail≠Finding; per-command R; `@effect/cli`; no HTTP service.

## [2026-08-17] ingest | Wave 1 full-branch docs auditor
- DOCS APPROVE (0 blockers). Honesty box first; capture not sample; npx; 0.2.0; no destamp/official-kill.
## [2026-08-17] ingest | Wave 1 full-diff trio
- STYLE, QA, DOCS all APPROVE. Wave 1 implementation review complete.

## [2026-08-17] ingest | Wave 2 Task 1 implementer note
- HTTP inspect/clean service; HttpApp Layer; 0.3.0; official stays unavailable; no /humanize.

## [2026-08-17] ingest | Wave 2 Task 1 STYLE auditor
- STYLE APPROVE (0 blockers). Platform HttpServer; FileSystem scoped temps; Fail≠Finding; no node:fs.

## [2026-08-17] ingest | Wave 2 Task 1 QA auditor
- QA APPROVE (0 blockers). Trailer fixture present; official unavailable; bearer 401; 256 MiB cap; no /humanize.

## [2026-08-17] ingest | Wave 2 Task 1 docs auditor
- DOCS APPROVE (0 blockers). Honesty on report; 0.3.0; no destamp/official-kill; no /humanize.
## [2026-08-17] ingest | Wave 2 Task 1 auditor trio
- STYLE, QA, DOCS all APPROVE.

## [2026-08-17] ingest | Wave 2 Task 2 implementer note
- OpenAPI 3.0.3 at GET /openapi.json; anthropies serve defaults to 127.0.0.1:8765; no /humanize.

## [2026-08-17] ingest | Wave 2 Task 2 STYLE auditor
- STYLE APPROVE (0 blockers). Platform HttpServer; @effect/cli serve; createServer is NodeHttpServer factory only.

## [2026-08-17] ingest | Wave 2 Task 2 QA auditor
- QA APPROVE (0 blockers). OpenAPI 3.0.3 paths; serve loopback 127.0.0.1:8765; no /humanize.

## [2026-08-17] ingest | Wave 2 Task 2 docs auditor
- DOCS APPROVE (0 blockers). Honesty on report; 0.3.0; serve --help loopback; no destamp/official-kill.
## [2026-08-17] ingest | Wave 2 Task 2 auditor trio
- STYLE, QA, DOCS all APPROVE.
## [2026-08-17] ingest | Wave 2 Task 3 implementer note
- Skill HTTP path; ANTHROPIES_SERVICE_URL default http://127.0.0.1:8765; health first; npx fallback; README 0.3.0 serve.
