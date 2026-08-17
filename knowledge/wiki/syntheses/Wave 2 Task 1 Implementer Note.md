---
type: synthesis
aliases: ["Wave 2 Task 1 implementer"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 1 Implementation]]"
---

# Wave 2 Task 1 Implementer Note

HTTP inspect/clean is on the tree. `HttpApp` is an `@effect/platform` `HttpServer` Layer over Wave 1 `Inspector` / `Cleaner`. Version `0.3.0`.

Locked surfaces now match [[Wave 2 Design]] §2 / §3:

- `GET /health` → `{ ok: true, version: "0.3.0" }`.
- `GET /capabilities` → `{ version, tools: { qpdf, exiftool, c2patool }, scorers: { officialDetect } }`.
- `POST /inspect` `{ file, name, options?: { forceText } }` → `{ ok, kind, report }`.
- `POST /clean` same + `{ cleaned }` base64. No `/humanize`. No MarkLLM/pixel.
- Bearer required iff `ANTHROPIES_SERVER_API_KEY` is set. Missing/wrong → 401.
- Decoded input cap 256 MiB; decode fail → 400.
- `report.honesty` is the Wave 1 stanza. Official stays `unavailable`. No score.

`tests/http-server.test.ts` boots the app in-process (`NodeHttpServer.layerTest`), POSTs `fixtures/layer-a/trailer-claude.txt` as base64, and expects deterministic `present` and official `unavailable`.

See [[Wave 2 Implementation]] for the family sequence. Residual: `serve` CLI, OpenAPI, skill HTTP path, Docker, CI are later tasks. Auditor trio not dispatched.
