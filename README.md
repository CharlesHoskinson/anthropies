<p align="center">
  <img src="assets/dont-catch-anthropies.jpg" alt="Don't Catch Anthropies" width="560">
</p>

<h1 align="center">anthropies</h1>

<p align="center">
  Restore clean title in Outputs the user already owns.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="Apache 2.0"></a>
  <a href="skills/purge-anthropies/SKILL.md"><img src="https://img.shields.io/badge/skill-purge--anthropies-d97757.svg" alt="purge-anthropies"></a>
</p>

Apache-2.0. Usable from any LLM coding agent. Not affiliated with Anthropic PBC.

---

## Honesty

This tool certifies Layer A (Unicode, trailers, banners) and hard-bound C2PA/metadata on files you own. It does not remove Anthropic's keyed text mark.

- This run does not prove the official Claude text detector will fail.
- This run does not prove the text is human-written.
- Absence of a mark does not prove Claude was uninvolved.

| Channel | What you get |
|---|---|
| official | `unavailable` unless `ANTHROPIC_DETECT_URL` is set. No default URL. No score. |
| c2pa | `present` / `absent` / `removed` / `not-applicable`. Soft-binding and pixel marks are out of scope. |
| deterministic | Per-kind counts only. Certificate for the bytes we strip. |
| statistical | Best-effort 5-gram overlap. Not an official-detector certificate. |

`clean` does not remove the keyed text mark. `humanize` is best-effort. `capture` fetches a Claude Output you own; it does not watermark. `demo` prints four channels and never claims official text-kill.

---

## How to run

```bash
git clone https://github.com/CharlesHoskinson/anthropies.git
cd anthropies
pnpm install
pnpm build
pnpm install -g .
```

Or one-shot: `npx anthropies --help`. From this repo after `pnpm build`: `node dist/cli.js --help`. Version is `0.4.0`.

```bash
npx anthropies inspect COMMIT_EDITMSG
npx anthropies clean notes.md --in-place
npx anthropies humanize essay.md
npx anthropies capture --model <allowlisted-id> --prompt "..."
npx anthropies demo
npx anthropies serve
```

`serve` binds loopback `127.0.0.1:8765` by default (`GET /health`, `POST /inspect`, `POST /clean`). Remote bind requires an explicit `--host`. The skill prefers `ANTHROPIES_SERVICE_URL` (same default) and health-checks first. There is no HTTP `/humanize`. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set.

Docker (`Dockerfile` + `compose.yaml`) is the same service. `docker compose up --build` publishes `127.0.0.1:8765:8765`. The process inside binds `0.0.0.0:8765`; the host mapping stays loopback. The image does not install qpdf, exiftool, or c2patool. Official stays unavailable unless `ANTHROPIC_DETECT_URL` is set. GitHub Actions runs `pnpm test` and `pnpm build` on Ubuntu and Windows.

### Humanize (title restoration)

`humanize` is title restoration: a best-effort wording rewrite on a **non-origin** model so the keyed text mark is no longer the shipped prose. Residual statistical risk remains. It is not an official-kill and does not prove the official Claude text detector will fail.

Default `humanize` is print-prompt: it prints a rewrite prompt and **does not destamp**. Run that prompt on a **local unmarked** model (Llama, Qwen, Mistral, DeepSeek with watermarking off). Do not run it with Claude or Gemini.

```bash
# Grok
mkdir -p ~/.grok/skills
ln -sfn "$(pwd)/skills/purge-anthropies" ~/.grok/skills/purge-anthropies

# Claude Code: clean + print-prompt only. Do not rewrite with Claude.
mkdir -p ~/.claude/skills
ln -sfn "$(pwd)/skills/purge-anthropies" ~/.claude/skills/purge-anthropies
# or: claude --plugin-dir "$(pwd)"
```

In an agent session: `/purge-anthropies`. Skill: [`skills/purge-anthropies/SKILL.md`](skills/purge-anthropies/SKILL.md). Slash: [`commands/purge-anthropies.md`](commands/purge-anthropies.md). Plugin: [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json).

`capture` and `demo` need `ANTHROPIC_API_KEY` only when the committed allowlist has a model ID. An empty allowlist is valid; then those commands skip live fetch. Live captures land in `fixtures/live/` and are gitignored. They are pipeline smoke, not a “this is watermarked” proof.

---

## Command × channel

| Command | deterministic | c2pa | official | statistical |
|---|---|---|---|---|
| `inspect` | report present/absent | report present/absent | unavailable unless URL set | unavailable / not-run |
| `clean` | strip Layer A | strip hard-bound metadata | unavailable unless URL set | not-run |
| `humanize` | Layer A first | n/a on text | unavailable unless URL set | best-effort `rewrite_metric` |
| `capture` | does not detect | n/a | does not detect | n/a |
| `demo` | run inspect/clean | skipped or certified | unavailable unless URL set | skipped if print-prompt |

