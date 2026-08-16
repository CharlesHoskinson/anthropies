# README Editorial Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite and expand `README.md` so its explanations flow naturally, its existing voice remains intact, and every ASCII diagram has deliberate fixed-width alignment.

**Architecture:** Make one targeted pass over the technical and operational half, then a second pass over the manifesto and legal half. Finish with a whole-document humanizer audit and mechanical validation. Preserve the README's order and treat every factual statement, quotation, authority, link, command, and diagram relationship as an invariant.

**Tech Stack:** GitHub-flavored Markdown, Unicode box-drawing characters, Bash validation commands, Python 3, pytest

## Global Constraints

- Modify `README.md` only; the plan and design documents are already complete.
- Keep the existing order: technical explanation, tool documentation, manifesto, and legal argument.
- Preserve the direct technical voice and the sharper manifesto and legal cadence.
- Do not change the project's technical claims, legal claims, citations, commands, links, authorial position, branding, licensing, or hero image.
- Added prose must explain a mechanism, connect an inference, or prepare the reader for the next section. It must not restate a heading or diagram.
- Keep quotations verbatim. Preserve legal citation typography even when it includes an en dash.
- In original prose, replace formulaic transitions, negative parallelisms, repeated sentence shapes, inflated declarations, detached fragments, generic summary lines, curly quotation marks, and conversational artifacts.
- In original prose, replace em dashes with sentences, commas, colons, or parentheses. Box-drawing glyphs and verbatim quotations are exempt.
- Keep all fenced ASCII diagrams semantically unchanged. Align their edges, arrows, labels, branch points, and continuation text by display column.
- Do not publish, push, or open a pull request.

---

### Task 1: Technical explanation, operational guide, and ASCII diagrams

**Files:**
- Modify: `README.md:17-286`
- Reference: `docs/superpowers/specs/2026-08-16-readme-editorial-revision-design.md`

**Interfaces:**
- Consumes: The existing heading order, named anchors, numeric measurements, commands, links, and diagram semantics in `README.md`.
- Produces: A self-contained explanation of all three marks and an unchanged install/use interface for the final whole-document audit.

- [ ] **Step 1: Record the technical-half invariants before editing**

Run:

