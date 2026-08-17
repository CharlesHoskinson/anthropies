---
type: synthesis
aliases: ["Wave 2 Task 2 style auditor"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 2 Task 2 Implementer Note]]"
  - "[[Wave 2 Task 1 Style Auditor]]"
---

# Wave 2 Task 2 Style Auditor

**Verdict: APPROVE.** Blockers: 0. Majors: 0. Nits: 2.

`GET /openapi.json` is `HttpRouter` + `HttpServer.serve`, not raw `node:http`. `anthropies serve` is `@effect/cli` `CliCommand` with loopback defaults and `Layer.launch(HttpApp)` over `NodeHttpServer.layer`. `createServer` lives only in `cli.ts` as the platform bind factory. No `/humanize`. Version `0.3.0`.

Nits: eslint `cli.ts` carve-out also allows unused bare `http`; OpenAPI test uses `as` not Schema.decode. None block [[Wave 2 Implementation]] Task 3.

See [[Wave 2 Task 2 Implementer Note]] for what landed.
