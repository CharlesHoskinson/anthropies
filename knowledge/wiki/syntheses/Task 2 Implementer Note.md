---
type: synthesis
aliases: ["Task 2 implementer"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 2 Implementer Note

Effect 3 ESM CLI scaffold is on the tree at version `0.2.0`.

Locked surfaces now match [[Wave 1 Design]] §5 / §8 / §9:

- `effect@3.22.1` (not Effect 4). `@effect/cli` + `NodeRuntime.runMain` + `NodeContext.layer`.
- `tsconfig` is `strict` + `NodeNext` + `verbatimModuleSyntax` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Fails are `Schema.TaggedError`. `Report` has no `suspicious`. `removed` is nested per channel. `OfficialFinding.Unavailable` has no `score`.
- `honestyStanza` includes the two does-not-prove lines.
- Env knobs are `Config`. Unset `ANTHROPIC_DETECT_URL` is a value, not a throw.
- `official_claim_forbidden` was written first (RED: no `package.json`) and now passes.

See [[Wave 1 Implementation]] for the family sequence. Residual: pnpm 11 `allowBuilds` file; CLI handlers are stubs; Python still present.
