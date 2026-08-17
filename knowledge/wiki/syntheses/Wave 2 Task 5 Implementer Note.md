---
type: synthesis
aliases: ["Wave 2 Task 5 implementer"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 2 Task 4 Implementer Note]]"
  - "[[Wave 2 Task 3 Implementer Note]]"
  - "[[Wave 1 Implementation]]"
---

# Wave 2 Task 5 Implementer Note

GitHub Actions CI is on the tree. `.github/workflows/ci.yml` runs on push/PR to `main` with a matrix of `ubuntu-latest` and `windows-latest`. Node 22. Steps are `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`. Version `0.3.0`.

Locked surfaces now match [[Wave 2 Design]] §2:

- CI is GitHub Actions `pnpm test` + `pnpm build` on push/PR (ubuntu + windows).
- No `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set.
- No heavy backends installed on the runners.

See [[Wave 2 Implementation]] for the family sequence. Residual: auditor trio not dispatched. Full-diff trio still required before Wave 2 is done.
