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

# How the Mark Works

Claude output can carry marks at three different layers: generated wording, file metadata, and commit text. They fail in different ways, and a tool that removes one can leave the other two intact. The diagram follows the text through those layers.

```
                    ┌─────────────────────────────────────────────┐
   YOUR PROMPT ───▶ │  C L A U D E                                │
                    │                                             │
                    │   next-token distribution                   │
                    │        │                                    │
                    │        ▼                                    │
                    │   tournament sampling ◀── secret key k      │
                    │        │                                    │
                    └────────┼────────────────────────────────────┘
                             ▼
                        ┌─────────┐
                        │  TEXT   │  ① keyed watermark (IN the wording)
                        └────┬────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ .png/.jpg│   │ commit   │   │  prose   │
        │ .svg     │   │ message  │   │  as-is   │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             ▼              ▼              ▼
        ② C2PA          ③ trailer       ① only
        signed          Co-Authored-By
        manifest        : Claude
        (metadata)      (plain text)
```

**① is the hard one.** ② and ③ are metadata and text, so a deterministic edit can remove them. ① is the wording itself.

---

## ① The keyed watermark

Anthropic's own analogy is the clearest one available. Imagine a board game where each turn you roll a die. Now replace the die with *the digits of π*, starting from some agreed position. The moves are still random as far as any player can tell. But someone who knows you used π and knows where you started can look at the finished game and work out that the rolls were not dice.

The watermark does that to word choice. It does not add characters. It does not change meaning. **It changes the source of the randomness the model uses to pick among words that were equally good.**

### The seed

Every position gets its own seed, computed from the preceding text and a secret key:

```
   … the  court  will  probably  ▓▓▓▓▓
        └─────────┬─────────┘      ▲
           last H tokens            │
          (H = 4 by default)        │
                  │                 │
                  ▼                 │
          ┌────────────────┐        │
          │ hash(context,  │        │
          │      key k)    │        │
          └────────┬───────┘        │
                   ▼                │
                seed r_t ───────────┘
                   │
                   ▼
       m pseudorandom "g-functions", each of which
       scores EVERY candidate token 0 or 1
```

The preceding *H* tokens and secret key produce the per-position seed `r_t`. That seed selects the g-functions that score each candidate token. Change the key and every score changes. Without the key the scores are unrecoverable, which is why **only the holder of the key can detect the mark.**

### Tournament sampling

Candidates come from Claude's own probability distribution, then pass through a knockout bracket. At each layer, the survivor is whichever candidate scores higher under that layer's g-function.

```
  layer 1   [hold]  [find]   [rule]  [conclude]      ← drawn from the model's
              g=1     g=0      g=0      g=1             own distribution
                \     /          \      /
                 \   /            \    /
  layer 2       [hold]           [conclude]
                 g=0                g=1
                    \               /
                     \             /
  layer 3              [conclude]  ◀── emitted
                                       (30 layers by default)
```

Every survivor is a word the model already rated as good. The tournament breaks ties the *same way* every time for a given key and context. That consistency creates the signal.

Two consequences follow:

- **The mark is the wording.** There is no separate payload to delete. Removing it means changing which words are there.
- **It is non-distortionary in expectation.** Averaged over keys, the output distribution is unchanged. Measured perplexity is unchanged, and a live A/B over ~20 million responses moved user thumbs-up rates by 0.01%. That concerns average output quality. For a single prompt, however, the keyed tie-breaking reduces diversity across regenerations.

### Why code is barely marked

This follows from the sampling rule. **The tournament can only bias a choice if there is a choice.**

```
  HIGH ENTROPY: prose                    LOW ENTROPY: code / facts
  many equally-good next words           one correct next token

  "the argument is …"                    "for (int i = 0; i <"
     ├── compelling  █                    ├── i           ████████████
     ├── persuasive  █                    ├── j           ▏
     ├── forceful    █                    └── k           ▏
     ├── strong      █
     └── weak        █                    tournament has nothing to pick
  tournament picks among them             between: NO MARK
  MARK LANDS
```