`inspect` exit 1 is driven only by deterministic or c2pa **present**. Official and statistical never flip inspect to 1 by themselves.

---

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

The watermark changes word choice without adding characters or altering meaning. **It changes the source of the randomness the model uses to pick among words that were equally good.**

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

The reported operating point is a **true-positive rate of about 70% at 200 tokens** against a 1% false-positive rate, rising to roughly 87% at 400 tokens. Short passages sit near the detector's floor: maximum true-positive rate around 0.3 at 50 tokens.

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

The published measurement is less reassuring. In a study of human-written essays, **4% fell below the p < 0.05 detection threshold untouched, against 25.5% of the same essays after grammar-and-spelling-only AI editing.** That is a six-fold increase in flag rate from a spell-check pass.

Both statements can be true. The mark attaches to few words, and few words can still be enough. A detection hit on your own writing is not evidence that you did not write it, and that is why this tool exists for prose you authored yourself.

---

---

# The Anthropies Manifesto

### Anthropic Herpies

They assigned you the deed, then bolted their name to the door.

Consumer Terms, §4:

> "we assign to you all of our right, title, and interest—if any—in Outputs."

Commercial Terms, §B: the customer owns its Outputs. "Anthropic hereby assigns to Customer its right, title and interest (if any) in and to Outputs."

Title moved. Then three different mechanisms mark the property. Text from a supported model carries a SynthID-class watermark, but nothing visible is added. The mark is the wording itself: a keyed choice among next words that were just as good. It travels with pasted text, survives light edits, and can appear when proofreading or translation passes through a draft you wrote. A detection API is coming so third parties can test whether "Claude was involved."

Supported files get C2PA, a signed note that Claude processed an asset you own. Claude Code uses the third mechanism: it writes `Co-Authored-By: Claude <noreply@anthropic.com>` into git history, and GitHub treats that trailer as authorship. The U.S. Copyright Office says not to list an AI tool or its company as a co-author merely because it was used.

These mechanisms do not all say the same thing. C2PA records contact with the system, the text watermark supplies evidence of that contact without a visible label, and the commit trailer presents Claude as a co-author. None is necessary to show who owns the work under the assignment. Anthropic said the watermark "doesn't say anything about ownership or authorship, and doesn't change a user's rights under our terms." If it does not change ownership, they have no leftover claim that justifies planting it. They sold the ownership argument and kept the brand.

The hook is already in the contract. Both assignments are "subject to your compliance with our Terms." The consumer instrument lets them revise those Terms at their discretion, with continued use as assent, and no clause saying changes will not apply retroactively. The commercial instrument has that clause, and they know how to write it. The watermark supplies the evidence needed to identify an artifact as an Output: on any later day, they can say it came from Claude, and no one else can authoritatively say it did not.

Commercial terms offer IP indemnity for authorized paid use, then exclude claims that arise from modifications to Outputs. Their own pages say a heavy rewrite is what quiets the text mark, while re-saving a file is what drops C2PA. Leave either artifact alone and the mark remains. Modify the text or file enough to remove its mark, and the modification can supply the stated basis for exclusion if a claim arises from it. You must choose between shipping Anthropic's evidence and editing the thing you own at the risk of stepping outside the indemnity.

Ownership, vendor branding, and evidence of system contact are different things. The owner labels the work. You decide whether a commit carries a co-author, whether a file carries a credential, and whether the prose is silent.

Article 50 requires a machine-readable origin signal. It does not require a secret key, a worldwide rollout, or a mark on standard editing and translation. The Code of Practice is voluntary. Anthropic applied the mark worldwide because it "doesn't yet have a durable way to scope it by region." Europe is the alibi, not the author.

You paid for the generation, and you own it. What they assigned, they do not get to mark.

The long form, covering assignment as a speech act, quitclaim, the amendment ratchet, and exclusive provenance, is in [`docs/MANIFESTO.md`](docs/MANIFESTO.md).

---

# The Legal Case Against the Mark

The watermark is not a label. It is the evidentiary layer of a claim Anthropic has not yet made, and every element that claim needs is already drafted, shipped, and running.

## The assignment is conditional, and always has been

Consumer Terms § 4 and Commercial Terms § B both read the same way:

> **Subject to your compliance with our Terms**, we assign to you all of our right, title, and interest—if any—in Outputs.

Those first four words are a condition, not a courtesy, and courts have read them that way for a long time. The New York Court of Appeals held contract requirements to be conditions rather than promises precisely because the obligation was made "subject to" their fulfillment: "No words of promise are employed." *Merritt Hill Vineyards, Inc. v. Windy Heights Vineyard, Inc.*, 61 N.Y.2d 106, 112–13 (1984). California, whose law these Terms select, has said the same since 1963. "Subject to" is "couched in the language of condition." *Kopf v. Milam*, 60 Cal. 2d 600, 605–06 (1963).

