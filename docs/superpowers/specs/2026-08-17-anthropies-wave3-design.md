# Anthropies Wave 3 Design

**Date:** 2026-08-17  
**Status:** Approved to implement (locked leapfrog)  
**Version this wave ships:** 0.4.0  
**Depends on:** Wave 1 on main. May land before or after Wave 2 HTTP; do not rewrite `src/http/` here.

## 1. Goal

Leapfrog watermarks-remover on **Claude title restoration**, not on pixel harnesses.

1. Stronger Layer B: structure-changing rewrite prompts, surviving-5-gram **reported** (never a pass bar), optional ollama / openai-compatible that actually runs (loopback default), origin blocklist stays.
2. Product copy: legal/title thesis is first-class. README honesty box + manifesto stay. CLI `humanize` help names title restoration, not “undetectable.”
3. Still no official-detector-fail claim until `ANTHROPIC_DETECT_URL` is wired to a real vendor API.

## 2. Locked

- `rewrite_metric` already exists. Compute it after a real rewrite (`status: computed` when `n >= 200` prose tokens). Never fail CI on ratio.
- Default backend remains `print-prompt`. Document that print-prompt does not destamp.
- Origin blocklist unchanged (`claude|anthropic|gemini|google-gemini|synthid`).
- No MarkLLM, no pixel, no HTTP `/humanize`.
- Version `0.4.0` if this merges after Wave 2’s `0.3.0`; if Wave 2 is not merged, bump from whatever is on the branch without fighting HTTP files.
- Same 1+3 auditor protocol. Wiki notes required.

## 3. Families

1. Real rewrite path (ollama + openai-compatible) + `rewrite_metric` computed + tests with a fake HTTP backend (no live model in default CI).
2. Stronger prompts (clause-order / H-gram break; keep facts/URLs/fences). Snapshot tests that print-prompt text contains the structure rules.
3. Copy: README/skill `humanize` section names title restoration + residual risk. CLAIMS.md already forbids official-kill.
4. Full-diff trio → PR → Grok review → merge.

## 4. Out of scope

HTTP service, Docker, CI workflows, MarkLLM, official detect API client beyond the existing stub.