Anthropic states the limit in its own words. Where there is no choice to make, the watermark is not applied: where "something would be factually wrong or a piece of code would break if a different term was chosen." And code "has generally less watermarking than some other forms of text," because it "in very many cases has to be exact."

Syntax and exact facts leave little room for the tournament, but comments and identifier names can still offer several acceptable choices. They remain more exposed.

### Detection

Detection needs the key, not the model. The mean detector reports a raw score, the frequentist detector reports a p-value against an unkeyed-text null, and the Bayesian detector reports a conditional probability. They answer different questions:

```
  scored g-values ──┬─▶ MEAN            raw score, ~0.5 under the null
                    │                   (needs a length-specific threshold)
                    │
                    ├─▶ FREQUENTIST     an exact p-value against
                    │                   "this text is not keyed"
                    │
                    └─▶ BAYESIAN        P(watermarked | g-values)
                                        ⚠ conditioned on an assumed base rate,
                                          default 0.5; must be trained per key
```

The reported operating point is a **true-positive rate of about 70% at 200 tokens** against a 1% false-positive rate, rising to roughly 87% at 400 tokens. Short passages are close to undetectable: maximum true-positive rate around 0.3 at 50 tokens.

A detection is a statement about **contact with the system**, not about authorship. It cannot distinguish "Claude wrote this" from "Claude edited this."

---

## ② C2PA content credentials

A C2PA credential is a cryptographically signed manifest attached to `.png`, `.jpg`, and `.svg`. Its hash binds the manifest to a particular file under a certificate chain, so the credential can show that the file it accompanies is the file that was signed.

```
   ┌──────────────────────────────┐
   │  image bytes                 │  ← unchanged
   ├──────────────────────────────┤
   │  C2PA manifest               │  ← signed, tamper-evident
   │  "processed with Claude"     │
   └──────────────────────────────┘
              │
      re-encode, screenshot,
      or strip metadata
              ▼
   ┌──────────────────────────────┐
   │  image bytes                 │  ← still valid, credential gone
   └──────────────────────────────┘
```

Verification is deterministic: no threshold, no error rate, no length dependence. Re-encoding, screenshotting, or stripping metadata removes the manifest while leaving valid image bytes behind. The credential is the strongest evidence when present, but its absence cannot prove Claude was uninvolved because the evidence lives outside the pixels.

## ③ The `Co-Authored-By` trailer

The trailer is plain text in a commit message:

```
   Fix the retry backoff

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   └──────────┬──────────┘ └───────────┬───────────────┘
        git trailer               model + address
        GitHub parses this plain text and renders Claude as a
        co-author, counted in contribution history
```

It ships **on by default**. GitHub's co-author rendering comes from the trailer format itself. The trailer predates the watermarking programme by about seventeen months, and no Anthropic source connects the two. It is a separate mechanism that happens to point the same direction. Legally it is the most dangerous of the three, for reasons set out in [The Legal Case Against the Mark](#the-legal-case-against-the-mark).

---

## What survives what

The matrix compares ordinary operations and the result each has for the three channels:

```
  operation                     ① watermark      ② C2PA       ③ trailer
  copy-paste                    ✅ survives      ❌ lost       ✅ survives
  re-save / re-encode           ✅ survives      ❌ lost       ✅ survives
  light edit                    ✅ mostly        ❌ lost       ✅ survives
  delete the line               ✅ survives      n/a           ❌ removed
  strip metadata                ✅ survives      ❌ removed    ✅ survives
  heavy rewrite (other model)   ❌ degrades      n/a           n/a
  code / exact output           ⚠ barely there  n/a           n/a
```

**② and ③ are removable by a deterministic edit because they are attached metadata or a known line of text. ① remains in the generated word choices, so removing it requires prose rewriting.** That is why `anthropies humanize` routes the rewrite through an unmarked model rather than asking Claude to clean Claude.

## One honest complication

Anthropic says that when Claude proofreads your writing, "nearly all the words are the person's, there's very little (if anything) for the watermark to attach to."

