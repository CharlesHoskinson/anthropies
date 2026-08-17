---
type: synthesis
aliases: ["Task 3 implementer"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 3 Implementer Note

Family 1 classify + Layer A + text inspect/clean is on the tree.

Locked surfaces now match [[Wave 1 Design]] §4 / §6 / §9 / §10:

- `classify` is pure. Magic beats suffix. Unknown non-text magics are `binary`.
- `applyLayerA` strips ZWSP/bidi/tags, agent trailers, Generated-with banners. Emoji ZWJ and leading BOM stay.
- `Inspector` / `Cleaner` are `Effect.Service`. `R` is `FileSystem` only. No `HttpClient`.
- Non-text kinds fail closed with `BinaryInput` unless `--force-text`. Images are not “not implemented.”
- `--json` stdout is `Schema.encode` Report only. Honesty is on stderr (and inside the Report field).
- Inspect exit 1 when deterministic is present. Fails exit 2 and do not write or create `.bak`.

See [[Wave 1 Implementation]] for the family sequence. Residual: `.md`/`.html`/`.svg` wait for later handlers; official stays Unavailable; auditor trio not dispatched.
