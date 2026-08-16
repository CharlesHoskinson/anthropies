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
</p>

Apache-2.0. Usable from any LLM coding agent. Not affiliated with Anthropic PBC.

---

# The Anthropies Manifesto

### Anthropic Herpies

> They assigned you the deed, then bolted their name to the door.

**The assignment.** Consumer Terms, §4:

> “we assign to you all of our right, title, and interest—if any—in Outputs.”

Commercial Terms, §B: Customer owns its Outputs. Anthropic “hereby assigns to Customer its right, title and interest (if any) in and to Outputs.” Owns. Disclaims. Assigns. That is a conveyance. Not a license. Title moved.

**The infection.** After the assignment, they mark the property.

Text carries a SynthID-class watermark. Nothing visible is added. The mark *is* the wording: keyed tournament sampling at the model. Worldwide. Every surface — Claude, Claude Code, API, cloud. Light edits leave it. Proofreading and translation can stamp *your* draft. A detection API is coming so third parties can test whether “Claude was involved.”

Files carry C2PA: a signed label that Claude processed an asset you own.

Claude Code writes `Co-Authored-By: Claude <noreply@anthropic.com>` into git history.

None of this names you. That is not the grievance. The mark brands *their* involvement onto *your* property.

**The contradiction.** They cannot both assign the work and reserve a right to brand it. An assignment that leaves the assignor free to tattoo the assigned thing is not an assignment. It is a loan with a logo. They have no standing to infect title they already transferred.

**The tell.** Asked whether the watermark changes ownership, they said no. It “doesn’t say anything about ownership or authorship, and doesn’t change a user’s rights under our terms.”

If the mark does not change ownership, they have no residual claim that justifies planting it. If they needed a residual claim, they would not have assigned. They sold the ownership argument. They kept the brand.

**What ownership means.** The owner labels the work.

You decide whether a commit carries a co-author. You decide whether a file carries a credential. You decide whether prose is attributed, anonymous, or silent. Attribution is an incident of title. They transferred the title. They kept the incident.

Article 50 is a transparency duty, not a license to brand assigned property. A lawful answer is a label the owner controls. They chose a global, keyed, non-consensual mark instead.

You paid for the generation. You own it. The mark makes the property strictly worse.

This repository exists to restore Outputs to a clean title: strip the keyed wording, drop the C2PA, delete the trailer.

**What they assigned, they do not get to mark.**

---

## What this tool attacks

| Channel | What it is | Removal |
| --- | --- | --- |
| Git / PR | `Co-Authored-By: Claude` and cousin trailers | Deterministic strip + hooks |
| Files | C2PA / EXIF / XMP on PNG, JPEG, WebP, SVG | Deterministic strip |
| Unicode | Invisible carriers from other vendors | Deterministic hygiene |
| Code | SynthID-class signal in comments, local names, free strings | Scope-aware rename + comment rewrite |
| Prose | SynthID-class keyed token choices | Non-origin rewrite (never Claude) |

Using Claude to “clean” Claude re-stamps the same family of mark.

## Status

v0.1 ships a humanizer-style skill plus a stdlib CLI.

The Claude text mark is a SynthID-class keyed sampler. **The mark is the wording.** A formatter or Unicode strip does not remove it. A timid synonym pass does not remove it. Asking Claude to "clean" Claude re-stamps it.

### Install

```bash
git clone https://github.com/CharlesHoskinson/anthropies.git
cd anthropies
pip install -e .

# Grok
mkdir -p ~/.grok/skills
ln -sfn "$(pwd)/skills/purge-anthropies" ~/.grok/skills/purge-anthropies

# Claude Code plugin (deterministic + print-prompt only — do not rewrite with Claude)
# claude --plugin-dir "$(pwd)"
```

### Use

```
/purge-anthropies
```

or

```bash
python3 -m anthropies inspect COMMIT_EDITMSG
python3 -m anthropies clean notes.md --in-place
# Layer B: print a rewrite prompt for a local unmarked model
python3 -m anthropies humanize essay.md
# or, if Ollama is local and unmarked:
ANTHROPIES_REWRITE_BACKEND=ollama ANTHROPIES_REWRITE_MODEL=llama3.2 \
  python3 -m anthropies humanize essay.md --in-place
```

| Path | What it does |
| --- | --- |
| `clean` | Strip agent git trailers, Claude banners, invisible Unicode |
| `humanize` | Break statistical H-grams via a **non-origin** rewrite |
| Skill | Orchestrates both; refuses to rewrite when the host is Claude/Gemini |

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
