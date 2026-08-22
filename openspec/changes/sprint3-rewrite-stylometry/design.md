## Context

See proposal.md for motivation. Sprint 0 kernel and report channels exist. Layer B already has a print-prompt humanizer, origin blocklist, optional HTTP rewrite backends, and a five-gram `rewrite_metric` with `computed`, `insufficient`, and `not-run`. Sprint 3 freezes multi-candidate orchestration, lexical selection, stylometry observation states, and honesty bounds as an OpenSpec pack contract. Detector registry is Sprint 4 and must not drive rewrite success here.

## Goals / Non-Goals

**Goals:**

- Orchestrate multiple non-origin rewrite candidates with per-candidate observations.
- Default to print-prompt with no HTTP and no destamp claim.
- Keep Ollama and OpenAI-compatible adapters optional and loopback by default.
- Select candidates with lexical criteria only.
- Emit five-gram and stylometry observation states `computed`, `insufficient`, and `not-run`.
- Refuse origin stamper backends and models.
- Keep facts, URLs, and fenced code stable in rewrite prompts.
- Keep health at `0.3.0` and keep channels unmixed.

**Non-Goals:**

- Official-removal certification.
- Bundled models.
- Detector-driven selection or CI pass bars on statistical observations.
- HTTP `/humanize`.
- Implementing pack sources in this freeze unit.

## Decisions

### Multi-candidate non-origin rewrite

Pack id `anthropies.rewrite-stylometry` produces two or more rewrite candidates for a prose humanize run when an HTTP rewrite backend is configured and enabled. Each candidate gets its own observation record. The selected candidate is the only text written as the humanize result. Print-prompt remains a single prompt emission and does not invent fake rewrite candidates.

Alternative considered: one rewrite call only. Rejected because lexical selection needs a candidate set and parity requires per-candidate observations.

### Origin blocklist stays hard

Backend or model strings that contain `claude`, `anthropic`, `gemini`, `google-gemini`, or `synthid` are refused with `OriginBlocked`. Input bytes stay unchanged. Local unmarked models and print-prompt are not blocked by those tokens alone.

### Print-prompt is the zero-dependency default

Unset rewrite backend resolves to `print-prompt`. Print-prompt returns the structured rewrite prompt plus cleaned text. It does not call HTTP. It does not destamp. Its rewrite observation status is `not-run`. The required denial string is that print-prompt does not destamp.

### Optional Ollama and OpenAI-compatible loopback

Backends `ollama` and `openai-compatible` POST only when selected. Base URLs must be http or https. Non-loopback hosts require explicit `ANTHROPIES_REWRITE_ALLOW_REMOTE=1`. Without that enablement, remote URLs fail closed. Default CI and default operator runs stay on loopback or print-prompt. No language model weights ship in the Anthropies package.

Alternative considered: remote-open by default for convenience. Rejected because accidental remote exfiltration is too easy.

### Lexical selection independent of detectors

Candidate selection uses lexical or five-gram overlap criteria derived from before and after text only. Detector adapter scores, official channel results, and vendor payloads must not choose the winner and must not mark the run as clean. Absence of detectors must not block lexical selection.

### Five-gram and stylometry observation states

Both five-gram overlap and stylometric observations use status values `computed`, `insufficient`, and `not-run`.

- `not-run` when rewrite did not execute, including print-prompt.
- `insufficient` when domain is `code` or Unicode prose token count is under `200`.
- `computed` only after a real rewrite on prose with at least `200` Unicode letter tokens.

Surviving five-gram ratio may be present only on `computed`. These observations are evidence on the statistical channel. They are never a watermark score, never an official-removal certificate, and never a CI efficacy gate.

### Preservation rules in prompts

Prose and code prompts require clause-order and H-gram structure change. They require facts, numbers, names, URLs, citations, and fenced code to stay byte-stable. Code prompts also forbid public API and behavior changes.

### HTTP surface

GET /health stays `{ "ok": true, "version": "0.3.0" }`. After implementation, GET /capabilities lists `anthropies.rewrite-stylometry`. There is no `/humanize` route. Layer B stays CLI-side.

### Freeze vs implement

This change directory freezes requirements. Implementation tasks stay unchecked until a later Foreman implement unit. Do not register packs in this freeze unit.

## Risks / Trade-offs

- [Origin re-stamp] → Keep the origin blocklist hard. Add known-bad Claude and Gemini controls.
- [Remote exfiltration] → Loopback default. Require explicit remote enablement.
- [Detector coupling] → Selection code must not read detector results. Golden tests assert lexical choice when detectors disagree.
- [Short-text overclaim] → Force `insufficient` below 200 tokens and for code.
- [Print-prompt honesty drift] → Keep the does-not-destamp denial in notes and claims tests.
- [Bundled-model temptation] → Non-goal. Package ships prompts and adapters only.

## Migration Plan

1. Land OpenSpec freeze documents and pass strict validate.
2. Later extend humanize into multi-candidate orchestration behind tests.
3. Later add lexical selection and per-candidate observation records.
4. Later add stylometry observation states beside five-gram metrics.
5. Register the pack and advertise capabilities without adding `/humanize`. Rollback is revert of implement commits.

## Open Questions

None that block the freeze. Exact stylometry feature formulas and candidate-count defaults are implement decisions as long as the three observation states and lexical independence scenarios pass.
