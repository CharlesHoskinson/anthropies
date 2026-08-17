---
type: synthesis
aliases: ["Wave 2 Task 2 implementer"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 2 Task 1 Implementer Note]]"
  - "[[Wave 1 Implementation]]"
---

# Wave 2 Task 2 Implementer Note

OpenAPI and `anthropies serve` are on the tree. `GET /openapi.json` is OpenAPI 3.0.3. `serve` defaults to loopback `127.0.0.1:8765`.

Locked surfaces now match [[Wave 2 Design]] §2 / §3:

- `GET /openapi.json` → OpenAPI `3.0.3` with `/health`, `/capabilities`, `/inspect`, `/clean`. No `/humanize`.
- `anthropies serve --host 127.0.0.1 --port 8765` (defaults). Remote bind requires an explicit `--host`.
- CLI version `0.3.0`. Honesty stanza unchanged. Official stays unavailable. No score.

`tests/http-server.test.ts` GETs `/openapi.json` in-process (`NodeHttpServer.layerTest`) and asserts those paths. `tests/serve-cli.test.ts` checks `serve --help` names the loopback defaults.

See [[Wave 2 Implementation]] for the family sequence. Residual: skill HTTP path, Docker, CI are later tasks. Auditor trio not dispatched.