```bash
git show HEAD:README.md | sed -n '17,286p' > /tmp/anthropies-readme-technical-before.md
rg -n '^#|^##|^###|^```|70%|87%|0\.3 at 50|4%|25\.5%|anthropies (clean|humanize|inspect)|purge-anthropies' README.md
```

Expected: the snapshot command is silent; the search prints the existing technical headings, 20 fence markers across the full README, all stated measurements, and every documented command name.

- [ ] **Step 2: Rewrite the opening and keyed-watermark explanation**

Edit `README.md:17-154` in place. Keep every heading and measurement, while making these exact improvements:

- Explain in the opening that the marks occupy three different layers: generated wording, file metadata, and commit text. Use that distinction to lead into the first diagram.
- Keep the board-game and digits-of-pi analogy, but remove the instruction-like phrase "so use it" and let the analogy begin directly.
- Follow the seed diagram with prose that connects the preceding *H* tokens, secret key, per-position seed, and g-function scores in one continuous explanation.
- Replace "The model proposes; the tournament disposes" and "worth holding onto" with direct transitions that do not announce their own importance.
- Preserve the two consequences, but give the non-distortionary result enough context to distinguish average output quality from reduced diversity across regenerations.
- Use the prose/code entropy diagram to explain why comments and identifier names remain more exposed than syntax and exact facts.
- Introduce the three detectors by stating what each output means before giving the reported operating point.

Do not change `H = 4`, `30 layers`, `~20 million`, `0.01%`, `70%`, `87%`, `0.3 at 50 tokens`, or the quoted Anthropic language.

- [ ] **Step 3: Rewrite the C2PA, trailer, survival, and proofreading sections**

Edit `README.md:156-219` in place. Make these exact improvements:

- Turn the one-sentence C2PA definition into a short paragraph that explains the hash binding before the diagram and the consequence of removing the manifest after it.
- Explain why the absence of C2PA cannot prove that Claude was uninvolved.
- Connect the trailer's plain-text format to GitHub's co-author rendering without changing the legal conclusion or linked anchor.
- Introduce the survival matrix as a comparison of operations, not as a dramatic reveal.
- Replace "The asymmetry is the whole design" with a concrete explanation of why deterministic cleaning handles channels ② and ③ while prose rewriting is required for ①.
- Preserve the tension between Anthropic's proofreading statement and the 4%/25.5% measurement. Replace the sentence fragment beginning "Which means" with a complete sentence.

- [ ] **Step 4: Rewrite the tool, installation, and usage sections**

Edit `README.md:222-286` in place. Keep every path, table row, shell command, environment variable, model name, refusal rule, and warning. Add brief prose that:

- distinguishes deterministic cleaning from non-origin rewriting before the tables;
- explains how the two tables relate to each other;
- tells the reader why the Claude Code installation is limited to cleaning and prompt printing;
- connects the default printed rewrite prompt to the local-model examples;
- preserves the warning that this is not a certificate against Anthropic's unpublished detector.

Use straight quotation marks in original prose. Do not alter shell syntax inside fenced blocks.

- [ ] **Step 5: Realign all technical ASCII diagrams**

Review the fenced diagrams at current lines 25-208 in a monospaced editor. Apply all of these layout rules:

- In the Claude pipeline, make the right border a stable column and leave at least two spaces between `secret key k` and that border. Center the `TEXT` box under the pipeline output. Keep the three downstream boxes on a shared top and bottom baseline.
- In the seed diagram, keep the context bracket, hash box, `seed r_t`, return arrow, and arrowheads on stable columns. Indent the two-line g-function explanation as one block.
- In tournament sampling, align candidates, g-values, bracket strokes, winners, and the emitted token by round. Keep the source-distribution annotation outside the bracket with a visible gap.
- In the entropy comparison, give the prose and code columns fixed starts. Align token labels and bars independently within each column, and place each conclusion under its own column.
- In the detector diagram, align all three detector names and their explanatory continuations. Keep the Bayesian warning beneath the Bayesian branch.
- In C2PA and trailer diagrams, align box walls and annotation columns. Keep multiline explanatory text at a consistent indentation.
- In the survival matrix, align each operation and result under its column heading without tabs.

Run:

```bash
sed -n '25,208p' README.md
rg -n $'\t| +$' README.md
```

Expected: the diagrams render with stable columns; the second command prints nothing.

- [ ] **Step 6: Audit the first half and commit it**

Run:

```bash
git diff --check
rg -n '^```' README.md
rg -n '70%|87%|0\.3 at 50|4%|25\.5%|anthropies (clean|humanize|inspect)|ANTHROPIES_REWRITE_(BACKEND|MODEL)' README.md
python3 -m pytest -q
```

Expected: `git diff --check` is silent; fence markers remain paired; every measurement and command is present; pytest reports `9 passed`.

Review `git diff -- README.md` against `/tmp/anthropies-readme-technical-before.md`. Confirm that added sentences explain rather than advertise, all diagrams assert the same relationships, and no command or measurement changed.

Commit:

```bash
git add README.md
git commit -m "Rewrite README technical guide and diagrams"
```

---

### Task 2: Manifesto and legal argument

**Files:**
- Modify: `README.md:289-411` in the baseline revision, from `# The Anthropies Manifesto` through the legal disclaimer
- Reference: `docs/superpowers/specs/2026-08-16-readme-editorial-revision-design.md`

**Interfaces:**
- Consumes: The manifesto's combative register, the legal section's brief-like register, every quotation, authority, statutory reference, and link.
- Produces: A more connected argument with the same claims and source support for the final whole-document audit.

- [ ] **Step 1: Record the argumentative invariants before editing**

Run:

```bash
git show HEAD:README.md | sed -n '/^# The Anthropies Manifesto$/,/^## License$/p' > /tmp/anthropies-readme-argument-before.md
rg -n 'Consumer Terms|Commercial Terms|17 U\.S\.C\.|Restatement|Sun Microsystems|MDY|Jacobsen|Childress|Aalmuhammed|Thomson|Stern|Williams|Midway|Thaler|Murphy|Itar-Tass|Nova Prods' README.md
```

Expected: the snapshot command is silent and the search prints every authority currently used by the README.

- [ ] **Step 2: Humanize and expand the manifesto without softening it**

Edit the section from `# The Anthropies Manifesto` through its final link to `docs/MANIFESTO.md`. Keep the heading, subheading, quotations, link, and closing position. Make these exact improvements:

- Connect the assignment quotations to the three marking mechanisms without relying on repeated clipped sentences.
- Vary paragraph rhythm while retaining the opening image of the deed and the door.
- Explain the distinction between ownership, vendor branding, and evidence of system contact in plain prose.
- Replace abstract labels such as "the assay" and "the tripwire" where the surrounding sentence does not make the referent immediately clear. Keep figurative language that remains concrete.
- Expand the indemnity paragraph enough to make the choice between leaving and modifying each mark understandable on first reading.
- Keep the Article 50 argument and the final sentence forceful. Do not add claims about Anthropic's intent.

- [ ] **Step 3: Humanize the legal case while preserving brief-level precision**

Edit the section from `# The Legal Case Against the Mark` through its italicized legal disclaimer. Preserve every block quotation and citation. Make these exact improvements:

