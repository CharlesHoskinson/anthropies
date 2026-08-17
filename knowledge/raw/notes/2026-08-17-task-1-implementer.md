# Task 1 implementer note (Family 0 honesty patch)

Date: 2026-08-17
Role: implementer
Task: Honesty patch (Family 0)

## What I changed

- Created `docs/CLAIMS.md` from spec §13 / §8: forbidden phrases, locked honesty stanza, channel verbs, three required denials (does not prove official detector / human-written / absence ≠ uninvolved), locked skill YAML, locked plugin description, CLI help sense, Report field meanings, demo last-stanza rules.
- Created `docs/CHANNELS.md` for `deterministic | c2pa | official | statistical`, certificate vs best-effort, and what `demo` may print (four-row table, honesty twice, never a success banner).
- Replaced `skills/purge-anthropies/SKILL.md` YAML description with the spec’s exact block. Kept every `python3 -m anthropies` invocation. Did not add C2PA triggers.
- Rewrote the one skill hard-rule that contained the banned substring `official detector will fail` to `Do not claim official-detector failure.` Grep would have failed otherwise; the brief only named the YAML, but step 7 is the check.
- Rewrote `commands/purge-anthropies.md` to the brief’s four sentences (frontmatter description + body).
- Rewrote `.claude-plugin/plugin.json` `description` to the spec’s locked sentence. Left `version` at `0.1.0`.
- Deleted the `docs/MANIFESTO.md` Sources sentence that cited `knowledge/raw/legal-opus{1,2,3}-brief.md`. Those files are not in the worktree.

## Why

Public skill/plugin/slash copy still claimed destamp, C2PA strip, and Claude-watermark removal. Wave 1 certifies Layer A and (later) hard-bound C2PA only. Official text detect stays unavailable. Family 0 is copy-first so later families cannot reintroduce those claims.

## Residual risks

- README still uses older product/mark language, including a non-quotation `undetectable` on the short-passage operating point. Out of Task 1’s file list. Later docs family / README honesty-box work still needed.
- Plugin `keywords` still include `watermark` and `humanize`. Brief said description only.
- Skill body still describes humanize / 5-gram targets. That is current Python capability, not a new certificate. Residual statistical signal is already disclosed.
- `docs/CLAIMS.md` necessarily lists forbidden phrases, including the locked denial `this run does not prove the official Claude text detector will fail`. That is documentation of the required stanza, not a capability claim. It is outside the step-7 grep roots.
- C2PA is named in the plugin as “(once implemented)”. That is the spec’s wording. Skill/slash do not claim it.

## Almost did, did not

- Almost retargeted the skill to `npx anthropies`. Did not. Task 7 deletes Python.
- Almost bumped plugin version to `0.2.0`. Did not. Version stays until the package exists.
- Almost restored `clean C2PA` / `strip a Claude watermark` in the skill as “coming soon.” Did not.
- Almost shipped or re-cited the missing legal-opus briefs. Deleted the citation instead.
- Almost rewrote the whole skill procedure or README honesty box. Did not. Out of the brief’s file list.
- Almost dispatched STYLE/QA/DOCS subagents. Parent instruction: do not dispatch. Self-reviewed instead.
