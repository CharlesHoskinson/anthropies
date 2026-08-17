---
type: synthesis
aliases: ["Wave 2 Task 4 implementer"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 2 Task 3 Implementer Note]]"
  - "[[Wave 2 Task 2 Implementer Note]]"
  - "[[Wave 1 Implementation]]"
---

# Wave 2 Task 4 Implementer Note

Docker packaging is on the tree. `Dockerfile` is Node 22, `pnpm build`, `CMD node dist/cli.js serve --host 0.0.0.0 --port 8765`. `compose.yaml` publishes `127.0.0.1:8765:8765`. Version `0.3.0`.

Locked surfaces now match [[Wave 2 Design]] §2:

- One core image. No qpdf / exiftool / c2patool.
- Read-only root + `/tmp` tmpfs. HTTP uploads use scoped temps.
- Host publish is loopback. `0.0.0.0` is the in-container bind only.
- No `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set.
- `.dockerignore` drops `node_modules`, `.git`, `.worktrees`, `knowledge`.

See [[Wave 2 Implementation]] for the family sequence. Residual: GitHub CI is Task 5. Auditor trio not dispatched.
