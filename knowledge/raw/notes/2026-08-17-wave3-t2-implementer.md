# Wave 3 Task 2 implementer note (Family 2 stronger rewrite prompts)

Date: 2026-08-17
Role: implementer
Task: Stronger Layer B prompts (clause-order / H-gram break; keep facts/URLs/fences)

## What I changed

- Strengthened `PROSE_PROMPT` so structure change is required, not a soft rule. The prefix now names H-grams and lists required moves as separate bullets: clause order, sentence boundaries, discourse markers / function words, no in-place synonym-swap. Facts, numbers, names, URLs, citations, and code fences stay byte-stable.
- Strengthened `CODE_PROMPT` the same way for comments, docstrings, and non-load-bearing strings. Public APIs, protocol strings, snapshots, imports, and behavior stay unchanged.
- Snapshot tests in `tests/humanize-print-prompt.test.ts` (`humanize_prompt_structure_rules`): print-prompt output for prose and code must contain those structure rules plus facts/URLs/fences, and must not contain `undetectable` or `beats detector`.
- No official-kill language in the prompts. Title restoration / wording change is allowed; I did not add detector-kill copy.

## Why

Wave 3 Family 2 leapfrogs on structure-changing Layer B, not synonym-swap. print-prompt is the inspectable surface: the emitted prompt is the contract.

## Residual risks

- Prompts do not destamp by themselves. print-prompt still returns the prompt + Layer-A text and `rewrite_metric.status = not-run`.
- Family 3 copy (README / skill title-restoration wording) not done.
- No live model run. Snapshot tests inspect print-prompt text only.
- Auditor trio not dispatched. Parent: do not dispatch.

## Almost did, did not

- Almost added “title restoration” as a product sentence inside the model prompt. Did not. Structure-change rules are the contract; product copy is Family 3.
- Almost claimed destamp / undetectable / beats detector. Did not.
- Almost touched `.worktrees/feat-wave2-service` or `src/http/`. Did not.
- Almost dispatched STYLE/QA/DOCS. Parent instruction: do not dispatch.
