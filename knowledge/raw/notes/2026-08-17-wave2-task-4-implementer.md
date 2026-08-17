# Wave 2 Task 4 implementer note (Dockerfile + compose)

Date: 2026-08-17
Role: implementer
Task: One core Docker image and loopback compose for `anthropies serve`

## What I changed

- Created `Dockerfile`: Node 22 bookworm-slim, pnpm 11.22.0 via corepack, `pnpm build`, then a runtime stage with prod `node_modules` + `dist`.
- `CMD ["node", "dist/cli.js", "serve", "--host", "0.0.0.0", "--port", "8765"]`. Explicit container bind; host publish stays loopback.
- Created `compose.yaml`: `127.0.0.1:8765:8765`, `read_only: true`, `tmpfs: /tmp` (HTTP uploads use `makeTempDirectoryScoped`), image `anthropies:0.3.0`.
- Created `.dockerignore`: `node_modules`, `.git`, `.worktrees`, `knowledge`, tests, docs, fixtures, skills. Keep the context small.
- README: one paragraph on `docker compose up --build`. Version stays `0.3.0`.
- No qpdf / exiftool / c2patool in the image. No `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set.

## Why

Wave 2 family 5 is the packaged process-ownership surface. The skill/host already talks to `http://127.0.0.1:8765`. Compose is how an operator starts that listener without a local Node install. `--host 0.0.0.0` is required inside the namespace; the compose publish list is what keeps it off the LAN.

## Residual risks

- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- Image has no PDF/C2PA CLI tools. `/capabilities` will report them absent. That is the locked "no heavy backends" choice, not a silent success.
- `pnpm prune --prod` is the runtime shrink step. If Effect optional native addons mis-prune, rebuild will show it.
- CI (Task 5) not started. No GitHub workflow added.
- `docs/CLAIMS.md` CLI help list still has no `serve` row. Out of this task's file list.

## Almost did, did not

- Almost installed qpdf/exiftool/c2patool. Did not. Spec: no heavy backends.
- Almost published `8765:8765` on all interfaces. Did not. Plan: `127.0.0.1:8765:8765`.
- Almost added `.github/workflows/ci.yml`. Did not. Task 5.
- Almost added HTTP `/humanize`. Did not.
- Almost claimed official-kill or destamp. Did not.
- Almost dispatched STYLE/QA/DOCS subagents. Parent: do not dispatch.
