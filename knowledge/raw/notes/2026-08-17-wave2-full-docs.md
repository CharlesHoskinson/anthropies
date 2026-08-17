# Wave 2 full-branch docs auditor note

Date: 2026-08-17
Role: docs auditor (FULL-BRANCH merge gate)
Diff: origin/main...HEAD (`review-full-origin-main.diff`)
Base: origin/main = 2d9b31a
Branch: feat/wave2-service
Spec: docs/superpowers/specs/2026-08-17-anthropies-wave2-design.md

## Verdict

APPROVE. 0 BLOCKER. 0 MAJOR. 5 NIT.

## Required checks

| Check | Result |
|---|---|
| README `anthropies serve` | PASS — How-to-run lists `npx anthropies serve`. Loopback `127.0.0.1:8765` (`GET /health`, `POST /inspect`, `POST /clean`). Remote bind requires `--host`. Skill prefers `ANTHROPIES_SERVICE_URL` (same default) and health-checks first. No HTTP `/humanize`. Official unavailable unless `ANTHROPIC_DETECT_URL`. |
| Docker paragraph | PASS — `docker compose up --build` publishes `127.0.0.1:8765:8765`. In-container bind `0.0.0.0:8765`; host mapping stays loopback. Image does not install qpdf, exiftool, or c2patool. Official unavailable unless URL set. Matches `compose.yaml` comments + `Dockerfile` header. |
| CI mentioned | PASS — README: GitHub Actions runs `pnpm test` and `pnpm build` on Ubuntu and Windows. Matches `.github/workflows/ci.yml` (ubuntu-latest + windows-latest). |
| Skill HTTP | PASS — Prefer `ANTHROPIES_SERVICE_URL` default `http://127.0.0.1:8765`. Health `curl -sS -f` first. Expected `{"ok":true,"version":"0.3.0"}`. If health fails, say so; do not invent success. Operator-required → stop. Else `npx anthropies` / `node dist/cli.js`. POST `/inspect` `/clean` base64. Humanize is CLI-only. |
| CLAIMS serve | PASS — CLI help adds `serve     Serve inspect and clean on loopback. Does not humanize. Never claims official text-kill.` Serve table: local HTTP inspect/clean; loopback; no `/humanize`; official unavailable unless `ANTHROPIC_DETECT_URL`. `/humanize` is not a route. Layer B stays CLI-only. |
| Honesty / manifesto / legal stay | PASS — README honesty box is still the first section after the hero. Product sentence only. Three denials. Four-channel table. `clean` does not remove the keyed text mark. `demo` never claims official text-kill. Manifesto + legal sections in README unchanged. `docs/MANIFESTO.md` and `docs/legal/` are not in the full-branch diff. Not rewritten to claim a kill. |
| Version `0.3.0` | PASS — README “Version is `0.3.0`.” `package.json` `0.3.0`. CLI `CliCommand.run(..., { version: "0.3.0" })`. SKILL health expected `0.3.0`. OpenAPI / `/health` use `serviceVersion`. Compose image `anthropies:0.3.0`. |
| No destamp / official-kill / undetectable as a capability | PASS — README, SKILL, slash, CLAIMS, OpenAPI, CLI help, Dockerfile/compose comments. |

## Locked surfaces

- README How to run: `serve` + loopback + no `/humanize` + official denial + Docker loopback publish + no heavy backends + CI `pnpm test` + `pnpm build` on Ubuntu and Windows.
- `docs/CLAIMS.md` CLI help includes `serve`; serve row forbids `/humanize`. Honesty stanza unchanged.
- `skills/purge-anthropies/SKILL.md`: HTTP-first inspect/clean; health first; npx fallback only if operator did not require the service.
- CLI help: “Serve inspect and clean on loopback. Does not humanize. Never claims official text-kill.” Root description is the product sentence.
- OpenAPI info: does not humanize; does not claim official-detector failure; honesty stays on `report.honesty`.
- Slash still: deterministic clean first; do not rewrite with Claude; do not claim official-detector failure.

## Grep

`rg` over README, `skills/purge-anthropies/SKILL.md`, `commands/purge-anthropies.md`, `src/cli.ts`, `src/http/openapi.ts`, `docs/CLAIMS.md`: no `destamp`, no `undetectable` as a claim, no `watermark removed` as a verdict, no `strip a Claude watermark`. Denial “does not prove the official Claude text detector will fail” / “never claims official text-kill” / “official stays unavailable unless `ANTHROPIC_DETECT_URL`” are locked CLAIMS lines, not capabilities.

Full-branch file list does not touch `docs/MANIFESTO.md` or `docs/legal/`.

## NIT

- `.claude-plugin/plugin.json` still version `0.2.0`. Gate lists README / package.json / CLI only. Wave 2 did not touch the plugin.
- README command × channel table still omits `serve`. Serve is documented in How to run.
- Plugin still says “(once implemented)” for C2PA. Matches locked CLAIMS plugin sentence. CHANNELS already notes the stale tense. CLAIMS heading still “until C2PA family is tested.”
- README still doubles `---` before How the Mark Works and before the manifesto (Wave 1 leftover).
- `docs/MANIFESTO.md:33` paraphrases `undetectable` outside the Anthropic quotation. Spec says Keep manifesto.

## Closed residuals

Task 2/3/4/5 docs notes reserved `docs/CLAIMS.md` missing `serve` and README missing CI. Both are on the tree now.

## Out of this audit

- Plugin version bump is not in the Wave 2 spec or this gate’s version list.
- Slash does not mention HTTP; family 4 was skill, not slash.
- Style/QA of HttpServer, Docker, CI (other auditors).