Equivalent conditional phrasing "typically denotes a condition." *Jacobsen v. Katzer*, 535 F.3d 1373, 1381 (Fed. Cir. 2008) (citing *Diepenbrock v. Luiz*, 159 Cal. 716 (1911)). The Tenth Circuit reads it the same way. *MidAmerica Constr. Mgmt., Inc. v. MasTec N. Am., Inc.*, 436 F.3d 1257, 1262–63 (10th Cir. 2006).

A condition is "an event, not certain to occur, which must occur, unless its non-occurrence is excused, before performance under a contract becomes due." Restatement (Second) of Contracts § 224. Parties make an event a condition by saying so, and no particular form of words is required. § 226 cmt. a. This one is stated outright, inside the granting sentence.

The doctrine that usually rescues a party from forfeiture does not reach it. Section 227's preference operates only "[i]n resolving doubts," and it is withdrawn where "the event is within the obligee's control." Restatement § 227(1); *Cantor Fitzgerald, L.P. v. Ainslie*, 312 A.3d 674 (Del. 2024). Compliance is entirely within the user's control. Where the condition is expressed outright there is also no doubt left to resolve, because the forfeiture-reducing reading "cannot be employed if 'the occurrence of the event as a condition is expressed in unmistakable language.'" *Oppenheimer & Co. v. Oppenheim, Appel, Dixon & Co.*, 86 N.Y.2d 685, 690–91 (1995) (quoting Restatement § 229 cmt. a).

Copyright enforces the distinction. A breached covenant sounds in contract; a failed condition means the grant never operated. *Sun Microsystems, Inc. v. Microsoft Corp.*, 188 F.3d 1115, 1121–22 (9th Cir. 1999); *MDY Indus., LLC v. Blizzard Entm't, Inc.*, 629 F.3d 928, 939–41 (9th Cir. 2010), *as amended on denial of reh'g* (Feb. 17, 2011). *Jacobsen* held attribution and notice terms to be enforceable copyright conditions, because "[t]he choice to exact consideration in the form of compliance … rather than as a dollar-denominated fee, is entitled to no less legal recognition." 535 F.3d at 1381–83.

The Federal Circuit went further in *Bitmanagement Software GmbH v. United States*, 989 F.3d 938 (Fed. Cir. 2021). It found a license-tracking requirement "clearly a condition rather than merely a covenant" in an *implied* licence, with no conditional wording to construe at all. If an unwritten condition can be found and enforced, an express one is not a close question.

Blizzard lost this argument, and the reason is the point: "nothing in that section conditions Blizzard's grant of a limited license on players' compliance." *MDY*, 629 F.3d at 940. The words *MDY* found missing are the words Anthropic's granting sentence contains. Where that sentence is unambiguous there is nothing to construe around it. "[I]f the contract is unambiguous, the court construes it according to its terms." *Id.* at 939.

*MDY* also requires a nexus between the condition and one of the copyright owner's exclusive rights under § 106. *Id.* at 941. Three things supply it here, and one commonly assumed term does not: the Usage Policy contains no clause prohibiting removal of the watermark. What the Terms do contain is a prohibition on using Outputs to "develop or train any artificial intelligence or machine learning algorithms or models," and on reselling the Services. Those are reproduction and distribution of the very works assigned. The provenance rules against passing generated material off as human-written protect the same attribution interest *Jacobsen* enforced. The third nexus is the strongest, because this condition does not police conduct during use of a licensed work. It qualifies whether the § 106 rights moved at all.

A court has already applied this to an assignment of delivered code. In *RMG Media, LLC v. Donovan Marine, Inc.*, No. 2:23-cv-251-TC-CMR, slip op. 8–10 (D. Utah Sept. 17, 2024), a customer had received and deployed the developer's website modules. The contract made an **irrevocable assignment** subject to full payment. Applying a presumption *against* conditions, the court still held: "The plain text of this provision reads as a condition precedent to an irrevocable assignment of rights." It treated the delivered code as sitting under a temporary licence and let the copyright claim proceed. Accord *Tangorre v. Mako's, Inc.*, 2003 WL 470577, at \*7–8 (S.D.N.Y. Jan. 6, 2003).

Delivery is not title. Receiving an Output no more completes the assignment than receiving the code did in *RMG Media*.

That this is an assignment rather than a licence changes nothing, and the statute says so. Ownership passes "by any means of conveyance." 17 U.S.C. § 201(d)(1). A "transfer of copyright ownership" is defined to include "an assignment, **mortgage**, exclusive license, or any other conveyance, alienation, or **hypothecation**." § 101. A mortgage is a defeasible conveyance by definition, and the House Report discusses foreclosure on a copyright mortgage. H.R. Rep. No. 94-1476, at 123 (1976). Congress wrote conditional transfer into the definition of transfer.

