# Wave 2 Task 5 implementer note (GitHub Actions CI)

Date: 2026-08-17
Role: implementer
Task: GitHub Actions CI for pnpm test and pnpm build

## What I changed

- Created `.github/workflows/ci.yml`.
- Triggers: `push` and `pull_request` to `main`.
- Matrix: `ubuntu-latest` and `windows-latest`.
- Node 22. pnpm 11.22.0 (same pin as the Docker image).
- Steps: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`.
- Version stays `0.3.0`. No `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set.

## Why

Wave 2 family 6 is the CI surface the design locked: GitHub Actions `pnpm test` + `pnpm build` on push/PR (ubuntu + windows). Frozen lockfile keeps the install reproducible. Test before build matches the task brief.

## Residual risks

- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- Workflow has never run on GitHub. First push/PR to `main` is the real check.
- Windows matrix is unproven here. Tests look path-safe, but a Windows-only fail will show on the first Actions run.
- Full-diff trio before calling Wave 2 done is still outstanding (plan Task 5 last checkbox).
- `docs/CLAIMS.md` CLI help list still has no `serve` row. Out of this task's file list.

## Almost did, did not

- Almost added lint or live-capture jobs. Did not. Spec is `pnpm test` + `pnpm build`.
- Almost installed qpdf/exiftool/c2patool on the runners. Did not. Same no-heavy-backends rule as Docker.
- Almost dispatched STYLE/QA/DOCS subagents. Parent: do not dispatch.
- Almost claimed official-kill or destamp. Did not.
- Almost added HTTP `/humanize`. Did not.
- Almost opened a PR. Parent: controller will after full-diff trio.
