---
type: synthesis
aliases: ["Wave 2 Task 3 implementer"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 2 Task 2 Implementer Note]]"
  - "[[Wave 2 Task 1 Implementer Note]]"
  - "[[Wave 1 Implementation]]"
---

# Wave 2 Task 3 Implementer Note

Skill HTTP path is on the tree. `skills/purge-anthropies/SKILL.md` prefers `ANTHROPIES_SERVICE_URL` (default `http://127.0.0.1:8765`). `anthropies serve` is the process that owns FileSystem.

Locked surfaces now match [[Wave 2 Design]] §2 / §3:

- Health-check `GET /health` first. If health fails, say so. Do not invent a successful HTTP result.
- `POST /inspect` and `POST /clean` take `{ file: base64, name }`. `cleaned` is base64. No `/humanize`.
- `npx anthropies` / `node dist/cli.js` remain the local CLI fallback when the operator did not require the service.
- Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set. No destamp. No official-kill. Capture is not sample.
- README version is `0.3.0` and documents `npx anthropies serve`.

See [[Wave 2 Implementation]] for the family sequence. Residual: Docker, CI are later tasks. Auditor trio not dispatched.