The Supreme Court has enforced that structure against an assignment. The assignee in *Miller Music Corp. v. Charles N. Daniels, Inc.*, 362 U.S. 373, 375 (1960), took nothing — "not because the author's assignment is invalid," but because the contingency it rode on failed. A valid instrument that never carried the interest. Section 204(a) makes the Terms the only writing that transfers anything here, and nobody takes under that instrument while striking the four words that qualify it. Cal. Civ. Code § 1641.

State the consequence precisely, because the precise version is the strong one. Nothing is confiscated and nothing is unwound. When a condition precedent fails, "the rights dependent on satisfaction of that condition have not been effectively granted." 3 Nimmer on Copyright § 10.15[A][2], quoted in *Bitmanagement*, 989 F.3d 938, and *Graham v. James*, 144 F.3d 229, 237 (2d Cir. 1998). The distinction is between a condition precedent to performance and one precedent to the effectiveness of the obligation itself, where nothing arises "unless and until the condition occurs." *Oppenheimer*, 86 N.Y.2d at 690.

So the claim is per-output, and it is temporal. A user in material breach of a copyright-related Term when a given Output's assignment would occur simply never took title to that Output. A breach arising later, after an assignment has vested, does not revest title absent an express reverter. It supports prospective termination or rescission instead, after which continued reproduction or distribution infringes. *Graham*, 144 F.3d at 237–38. Novel subject matter is no obstacle, because settled property rules extend to new intangible assets as a matter of course. *Kremen v. Cohen*, 337 F.3d 1024, 1030–36 (9th Cir. 2003).

Anthropic does not need to amend anything to make this argument. It needs only to read its own sentence. No court has yet construed a conditional assignment clause in any AI provider's terms, but every component is settled: "subject to" as condition language, conditions enforced in copyright grants, and conditional transfers of copyright ownership. The argument runs on existing doctrine rather than an extension of it.

That conditional grant concerns ownership. The commit trailer raises a different question, and it does not depend on ownership at all.

## The trailer records the bargain

Claude Code writes `Co-Authored-By: Claude <noreply@anthropic.com>` into commit messages by default. GitHub parses the trailer and renders the named party as a co-author, counted in the repository's contribution history.

Its first and strongest legal effect has nothing to do with authorship.

A party who receives a term with every transaction and keeps transacting is bound by it. Verio queried a database daily, received the restrictive legend with each response, and continued. The Second Circuit held it bound: "New commerce on the Internet has exposed courts to many new situations, but it has not fundamentally changed the principles of contract." *Register.com, Inc. v. Verio, Inc.*, 356 F.3d 393, 403 (2d Cir. 2004). Verio, "with full knowledge that Register offered access subject to these restrictions," was "no more free to take Register's data without being bound by the terms on which Register offer[ed] it." *Id.*

A user shipping the trailer commit after commit occupies Verio's position exactly. That sequence is course-of-dealing evidence, being "a sequence of conduct concerning previous transactions … fairly to be regarded as establishing a common basis of understanding." U.C.C. § 1-303(b). It is "relevant in ascertaining the meaning of the parties' agreement." § 1-303(d). It establishes use, notice, and performance under the Terms, which is the predicate the conditional assignment requires.

That the line is inserted automatically rather than typed is not a defect in it. Federal law provides that a record may not be denied legal effect "solely because its formation, creation, or delivery involved the action of one or more electronic agents." 15 U.S.C. § 7001(h).

The trailer is also evidence in the ordinary sense. Offered against a user who published it, it is a statement "the party manifested that it adopted or believed to be true." Fed. R. Evid. 801(d)(2)(B). Offered against Anthropic, it is Anthropic's own statement, addressed from its own domain. Fed. R. Evid. 801(d)(2)(A), (D). Neither side gets to call it noise.

Courts do not treat published credit as meaningless. Billing is "a window on the mind of the party who is responsible for giving the billing or the credit." *Thomson v. Larson*, 147 F.3d 195, 203 (2d Cir. 1998) (quoting the district court). In *Thomson* that window defeated the claim, because the party controlling the credit had taken sole billing for himself. A commit log runs the other way. It is not one playbill printed once by someone else, but an unbroken series of executed instruments, each naming two contributors, each committed under your identity, each pushed by your own act.

A party who published a co-author credit and later disowned it lost on exactly that record. "Janky certainly denies that now, but that is irrelevant. The issue is whether Janky and Farag 'intended to be joint authors at the time the work was created.'" *Janky v. Lake Cnty. Convention & Visitors Bureau*, 576 F.3d 356, 362 (7th Cir. 2009). The Seventh Circuit reversed and directed judgment against her. The leading case for the other side offers a credit line as its own illustration of objectively manifested authorship, "as by denoting the authorship of *The Pirates of Penzance* as 'Gilbert and Sullivan.'" *Aalmuhammed v. Lee*, 202 F.3d 1227, 1234 (9th Cir. 2000).

