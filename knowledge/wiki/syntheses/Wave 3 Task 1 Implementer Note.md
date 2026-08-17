---
type: synthesis
aliases: ["Wave 3 Task 1 implementer", "W3T1 implementer"]
tags: [synthesis, type/synthesis, topic/wave3]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 3 Design]]"
related:
  - "[[Wave 1 Design]]"
  - "[[Task 4 Implementer Note]]"
---

# Wave 3 Task 1 Implementer Note

Family 1 real rewrite path is on the tree at `0.4.0`. print-prompt remains the default backend and still does not destamp.

Locked surfaces now match [[Wave 3 Design]] Family 1:

- `ollama` POSTs `{base}/api/generate` with `stream: false`. `openai-compatible` POSTs `{base}/v1/chat/completions` (no doubled `/v1`).
- Loopback default (`127.0.0.0/8`, `localhost`, `::1`). Non-loopback requires `ANTHROPIES_REWRITE_ALLOW_REMOTE=1` or the run is `RewriteRemoteDenied`.
- After a successful rewrite, `rewrite_metric.status` is `computed` when `n >= 200` prose tokens, else `insufficient`. print-prompt stays `not-run`.
- Origin tokens still `claude|anthropic|gemini|google-gemini|synthid`. Block happens before POST.
- Default CI uses `HttpClient.make` canned JSON. No live model. No MarkLLM. No official-kill.

`HttpClient` is optional on the print-prompt path (`Effect.serviceOption`). CLI `humanize` provides `NodeHttpClient.layer`.

Residual: honesty stanza statistical line still says `not-run` even when the Report field is `computed`. Family 2 copy and Family 3 prompt snapshots are later.

See [[Wave 3 Design]] for the locked family list.
