---
type: synthesis
aliases: ["Wave 2 full QA auditor", "Wave 2 Full Diff QA Auditor"]
tags: [synthesis, type/synthesis, topic/wave2]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 2 Design]]"
related:
  - "[[Wave 2 Implementation]]"
  - "[[Wave 1 Full QA Audit]]"
  - "[[Wave 2 Full Diff Docs Auditor]]"
  - "[[Wave 2 Task 1 QA Auditor]]"
  - "[[Wave 2 Task 2 QA Auditor]]"
  - "[[Wave 2 Task 5 QA Auditor]]"
---

# Wave 2 Full Diff QA Auditor

**Verdict: APPROVE.** Full-branch QA merge gate on `origin/main...HEAD`. Zero blockers. Routes are `GET /health` `/capabilities` `/openapi.json` and `POST /inspect` `/clean`. No HTTP `/humanize`. Payloads are `{ file: base64, name, options? }` → `{ ok, kind, report, cleaned? }`. Loopback default is `127.0.0.1:8765`. Optional `ANTHROPIES_SERVER_API_KEY` requires Bearer. OpenAPI 3.0.3 matches the router. `tests/http-server.test.ts` covers routes; `tests/serve-cli.test.ts` covers loopback help. Docker `CMD` serves `0.0.0.0:8765`; compose publishes `127.0.0.1:8765:8765`; no heavy backends. CI runs `pnpm test` + `pnpm build` on ubuntu + windows. `89cef71` is present: unparsed rasters are `c2pa: not-applicable`, not certified absent. Official stays `Unavailable` unless `ANTHROPIC_DETECT_URL`. Parent `pnpm test` 51 passed.

See [[Wave 2 Implementation]] for the family sequence. Residual: over-cap 400 is helper-only; `officialDetect` is URL presence; serve default is help-tested.
