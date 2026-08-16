<p align="center">
  <img src="assets/dont-catch-anthropies.jpg" alt="Don't Catch Anthropies" width="560">
</p>

<h1 align="center">anthropies</h1>

<p align="center">
  Restore clean title in work you already own.<br>
  Strip vendor marks from Outputs that Anthropic assigned to you.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="Apache 2.0"></a>
  <a href="skills/purge-anthropies/SKILL.md"><img src="https://img.shields.io/badge/skill-purge--anthropies-d97757.svg" alt="purge-anthropies"></a>
</p>

Apache-2.0. Usable from any LLM coding agent. Not affiliated with Anthropic PBC.

---

## The skill: `/purge-anthropies`

A humanizer-style agent skill plus a stdlib CLI. The Claude text mark is a SynthID-class keyed sampler — **the mark is the wording**. Unicode strip and prettier do not remove it. Asking Claude to clean Claude re-stamps it.

The skill lives at [`skills/purge-anthropies/SKILL.md`](skills/purge-anthropies/SKILL.md). Slash command: [`commands/purge-anthropies.md`](commands/purge-anthropies.md). Claude Code plugin: [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json).

### What it does

| Path | What it does |
| --- | --- |
| `anthropies clean` | Strip `Co-Authored-By: Claude`, Generated-with banners, invisible Unicode |
| `anthropies humanize` | Break statistical *H*-grams via a **non-origin** rewrite |
| `/purge-anthropies` | Orchestrates both; **refuses** to rewrite when the host is Claude or Gemini |

| Channel | Removal |
| --- | --- |
| Git / PR trailers | Deterministic strip |
| Attribution banners | Deterministic strip |
| Invisible Unicode | Deterministic hygiene |
| Prose | Structure-changing rewrite on an unmarked model |
| Code comments / free strings | Same, without touching public APIs or lockfiles |

### Install

```bash
git clone https://github.com/CharlesHoskinson/anthropies.git
cd anthropies
pip install -e .

# Grok
mkdir -p ~/.grok/skills
ln -sfn "$(pwd)/skills/purge-anthropies" ~/.grok/skills/purge-anthropies

# Claude Code — clean + print-prompt only. Do not rewrite with Claude.
mkdir -p ~/.claude/skills
ln -sfn "$(pwd)/skills/purge-anthropies" ~/.claude/skills/purge-anthropies
# or: claude --plugin-dir "$(pwd)"
```

### Use

In an agent session:

```
/purge-anthropies
```

or ask to “purge anthropies”, “strip the Claude watermark”, or “humanize this Claude output”.

From a shell:

```bash
python3 -m anthropies inspect COMMIT_EDITMSG
python3 -m anthropies clean notes.md --in-place
python3 -m anthropies humanize essay.md
ANTHROPIES_REWRITE_BACKEND=ollama ANTHROPIES_REWRITE_MODEL=llama3.2 \
  python3 -m anthropies humanize essay.md --in-place
```

Default `humanize` prints a rewrite prompt. Run that prompt on a **local unmarked** model (Llama, Qwen, Mistral, DeepSeek with watermarking off). Never Claude. Never Gemini.

This is not a certificate against Anthropic’s unpublished detector. Residual statistical signal can remain.

---

# The Anthropies Manifesto

### Anthropic Herpies

They assigned you the deed, then bolted their name to the door.

Consumer Terms, §4:

> "we assign to you all of our right, title, and interest—if any—in Outputs."

Commercial Terms, §B: the customer owns its Outputs. "Anthropic hereby assigns to Customer its right, title and interest (if any) in and to Outputs."

Title moved. Then they mark the property. Text from a supported model carries a SynthID-class watermark. Nothing visible is added. The mark is the wording: a keyed choice among next words that were just as good. It travels with paste. Light edits leave it. Proofreading and translation can stamp a draft you wrote. A detection API is coming so third parties can test whether "Claude was involved."

Supported files get C2PA, a signed note that Claude processed an asset you own. Claude Code writes `Co-Authored-By: Claude <noreply@anthropic.com>` into git history, and GitHub treats that trailer as authorship. The U.S. Copyright Office says not to list an AI tool or its company as a co-author merely because it was used.

They said the watermark "doesn't say anything about ownership or authorship, and doesn't change a user's rights under our terms." If it does not change ownership, they have no leftover claim that justifies planting it. They sold the ownership argument and kept the brand.

The hook is already in the contract. Both assignments are "subject to your compliance with our Terms." The consumer instrument lets them revise those Terms at their discretion, with continued use as assent, and no clause saying changes will not apply retroactively. The commercial instrument has that clause, and they know how to write it. The watermark supplies the assay: on any later day, they can say this artifact is an Output, and no one else can authoritatively say it is not.

Commercial terms offer IP indemnity for authorized paid use, then exclude claims that arise from modifications to Outputs. Their own pages say a heavy rewrite is what quiets the text mark, and a re-save is what drops C2PA. Ship the tripwire, or edit the thing you own and step outside the indemnity.

The owner labels the work, and you decide whether a commit carries a co-author, whether a file carries a credential, whether the prose is silent.

Article 50 requires a machine-readable origin signal. It does not require a secret key, a worldwide rollout, or a mark on standard editing and translation. The Code of Practice is voluntary. Anthropic applied the mark worldwide because it "doesn't yet have a durable way to scope it by region." Europe is the alibi, not the author.

You paid for the generation, and you own it. What they assigned, they do not get to mark.

The long form, covering assignment as a speech act, quitclaim, the amendment ratchet, and exclusive provenance, is in [`docs/MANIFESTO.md`](docs/MANIFESTO.md).

---

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
