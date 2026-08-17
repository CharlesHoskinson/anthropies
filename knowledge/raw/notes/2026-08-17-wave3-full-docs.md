# Wave 3 full-branch docs auditor note (Family 4)

Date: 2026-08-17
Role: docs auditor (FULL-BRANCH trio)
Task: README/skill title restoration + residual risk; CLAIMS humanize row; destamp is a denial; print-prompt does not destamp; no official-kill; honesty/manifesto/legal stay; CLI help matches CLAIMS; origin blocklist documented; 0.4.0; spec in branch
Diff: `origin/main...HEAD` (`review-full-origin-main.diff`)
Prior: Family 3 copy trio APPROVE

## Verdict

APPROVE. 0 BLOCKER. 0 MAJOR. 2 NIT.

## Locked surfaces (Wave 3 spec Family 3 + Family 4 full-diff + CLAIMS)

- README `### Humanize (title restoration)` names title restoration, residual statistical risk, print-prompt does not destamp, and that this is not an official-kill / does not prove the official Claude text detector will fail. Honesty box (first section after the hero) is unchanged: certifies Layer A + hard-bound C2PA/metadata; does not remove Anthropic's keyed text mark; three denials; `humanize` is best-effort; `demo` never claims official text-kill.
- Skill `humanize` is title restoration + residual risk + print-prompt does not destamp + not an official-kill. YAML still: `Does not claim official watermark removal.` Hard rule still: do not rewrite with Claude, Gemini, or any origin/watermarked vendor; do not claim official-detector failure.
- `docs/CLAIMS.md` `## humanize` row states the allowed claim. `destamp` stays forbidden as a capability. The denial `print-prompt does not destamp` is required (Wave 3 §2). Same pattern as `does not prove the official Claude text detector will fail`.
- CLI `humanize` help (`src/cli.ts:130`) matches CLAIMS sense: title restoration, best-effort, refuses Claude and Gemini, print-prompt does not destamp. Root description is still the product sentence. `demo` still never claims official text-kill.
- Origin blocklist is documented as a refusal, not a capability: CLI/CLAIMS “Refuses Claude and Gemini”; README “Do not run it with Claude or Gemini”; skill hard rule names origin/watermarked vendors. Spec §2 keeps tokens `claude|anthropic|gemini|google-gemini|synthid`. Runtime `ORIGIN_TOKENS` matches.
- Honesty box, manifesto (`docs/MANIFESTO.md`), and `docs/legal/` are not in the product-copy rewrite. They stay. Manifesto `undetectable` is the Anthropic quotation (and the adjacent paraphrase of that quotation), not a product capability.
- Version `0.4.0` on `package.json:3`, `.claude-plugin/plugin.json:3`, `src/cli.ts:152`. Plugin description stays the locked CLAIMS sentence (does not defeat unpublished text detector).
- Spec `docs/superpowers/specs/2026-08-17-anthropies-wave3-design.md` is a new file on this branch. Ships 0.4.0. Leapfrog is Claude title restoration, not pixel harnesses / official-kill.

## Grep

Changed copy (README Humanize section, SKILL, CLAIMS, CLI help, plugin version, spec, wiki ingest): no `undetectable`, `beats detector`, `official detector will fail` as a capability, `proves human-written`, `watermark removed` as a verdict. `official-kill` and `destamp` appear only as denials. Slash `commands/purge-anthropies.md` still denies official-detector failure (untouched). `docs/legal/` and manifesto not rewritten to claim a kill.

## NITs

- `README.md:49` — How-to-run still says Version is `0.2.0` while package/plugin/CLI are `0.4.0`. Hard gate is package.json / plugin; leftover Wave 1 line.
- `README.md:61` — "so the keyed text mark is no longer the shipped prose" is a shade stronger than the honesty box (“It does not remove Anthropic's keyed text mark”) and the CLAIMS row (best-effort + residual risk). Same paragraph names residual statistical risk and denies official-kill. Family 3 already accepted; honesty box itself was not rewritten. Do not escalate.

## Out of this audit

Family 4 PR / Grok review / merge. Live model. 5-gram pass bar. `src/http/`. Honesty-box rewrite. Official detect client.