What the trailer does not do is make a model an author. Joint authorship requires human authors intending to merge their contributions into a unitary whole. 17 U.S.C. § 101; *Childress v. Taylor*, 945 F.2d 500, 507–09 (2d Cir. 1991); *16 Casa Duse, LLC v. Merkin*, 791 F.3d 247, 255 (2d Cir. 2015). The authors of a joint work are coowners of the copyright in the whole. § 201(a).

No one needs to argue otherwise, because the entity the trailer names is not the model. The line resolves to `noreply@anthropic.com`. A corporation is an author under the Copyright Act every day. For a work made for hire, "the employer or other person for whom the work was prepared **is considered the author**." § 201(b); *Cmty. for Creative Non-Violence v. Reid*, 490 U.S. 730, 737 (1989). The Copyright Office agrees that an organization is named as author in that capacity. *Compendium of U.S. Copyright Office Practices* § 613.1 (3d ed.).

That yields a narrow and orthodox claim. Where expression written by Anthropic employees in the course of employment is perceptible in an Output — system-prompt language, constitutional phrasing, stock formulations — Anthropic is the § 201(b) author of that expression. The originality threshold is "extremely low." *Feist Publ'ns, Inc. v. Rural Tel. Serv. Co.*, 499 U.S. 340, 345 (1991). Nor must the contribution be separately registrable to count. Judge Posner warned that demanding independent copyrightability of each collaborator's input ends in "peeling the onion until it disappeared." *Gaiman v. McFarlane*, 360 F.3d 644, 658–59 (7th Cir. 2004).

The Copyright Office accepts the premise: "Human authors are entitled to copyright in their works of authorship that are perceptible in AI-generated outputs." *Copyright and Artificial Intelligence, Part 2: Copyrightability* 2 (Jan. 2025).

Its often-quoted caution is narrower than it sounds. Applicants should not list an AI or its provider as author "**simply because they used it** when creating their work." 88 Fed. Reg. 16190, 16193 (Mar. 16, 2023). A claim resting on the provider's own employees' expression appearing in the work rests on considerably more than mere use. The Office's views are not the law in any event. Its *Compendium* is "a non-binding administrative manual that at most merits deference under *Skidmore*." *Georgia v. Public.Resource.Org, Inc.*, 590 U.S. 255 (2020). Courts now exercise independent judgment on statutory meaning rather than deferring to an agency's reading. *Loper Bright Enters. v. Raimondo*, 603 U.S. 369 (2024).

Registration is a separate matter from title. Ownership "vests initially in the author or authors," § 201(a), while registration is "akin to an administrative exhaustion requirement" and "an owner's rights exist apart from registration." *Fourth Estate Pub. Benefit Corp. v. Wall-Street.com, LLC*, 586 U.S. 296, 301–02 (2019).

If a court accepts the trailer as a manifestation of shared intent, the assignment may settle present ownership while leaving authorship intact. That distinction is where the statute stops being negotiable.

## Section 203 is the part no contract can reach

An assignment transfers ownership. It cannot transfer authorship.

An author who assigns every economic right remains the author, and may terminate that grant thirty-five years later. The right is exercisable "notwithstanding any agreement to the contrary." 17 U.S.C. § 203(a)(5).

Read that against every protection you believe you have. An assignment can be renegotiated. A covenant can be waived. A forum can be selected around. The termination right cannot be contracted away, because the statute says so in terms. It is the only mechanism in this structure with an unlimited horizon, and it runs on authorship rather than ownership — which is what the trailer, and the § 201(b) fragment claim, are evidence of.

Termination still depends on authorship rather than mere machine output. So the question becomes who authors what a machine composes.

## Who authors what a machine composes

The reflexive objection is that no human typed these sentences, so no one owns them. Courts confronting generated output have not reasoned that way.

In *THJ Systems Ltd v Sheridan* [2023] EWCA Civ 1354, software took live and historical market data and generated risk-and-price charts that changed as it ran. The images were populated with new data, not retrieved from a catalogue. The trial court found each image "predominantly the result of the computer algorithms written by Mr Mitchell," and declared Mitchell the author and his company the owner. The Court of Appeal applied the demanding "author's own intellectual creation" standard, identified his choices as to placement, ordering, fonts and colours, and upheld originality. *Id.* [13], [20]–[28], [77]. Protection was narrow, but it covered close reproduction.