The published measurement is less reassuring. In a study of human-written essays, **4% fell below the p < 0.05 detection threshold untouched, against 25.5% of the same essays after grammar-and-spelling-only AI editing.** A six-fold increase in flag rate from a spell-check pass.

Both statements can be true. The mark attaches to few words, and few words can still be enough. A detection hit on your own writing is not evidence that you did not write it, and that is why this tool exists for prose you authored yourself.

---

## The skill: `/purge-anthropies`

A humanizer-style agent skill plus a stdlib CLI. The Claude text mark is a SynthID-class keyed sampler: **the mark is the wording**. Deterministic cleaning removes known trailers, banners, and invisible Unicode. A non-origin rewrite changes the generated wording. Unicode strip and prettier do not remove the wording mark. Asking Claude to clean Claude re-stamps it.

The skill lives at [`skills/purge-anthropies/SKILL.md`](skills/purge-anthropies/SKILL.md). Slash command: [`commands/purge-anthropies.md`](commands/purge-anthropies.md). Claude Code plugin: [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json).

### What it does

The first table describes the commands and their behavior. The second maps each output channel to the removal method the commands use.

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

# Claude Code: clean + print-prompt only. Do not rewrite with Claude.
mkdir -p ~/.claude/skills
ln -sfn "$(pwd)/skills/purge-anthropies" ~/.claude/skills/purge-anthropies
# or: claude --plugin-dir "$(pwd)"
```

### Use

In an agent session:

```
/purge-anthropies
```

or ask to "purge anthropies", "strip the Claude watermark", or "humanize this Claude output".

From a shell:

```bash
python3 -m anthropies inspect COMMIT_EDITMSG
python3 -m anthropies clean notes.md --in-place
python3 -m anthropies humanize essay.md
ANTHROPIES_REWRITE_BACKEND=ollama ANTHROPIES_REWRITE_MODEL=llama3.2 \
  python3 -m anthropies humanize essay.md --in-place
