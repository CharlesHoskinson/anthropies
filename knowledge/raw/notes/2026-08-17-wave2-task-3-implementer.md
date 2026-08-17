# Wave 2 Task 3 implementer note (Skill HTTP path)

Date: 2026-08-17
Role: implementer
Task: Document the skill HTTP client path

## What I changed

- Updated `skills/purge-anthropies/SKILL.md` so inspect/clean prefer `ANTHROPIES_SERVICE_URL` (default `http://127.0.0.1:8765`).
- Documented `anthropies serve` as the process that owns FileSystem (`npx anthropies serve` / `node dist/cli.js serve`). Loopback `127.0.0.1:8765`.
- Health-check first: `curl -sS -f "$ANTHROPIES_SERVICE_URL/health"`. If health fails, say so. Do not invent a successful HTTP result. If the operator required the service, stop. Otherwise fall back to `npx anthropies` / `node dist/cli.js`.
- curl examples for `POST /inspect` and `POST /clean` with `{ file: base64, name }`. Bearer header only when `ANTHROPIES_SERVER_API_KEY` is set.
- Humanize stays CLI-only. No HTTP `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set.
- README: version `0.3.0` (was `0.2.0`); added `npx anthropies serve` and a loopback/service-URL paragraph.
- No destamp. No official-kill. Capture is not mentioned as sample.

## Why

Wave 2 family 3 is the skill client path Tasks 1–2 enabled. The agent host can inspect/clean over loopback with `curl` once `anthropies serve` is up. CLI remains the local fallback so a host without the service still works.

## Residual risks

- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- Design said "do not invent a local fallback that contradicts the operator." Plan said keep `npx anthropies` as local fallback. Skill does both: report health failure; CLI fallback only when the operator did not require the service.
- `docs/CLAIMS.md` CLI help list still has no `serve` row. Out of this task's file list.
- Docker / compose (Task 4) and CI (Task 5) not started.
- Skill curl examples use POSIX `base64` / `basename`. Windows hosts need WSL or equivalent.

## Almost did, did not

- Almost added Docker / compose. Did not. Task 4.
- Almost dispatched STYLE/QA/DOCS subagents. Parent: do not dispatch.
- Almost claimed official-kill or destamp. Did not.
- Almost added HTTP `/humanize`. Did not. Spec: humanize stays CLI-only.
- Almost dropped the `npx anthropies` fallback. Did not. Plan requires it.
- Almost rewrote `commands/purge-anthropies.md`. Did not. Brief is SKILL.md + README version/serve.
