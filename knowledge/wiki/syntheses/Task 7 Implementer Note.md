---
type: synthesis
aliases: ["Task 7 implementer"]
tags: [synthesis, type/synthesis, topic/wave1]
created: 2026-08-17
updated: 2026-08-17
status: active
sources:
  - "[[Wave 1 Design]]"
related:
  - "[[Wave 1 Implementation]]"
---

# Task 7 Implementer Note

Family 6 landed: `capture` / `demo`, empty allowlist, `npx` retarget, Python deleted.

Locked surfaces now match [[Wave 1 Design]] §11.4 / §11.5 / §14 / §16.2:

- `Capturer.capture({ model, prompt })` fails `PreMarkModel` for any ID when `allowlist.json` is `[]`. Empty is valid.
- Sidecar is `capturedFrom`, `model`, `created`, `tokenCount`. No API key. No field named `watermarked` or `sampled`. Command is `capture`, not sample.
- Official adapter is `Unavailable` when `ANTHROPIC_DETECT_URL` is unset. No `score` on that branch.
- `demo` prints the honesty stanza twice and a four-row channel table. C2PA and rewrite tracks skip. Exit 0 if certificates that could run did.
- README order is honesty box → how to run (`pnpm install -g` / `npx anthropies`) → command × channel matrix → How the Mark Works → manifesto → legal.
- Skill/README/plugin no longer mention `python3 -m anthropies`. Then `src/anthropies/` and `pyproject.toml` were deleted.
- Version stays `0.2.0`. `HttpClient` is only on `capture` / `demo`. Default `pnpm test` does not construct it.

See [[Wave 1 Implementation]] for the family sequence. Residual: auditor trio not dispatched; allowlist remains empty.