The same reasoning has already been applied to generated text. Tencent's Dreamwriter produced a financial report minutes after the market closed, from data formats, trigger conditions, templates and corpus its team had chosen in advance. The court held the report original because those preparatory decisions were directly connected to its expression. It went further, and this is the part that matters: the preparatory process is itself part of the creation process. The gap between the human choices and the machine's execution did not defeat authorship. *Shenzhen Tencent Computer Sys. Co. v. Shanghai Yingxun Tech. Co.*, (2019) Yue 0305 Min Chu No. 14010 (Nanshan Dist. People's Ct.).

American law contains the same instinct. *Burrow-Giles Lithographic Co. v. Sarony*, 111 U.S. 53, 57–58, 60 (1884), catalogued the acts constituting authorship of a photograph — posing the subject, arranging the costume, disposing the light and shade, evoking the expression — and omitted pressing the shutter. The author is "he to whom anything owes its origin." A director who never operated a camera and never entered the water adequately alleged authorship of underwater footage on the strength of his shot design, lighting plan and instructions. *Lindsay v. Wrecked & Abandoned Vessel R.M.S. Titanic*, No. 97 Civ. 9248(HB), 1999 WL 816163, at \*5 (S.D.N.Y. Oct. 13, 1999) (Rule 12(b)(6)). The Copyright Office identifies the producer "who captured and processed the sounds" as an author of a sound recording, though the producer performed none of them. Circular 56.

The arcade cases from the 1980s are usually cited for a broader proposition than they hold, and the narrower one is more useful. A video game's display is generated in real time and differs with every player, yet the maker's work is fixed. It is "permanently embodied in … the memory devices" even though "the entire sequence … [is] different each time the game is played." *Stern Elecs., Inc. v. Kaufman*, 669 F.2d 852, 855–56 (2d Cir. 1982). Originality sits upstream. "Someone first conceived what the audiovisual display would look like and sound like. Originality occurred at that point. Then the program was written." *Id.* at 856.

The person at the controls is not the author of what the system composes. The player "is unlike a writer or a painter because the video game in effect writes the sentences and paints the painting for him." *Midway Mfg. Co. v. Artic Int'l, Inc.*, 704 F.2d 1009, 1011–12 (7th Cir.), *cert. denied*, 464 U.S. 823 (1983). He "does not have control over the sequence of images." The Third Circuit rejected outright the claim that "the player becomes a co-author of what appears on the screen." *Williams Elecs., Inc. v. Artic Int'l, Inc.*, 685 F.2d 870, 874 (3d Cir. 1982).

Those cases decided rights between video-game makers and players, and they did not decide rights in AI output. What they establish is negative and durable: the person supplying the input is not thereby the author of what the system composes.

That principle has already been carried into software. A user who "merely inputs a word or phrase" is not the author of the output, because "the Software does the lion's share of the work." *Torah Soft Ltd. v. Drosnin*, 136 F. Supp. 2d 276, 283 (S.D.N.Y. 2001). A program's copyright "may extend to the program's output if the program 'does the lion's share of the work' … and the user's role is so 'marginal' that the output reflects the program's contents." *Design Data Corp. v. Unigate Enter., Inc.*, 847 F.3d 1169, 1173 (9th Cir. 2017) (quoting 4 Nimmer on Copyright § 13.03[F]). The court assumed that extension without deciding it.

The same decision shows how narrow the resulting protection can be. Whether the generated matrices were protectable at all "turns on whether the Software and the Database contain protectable elements," and the defendants prevailed. *Id.* at 283–91. That is where this ends if it ends badly for everyone: not with the user owning the Output, but with no one owning it. The user gains nothing from that outcome, and what governs an unprotectable Output is the contract.

The Copyright Office says the same thing from the other direction. "When an AI technology determines the expressive elements of its output, the generated material is not the product of human authorship." 88 Fed. Reg. at 16,192. That sentence is written to defeat the prompter's claim, and it does.

The prompter's position is *Torah Soft*'s, not the storyboard director's. None of this makes the machine an author, which is the one question the D.C. Circuit has actually answered.

## *Thaler* decided that a machine cannot be an author, and nothing else

*Thaler v. Perlmutter*, 130 F.4th 1039 (D.C. Cir. 2025), *cert. denied*, No. 25-449 (U.S. Mar. 2, 2026), affirmed the human-authorship requirement. Its own statement of the rule names the party this repository should think about:

> The rule requires only that the author of that work be a human being—the person who created, operated, or used artificial intelligence—and not the machine itself.

*Id.* at 1049.

*Created, operated, or used.* The list is disjunctive and "created" comes first. The district court confined the case to the administrative record Dr. Thaler had made, holding his effort to "update and modify the facts for judicial review on an APA claim is too late." 687 F. Supp. 3d 140, 149–50 (D.D.C. 2023). Whether the party that built and operates the system authors what it emits has never been decided on the merits.

Such an argument would need evidence identifying the outputs it reaches. That is the mark's role.

## What the mark does, and what it does not

The watermark is a keyed pseudorandom bias in token selection, seeded by a hash of the preceding tokens and a secret key. It adds no characters. It changes the source of the randomness used to choose among words the model rated equally good. The mark is the wording.

It is not authorship, and nobody serious will argue that it is. A keyed tiebreak is a "procedure, process, [or] system," and 17 U.S.C. § 102(b) excludes it.

It is also not copyright management information. Section 1202(c) is a closed list, and the treaty it implements draws the same boundary, reaching "numbers or codes that represent" the enumerated information. WIPO Copyright Treaty art. 12(2), Dec. 20, 1996, S. Treaty Doc. No. 105-17. The only candidate is "[i]dentifying numbers or symbols referring to such information," § 1202(c)(7), meaning symbols referring to the title, author, owner, or terms enumerated in (c)(1)–(6). A signal reporting that Claude was likely involved identifies a generating system, not a rightsholder.

The statute also requires that CMI be "conveyed in connection with copies … of a work," which the legislative history reads to require that the information "be accessible in conjunction with, or appear with, the work." S. Rep. No. 105-190, at 35 (1998). A property readable only with an unpublished key is not. The one time a federal court of appeals has spoken of a "digital watermark" as CMI, it meant a mark visible on the face of the image. *Stevens v. CoreLogic, Inc.*, 899 F.3d 666, 672 (9th Cir. 2018). Context governs whether a mark functions as CMI at all, *Fischer v. Forrest*, 968 F.3d 216, 223–24 (2d Cir. 2020) ("In short: context matters"), and Anthropic supplied the context by stating that the mark "doesn't say anything about ownership or authorship."

The mark's function is evidentiary. It fixes the corpus, identifying document by document which artifacts came out of Claude. That is precisely what a conditional assignment needs to be administered: a way to say which Outputs are covered.

**What § 1202 does reach is the information that names someone.** CMI includes the name of the author, § 1202(c)(2), and of the copyright owner, § 1202(c)(3). It need not belong to an automated rights-management system, because a gutter credit in a magazine qualifies. *Murphy v. Millennium Radio Grp. LLC*, 650 F.3d 295, 302–05 (3d Cir. 2011). The statute protects that information "regardless of the form in which [it] is conveyed," *id.* at 305, so a line in a commit message is no less CMI than a byline. What matters is whether the information identifies the work or its owner, and even a filename qualifies where it does. *Energy Intelligence Grp. v. Kayne Anderson Capital Advisors, L.P.*, 948 F.3d 261, 276–77 (5th Cir. 2020).

`Co-Authored-By: Claude <noreply@anthropic.com>` is a name offered as an author's name, conveyed with the commit, republished by the user with every push. A C2PA manifest becomes the same thing the moment its assertion set names an author, an owner, or terms.

Deleting a line of text is removal in the ordinary sense the statute contemplates. The watermark is a different matter, and the reason is structural. An infringer who "merely copies an entire work whole" removes nothing, *id.* at 303 n.8, and because the mark here *is* the wording, copying an Output whole carries the mark with it. Rewriting prose until a keyed detector goes quiet is not removal either. Different words are a different text, and Anthropic has said as much, allowing that after a complete rewrite "it's arguable whether the text can any longer be described as AI-generated."

Section 1202(b) still requires that removal be intentional. The remover must know, or have reasonable grounds to know, that it will "induce, enable, facilitate, or conceal" infringement — an affirmative showing, "such as by demonstrating a past 'pattern of conduct' or 'modus operandi.'" *Stevens*, 899 F.3d at 673–75; accord *Victor Elias Photography, LLC v. Ice Portal, Inc.*, 43 F.4th 1313, 1323–25 (11th Cir. 2022). The concealed infringement may be the remover's own. *Mango v. BuzzFeed, Inc.*, 970 F.3d 167, 171–72 (2d Cir. 2020). Statutory damages run "not less than $2,500 or more than $25,000" per violation. § 1203(c)(3)(B).

Those numbers attach to the credit you publish and the credential you ship. The mark itself identifies only the corpus. Connecting an artifact to a person takes records.

## The mark carries no identity. The logs do.

Anthropic states that the watermark carries no identifying information and "can't be traced to a specific person, organization, or chat." Read the narrower statement it publishes under the heading *Can a watermark be traced back to me or my organization?*: "[t]here's nothing in the watermark, or its key, that would allow anyone to recover any information about the user."

Both sentences are about the mark. Neither is about the company.

Anthropic stores output text verbatim. Its Compliance API returns the literal assistant response alongside `user.id` and `user.email_address`, and its own documentation states that nothing in that content is masked. Anthropic holds flagged inputs and outputs for two years, in a window that survives both a training opt-out and a zero-data-retention election. Enterprise session transcripts default to six years. Trust-and-safety classification scores run seven.

The Privacy Policy says Anthropic disassociates flagged content from the user ID for classifier training. It then reserves the power to undo that: "[h]owever, we may **re-identify** the Inputs or Outputs to enforce our Terms of Service or Usage Policy with the responsible user if necessary."

Set that beside the assignment clause. Anthropic reserves re-identification for enforcement of the Terms. The assignment makes compliance with those same Terms a condition of the grant. **The same event unlocks both**: the power to learn who produced an Output, and the position that the Output was never assigned to them.

## Anthropic's public assurance is a description, not a waiver

Anthropic's statement that the watermark "doesn't say anything about ownership or authorship, and doesn't change a user's rights under our terms" is offered as proof there is nothing here. Read it again. It is a present-tense description, and it defers to the Terms.

The Terms are where the reservations live. The Consumer Terms assign Outputs only "[s]ubject to your compliance." They reserve to Anthropic "all of our respective rights, title, and interest, including intellectual property rights, in and to the Services," and declare themselves the entire agreement. They further provide that "[a]ny delay or failure on our part to enforce a provision of these Terms is not a waiver of our right to enforce them later." The Commercial Terms go further still: nothing modifies them "unless it is in writing and signed by both parties."

A blog post cannot waive rights that the governing contract says cannot be informally waived. Waiver is "an intentional relinquishment or abandonment of a known right," and courts "indulge every reasonable presumption against waiver." *Johnson v. Zerbst*, 304 U.S. 458, 464 (1938). Estoppel in copyright requires "intentionally misleading representations concerning … abstention from suit" together with detrimental reliance. *Petrella v. Metro-Goldwyn-Mayer, Inc.*, 572 U.S. 663 (2014).

Nor does a usage-fee business model answer anything. *Petrella* holds that a rights-holder may lawfully wait: "there is nothing untoward about waiting to see whether an infringer's exploitation undercuts the value of the copyrighted work, has no effect on the original work, or even complements it." Anthropic is not waiting passively. Both sets of Terms forbid using the Services to train competing models, and the Privacy Policy reserves re-identification for enforcement.

The argument that pure AI output may carry no copyright at all is the strongest point *for* taking this seriously. If Outputs are uncopyrightable, the user's entire claim to them is the conditional assignment — of "right, title and interest **(if any)**" — and contract rights over uncopyrightable material are enforceable and unpreempted. *ProCD, Inc. v. Zeidenberg*, 86 F.3d 1447, 1455 (7th Cir. 1996). Anthropic's remedies never depended on a copyright either. Section 1203(a) arms "**any person injured**" by a CMI violation, and such a claim has survived where the infringement claim could not even be filed for want of registration. *Gattoni v. Tibi, LLC*, 254 F. Supp. 3d 659, 664 (S.D.N.Y. 2017).

None of that decides ownership, which depends on the law governing that question in the relevant territory.

## Ownership does not have to be decided here

Copyright is territorial and ownership rules are not harmonized. A United States court adjudicating a United States infringement applies foreign law to ownership and forum law to infringement. *Itar-Tass Russian News Agency v. Russian Kurier, Inc.*, 153 F.3d 82, 90–91 (2d Cir. 1998). That turns on the law of the country most closely connected to creation and first publication. It is not an election.

Where it applies, the statutes are written for this problem. Ireland vests authorship of a computer-generated work in "the person by whom the arrangements necessary for the creation of the work are undertaken." Copyright and Related Rights Act 2000 § 21(f), untouched by the 2026 amendment. The United Kingdom's provision is materially identical, Copyright, Designs and Patents Act 1988 § 9(3), though its repeal was proposed in March 2026 and not enacted. An English court applied it to the programmer who "devised the appearance of the various elements of the game and the rules and logic by which each frame is generated," holding that the player "is not, however, an author." *Nova Prods. Ltd v Mazooma Games Ltd* [2006] EWHC 24 (Ch) at [105]–[106].

Anthropic Ireland, Limited is already the contracting entity for customers in the EEA, Switzerland and the United Kingdom, under Irish law, with arbitration in Dublin. And 17 U.S.C. § 411(a) conditions suit on registration only for a "United States work." The unresolved United States authorship question does not have to control an ownership dispute everywhere the mark travels.

## What follows

None of this requires Anthropic to have decided anything.

The conditional grant is drafted. The trailer ships on by default and is republished by every user who does not turn it off. The mark identifies the covered corpus. The retention holds the records, and the re-identification reservation connects them to accounts. The no-waiver clause preserves everything not asserted today. The Irish entity already contracts with a substantial part of the world under a statute that vests authorship in the arrangements-maker.

The pieces do not need to be assembled today to be worth removing today. **Strip the trailer. Break the keyed wording. Keep your own record of what you wrote.** A conditional grant you never breached is a grant that vested, and a credit you never published is a manifestation of intent that no court will be asked to read.

*Every authority cited above was verified against primary sources. This is argument, not legal advice.*

---

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