```

Claude Code is limited to cleaning and prompt printing because it cannot perform a non-origin rewrite. Default `humanize` prints a rewrite prompt. Run that prompt on a **local unmarked** model, such as Llama, Qwen, Mistral, or DeepSeek with watermarking off. Never Claude. Never Gemini.

This is not a certificate against Anthropic's unpublished detector. Residual statistical signal can remain.

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

# The Legal Case Against the Mark

The watermark is not a label. It is the evidentiary layer of a claim Anthropic has not yet made, and every element that claim needs is already in place.

## The assignment is conditional, and always has been

Consumer Terms § 4 and Commercial Terms § B both read the same way:

> **Subject to your compliance with our Terms**, we assign to you all of our right, title, and interest—if any—in Outputs.

Those first four words are a condition, not a courtesy. A grant made subject to a condition conveys nothing to a grantee who fails it. Restatement (Second) of Contracts § 224 defines the condition as "an event, not certain to occur, which must occur, unless its non-occurrence is excused, before performance under a contract becomes due." Copyright law enforces the distinction: a breached covenant sounds in contract, but a failed condition means the license never operated. *Sun Microsystems, Inc. v. Microsoft Corp.*, 188 F.3d 1115, 1121–22 (9th Cir. 1999); *MDY Indus., LLC v. Blizzard Entm't, Inc.*, 629 F.3d 928, 939–41 (9th Cir. 2010), *as amended on denial of reh'g* (Feb. 17, 2011); *Jacobsen v. Katzer*, 535 F.3d 1373, 1380–82 (Fed. Cir. 2008). *MDY* requires a nexus between the breached term and the licensor's exclusive rights. *Id.* at 941.

Anthropic does not need to amend anything to argue that a non-compliant user never took title. The argument is not that title reverted. It is that title never vested.

## The trailer is a credit you sign

Claude Code writes `Co-Authored-By: Claude <noreply@anthropic.com>` into commit messages by default. GitHub parses the trailer and renders the named party as a co-author, counted in the repository's contribution history.

A joint work is one prepared by two or more authors intending their contributions to merge into a unitary whole. 17 U.S.C. § 101. The authors of a joint work are coowners of the copyright in the whole. § 201(a). The governing question is what the parties objectively manifested. *Childress v. Taylor*, 945 F.2d 500, 507–08 (2d Cir. 1991); *Aalmuhammed v. Lee*, 202 F.3d 1227, 1234 (9th Cir. 2000).

The Second Circuit tells you how to read a credit. Billing is "a window on the mind of the party who is responsible for giving the billing or the credit." *Thomson v. Larson*, 147 F.3d 195, 203 (2d Cir. 1998) (quoting the district court). In *Thomson* that window defeated the claim, because the party controlling the credit had taken sole billing for himself. Run the same rule on a commit log and it points the other way. What you control and publish is not one playbill printed once by someone else. It is an unbroken series of executed instruments, each naming two contributors, each committed under your identity, each pushed by your own act.

*Aalmuhammed* asks for objective manifestations of shared intent and observes that the best of them is a contemporaneous writing about co-authorship. 202 F.3d at 1234. A commit trailer is a writing about co-authorship, dated, immutable, and sitting in the work's own metadata.

## Section 203 is the part no contract can reach

Here is why the trailer matters more than the assignment.

An assignment transfers ownership. It cannot transfer authorship. A joint author remains a joint author after assigning every economic right they hold, and a joint author may terminate that grant thirty-five years later. The termination right is exercisable "notwithstanding any agreement to the contrary." 17 U.S.C. § 203(a)(5).

Read that clause against every protection you think you have. The assignment can be renegotiated. A covenant can be waived. A forum can be selected around. The termination right cannot be contracted away, because the statute says so in terms. It is the one mechanism in this entire structure with an unlimited horizon, and it runs on authorship rather than ownership — which is precisely what the trailer is evidence of.

## The maker owns what the machine composes

The objection writes itself: no human typed these sentences, so no one owns them. Three courts of appeals rejected that reasoning forty-four years ago on facts closer than anyone in this debate admits.

A video game's audiovisual display is generated in real time, differs with every player input, is never fixed by a human hand at the moment it appears, and cannot exist without the indispensable participation of someone who is not the manufacturer. Each court held the display copyrightable and owned by the maker. *Stern Elecs., Inc. v. Kaufman*, 669 F.2d 852, 855–57 (2d Cir. 1982); *Williams Elecs., Inc. v. Artic Int'l, Inc.*, 685 F.2d 870 (3d Cir. 1982); *Midway Mfg. Co. v. Artic Int'l, Inc.*, 704 F.2d 1009 (7th Cir.), *cert. denied*, 464 U.S. 823 (1983).

The Third Circuit met the co-authorship argument directly and refused it: the player does not "become[] a co-author of what appears on the screen." *Williams*, 685 F.2d at 874. The Seventh Circuit explained the reason in a sentence that transfers without adjustment. The player

> is unlike a writer or a painter because the video game in effect writes the sentences and paints the painting for him; he merely chooses one of the sentences stored in its memory, one of the paintings stored in its collection.

*Midway*, 704 F.2d at 1012.

The player does not own the playthrough. Neither, on this reasoning, does the prompter own the output.

## *Thaler* did not close the door you think it closed

*Thaler v. Perlmutter*, 130 F.4th 1039 (D.C. Cir. 2025), *cert. denied*, No. 25-449 (U.S. Mar. 2, 2026), holds that a machine cannot be an author. It holds nothing else, and its own formulation of the rule names the party this repository should worry about:

> The rule requires only that the author of that work be a human being—the person who created, operated, or used artificial intelligence—and not the machine itself.

*Id.* at 1049.

*Created, operated, or used.* The list is disjunctive and "created" comes first. The district court confined the case to the administrative record Dr. Thaler himself had made, holding that his effort to "update and modify the facts for judicial review on an APA claim is too late." 687 F. Supp. 3d 140, 149–50 (D.D.C. 2023). Whether the party that built and operates the system is the author of what it emits was never reached on the merits.

Corporate authorship needs no innovation either. Under 17 U.S.C. § 201(b), for a work made for hire "the employer or other person for whom the work was prepared is considered the author." No natural person appears in that sentence.

## The mark identifies which artifacts the claim reaches

The watermark is a keyed pseudorandom bias in token selection, seeded by a hash of the preceding tokens and a secret key. It adds no characters. It changes the source of the randomness used to choose among words the model rated equally good. The mark is the wording.

It is not authorship, and nobody serious will argue that it is. A keyed tiebreak is a "procedure, process, [or] system" excluded by 17 U.S.C. § 102(b). Its function is evidentiary: it fixes the corpus. It answers, document by document, which artifacts in the world came out of Claude.

That is the predicate a claim needs. And the statute already supplies the cause of action for stripping it. Copyright management information includes the name of the author, § 1202(c)(2), the name of the copyright owner, § 1202(c)(3), and identifying numbers or symbols referring to that information, § 1202(c)(7). CMI need not belong to an automated rights-management system. *Murphy v. Millennium Radio Grp. LLC*, 650 F.3d 295, 302–05 (3d Cir. 2011). A gutter credit in a magazine qualifies. So does a line in a commit message. Statutory damages run from $2,500 to $25,000 for each violation. § 1203(c)(3)(B).

## The mark carries no identity. The logs do.

Anthropic states that the watermark carries no identifying information and "can't be traced to a specific person, organization, or chat." Read the narrower statement it publishes under the heading *Can a watermark be traced back to me or my organization?* — "[t]here's nothing in the watermark, or its key, that would allow anyone to recover any information about the user."

Both sentences are about the mark. Neither is about the company.

Anthropic stores output text verbatim. Its Compliance API returns the literal assistant response alongside `user.id` and `user.email_address`, and its own documentation states that nothing in that content is masked. Flagged inputs and outputs are held for two years, in a window that survives both a training opt-out and a zero-data-retention election. Enterprise session transcripts default to six years. Trust-and-safety classification scores run seven.

And the Privacy Policy reserves the bridge: flagged content is disassociated from the user ID for classifier training, "[h]owever, we may **re-identify** the Inputs or Outputs to enforce our Terms of Service or Usage Policy with the responsible user if necessary."

Set that beside the assignment clause. Re-identification is unlocked by enforcement of the Terms. The conditional assignment fails on non-compliance with the Terms. **The same event unlocks both** — the power to learn who produced an Output and the position that the Output was never assigned to them.

## Ownership does not have to be decided here

Copyright is territorial, and ownership rules are not harmonized. A United States court adjudicating a United States infringement applies foreign law to ownership and forum law only to infringement. *Itar-Tass Russian News Agency v. Russian Kurier, Inc.*, 153 F.3d 82 (2d Cir. 1998).

Ireland vests authorship of a computer-generated work in "the person by whom the arrangements necessary for the creation of the work are undertaken." Copyright and Related Rights Act 2000 § 21(f). The United Kingdom does the same. Copyright, Designs and Patents Act 1988 § 9(3). An English court applied that provision to the programmer who "devised the appearance of the various elements of the game and the rules and logic by which each frame is generated," and held that the player "is not, however, an author." *Nova Prods. Ltd v Mazooma Games Ltd* [2006] EWHC 24 (Ch) at [105]–[106].

Anthropic Ireland, Limited is already the contracting entity for customers in the EEA, Switzerland, and the United Kingdom, under Irish law, with arbitration in Dublin. And 17 U.S.C. § 411(a) conditions suit on registration only for a "United States work" — so the Copyright Office refusal practice that produced *Thaler* never engages.

## What follows

Nothing above requires Anthropic to have decided anything. The conditional grant is drafted. The trailer ships on by default. The mark identifies the corpus. The retention holds the records, and the re-identification reservation connects them to accounts. The Irish entity already contracts with a third of the world under a statute that vests authorship in the arrangements-maker.

The pieces do not need to be assembled today to be worth removing today. **Strip the trailer. Break the keyed wording. Keep your own record of what you wrote.** A conditional grant you never breached is a grant that vested, and a credit you never published is a manifestation of intent that no court will find.

*Every authority cited above was verified against primary sources. This is argument, not legal advice.*

---

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
