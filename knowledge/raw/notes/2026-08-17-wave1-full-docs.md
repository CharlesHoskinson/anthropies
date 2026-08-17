# Wave 1 full-branch docs auditor note

Date: 2026-08-17
Role: docs auditor (FULL-BRANCH trio)
Diff: e4a76b6..4419c7a (`review-e4a76b6..4419c7a.diff`)

## Verdict

APPROVE. 0 BLOCKER. 0 MAJOR. 4 NIT.

## Required checks

- Honesty box is the first README section after the hero. Product sentence only. Three denials present. Four-channel table. `clean` does not remove the keyed text mark. `demo` never claims official text-kill.
- Command is `capture`, not `sample`. CLI help: “Does not watermark.” Sidecar forbids `sampled`.
- Version `0.2.0` on `package.json`, plugin, CLI `run(..., { version: "0.2.0" })`, README. Product sentence only on package description.
- No destamp / official-kill / `undetectable` as a claim / `strip a Claude watermark` / `watermark removed` as a verdict on README, skill, slash, plugin.
- Skill YAML is post-C2PA + `Does not claim official watermark removal.` Procedure is `npx anthropies` / `node dist/cli.js`. No `python3 -m anthropies`.

## Locked surfaces

- `docs/CLAIMS.md` and `docs/CHANNELS.md` match spec §8 / §13. Honesty stanza locked. `removed` per channel. Plugin lock still includes “(once implemented).”
- Slash: deterministic clean first; do not rewrite with Claude; do not claim official-detector failure.
- CLI help is spec §13 sense for all five commands. Root description is the product sentence.
- `skills/purge-anthropies/references/mark.md` kept. Official detect forthcoming; we report unavailable until URL set.
- `fixtures/THIRD_PARTY.md` is honest: synthetic, not signed Claude, not WR bytes.

## Grep

`rg` over README, `skills/purge-anthropies/SKILL.md`, `commands/purge-anthropies.md`, `.claude-plugin/plugin.json`: no `python3 -m anthropies`, no destamp, no official-kill, no `undetectable` as a claim, no `sample` command.

## NIT

- README doubled `---` before How the Mark Works and before the manifesto.
- Plugin still says “(once implemented)” for C2PA. Matches locked CLAIMS/spec §13; CHANNELS already notes the stale tense.
- `docs/CLAIMS.md` heading still says “until C2PA family is tested” after the trigger was added.
- Spec §14 `fixtures/README.md` is missing; `fixtures/THIRD_PARTY.md` is present.

## Out of this audit

- `docs/MANIFESTO.md:33` paraphrases `undetectable` outside the Anthropic quotation. Spec §14 says Keep manifesto. §13 forbidden list does not include MANIFESTO.