- Replace "Here is why" and "The objection writes itself" with transitions that name the legal issue directly.
- Break long explanatory sentences only where the actor or legal consequence becomes easier to identify.
- Add connective prose between conditional assignment, manifested co-authorship, Section 203 termination, generated-display cases, *Thaler*, CMI, re-identification, and territorial ownership. Each addition must state the relationship already implicit in adjacent paragraphs.
- Keep the distinction between ownership and authorship explicit throughout.
- Keep the argument that the mark is evidentiary rather than authorship, and do not turn that argument into a statement of settled law.
- Preserve the closing disclaimer exactly: `Every authority cited above was verified against primary sources. This is argument, not legal advice.`

- [ ] **Step 4: Run the humanizer draft, audit, and final loop**

Read the revised manifesto and legal sections as a draft. Ask, in writing notes outside the repository: `What makes the below so obviously AI generated?`

Audit specifically for:

- significance inflation and promotional language;
- superficial `-ing` clauses;
- vague attributions;
- synonym cycling and forced groups of three;
- negative parallelisms and trailing negation fragments;
- repeated bold lead-ins;
- generic conclusions, rhetorical announcements, and manufactured punchlines;
- em dashes and curly quotation marks in original prose;
- passive constructions that hide Anthropic, the user, a court, or a statute as the actor.

Revise each remaining hit in `README.md`. Do not change quoted language, case names, pinpoint ranges, statutory text, or intentional short sentences that carry the existing voice.

- [ ] **Step 5: Audit the second half and commit it**

Run:

```bash
git diff --check
rg -n 'Consumer Terms|Commercial Terms|17 U\.S\.C\.|Restatement|Sun Microsystems|MDY|Jacobsen|Childress|Aalmuhammed|Thomson|Stern|Williams|Midway|Thaler|Murphy|Itar-Tass|Nova Prods' README.md
rg -n '\b(additionally|crucial|delve|enhance|fostering|interplay|intricate|pivotal|showcase|tapestry|testament|underscore|vibrant)\b|not (just|only|merely)|Here is why|The objection writes itself' README.md -i
python3 -m pytest -q
```

Expected: whitespace validation is silent; every authority remains; the AI-pattern search prints no original-prose hits; pytest reports `9 passed`.

Review `git diff -- README.md` against `/tmp/anthropies-readme-argument-before.md`. Confirm that every new sentence is supported by the surrounding existing argument and that no quotation or citation changed.

Commit:

```bash
git add README.md
git commit -m "Refine README manifesto and legal argument"
```

---

### Task 3: Whole-document consistency and final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: The revised technical, operational, manifesto, and legal sections from Tasks 1 and 2.
- Produces: The final README, ready for user review but not pushed or published.

- [ ] **Step 1: Read the README from top to bottom for one voice**

Read `README.md` without looking at the diff, then read the prose aloud. Correct only whole-document problems: abrupt register changes, duplicate explanations, orphaned transitions, inconsistent terminology, awkward cadence, or added prose that repeats a nearby diagram. Keep the technical section explanatory, the manifesto combative, and the legal section precise.

- [ ] **Step 2: Run the final mechanical checks**

Run:

```bash
git diff --check HEAD~2..HEAD
test "$(rg -c '^```' README.md)" -eq 20
rg -n $'\t| +$' README.md
rg -n '[“”]' README.md
rg -n '—|–' README.md
python3 -m pytest -q
```

Expected: diff validation is silent; the fence-count assertion exits zero; tab/trailing-space and curly-quote searches print nothing except any verbatim quotation explicitly preserved during review; dash-search hits are limited to verbatim quotations and legal pinpoint ranges; pytest reports `9 passed`.

- [ ] **Step 3: Validate local Markdown links and anchors**

Run:

```bash
test -f LICENSE
test -f NOTICE
test -f docs/MANIFESTO.md
test -f skills/purge-anthropies/SKILL.md
test -f commands/purge-anthropies.md
test -f .claude-plugin/plugin.json
rg -n '^#|\]\(' README.md
```

Expected: every `test` exits zero; the final search shows that the existing local links still point to present files and that referenced section headings remain in the README.

- [ ] **Step 4: Compare invariants against the pre-edit snapshots**

Run:

```bash
git diff HEAD~2 -- README.md
git log -3 --oneline
git status --short
```

Expected: the diff contains prose and alignment changes only; the two implementation commits follow the design/plan history; the worktree is clean unless Step 1 required a final consistency correction.

If Step 1 changed the README, run all checks again and commit:

```bash
git add README.md
git commit -m "Polish README consistency"
```

- [ ] **Step 5: Prepare the handoff**

Report the sections expanded, the humanizer patterns removed, the diagrams realigned, the exact test result, and the local commit hashes. State clearly that nothing was pushed and no pull request was opened.
