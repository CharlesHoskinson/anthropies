# Citation audit

The legal section of the README cites roughly 120 authorities. A checklist you
tick by hand is a checklist that lies, so the tick is done by a script that
reads the prose.

```
python docs/legal/audit.py          # report
python docs/legal/audit.py --tick   # also rewrite the checkboxes to match
```

Exit status is non-zero unless every check passes.

## What it checks

**Forward.** Every entry in `citation-checklist.md` must have a probe that
appears in `README.md`. Probes are derived from the entry itself: the reporter
citation, the statutory section, the case name, the operative quotation. An
entry that names a contract clause rather than a case can carry an explicit
`{probe: "..."}` hint.

**Reverse.** Every authority cited in the README must appear in the checklist.
This is what catches a citation that arrived in the prose without ever being
recorded, which is the failure the forward check cannot see.

**Caveats.** Any checklist entry flagged with a caution mark must carry a
disposition in `caveat-signoff.md` — `APPLIED`, `DROPPED`, or `N/A`, each with
a reason. A row left `PENDING` fails the run.

**Exclusions.** Adverse authority and negative drafting instructions must *not*
appear in the prose, so the forward check would report them missing forever and
teach the reader to ignore a non-empty failure list. An entry may carry
`{omit: "reason"}` instead. It is then counted as excluded, its reason is
printed on every run, and the audit fails if the excluded material turns up in
the README after all.

**Unverifiable.** An entry that nothing can probe is an entry that can be
silently missed, so it fails the run until it carries a probe hint.

## Pincites

A pincite entry is a claim about a page, not about a case. `Torah Soft, 136 F.
Supp. 2d at 291` is satisfied by page 291 and not by page 283 of the same
case, and not by the bare case name. Both the short form (`704 F.2d at 1011`)
and the full form (`704 F.2d 1009, 1011–12`) count, since both pin the page.

This rule exists because the looser version certified two citations that were
not in the prose at all.

## What the audit does not do

It checks that a citation reached the page. It does not check that the citation
is real, that the page is right, or that the case says what the sentence says.
Those were done by hand against primary sources, and the results are recorded
in `caveat-signoff.md` — including the two places where verification changed
the argument rather than confirming it.
