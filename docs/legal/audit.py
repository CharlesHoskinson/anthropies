#!/usr/bin/env python3
"""
Citation audit layer for the README legal rewrite.

Three independent checks, because a checklist you tick by hand is a checklist
that lies:

  1. FORWARD   every checklist item must have a probe that appears in the draft
  2. REVERSE   every authority cited in the draft must appear in the checklist
  3. CAVEAT    every checklist item flagged with a warning sign must carry an
               explicit sign-off in the ledger; an unsigned caveat is a FAIL

Usage:
  python audit.py                 report only
  python audit.py --tick          also rewrite [ ] to [x] for covered items
"""
import io
import os
import re
import sys
import unicodedata

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

D = os.path.dirname(os.path.abspath(__file__))
CHECKLIST = os.path.join(D, "citation-checklist.md")
DRAFT = os.path.join(D, "..", "..", "README.md")
LEDGER = os.path.join(D, "caveat-signoff.md")

WARN = "⚠"


# ---------------------------------------------------------------- normalising

def norm(s):
    """Fold the typographic variation that makes literal matching fail."""
    s = unicodedata.normalize("NFKC", s)
    for a, b in [
        ("‘", "'"), ("’", "'"),
        ("“", '"'), ("”", '"'),
        ("–", "-"), ("—", "-"), ("−", "-"),
        (" ", " "), ("…", "..."),
    ]:
        s = s.replace(a, b)
    s = s.replace("*", "").replace("**", "")
    s = re.sub(r"\s+", " ", s)
    return s.lower()


# ---------------------------------------------------------------- probes

# A reporter citation: "576 F.3d 356", "61 N.Y.2d 106", "490 U.S. 730",
# "312 A.3d 674", "254 F. Supp. 3d 659", "2003 WL 470577"
RE_REPORTER = re.compile(
    r"\b\d{1,4}\s+"
    r"(?:U\.?S\.?|F\.?\d?[a-z]{0,2}|F\.?\s?Supp\.?(?:\s?\d[a-z]{0,2})?|"
    r"N\.?Y\.?\d?[a-z]{0,2}|Cal\.?\s?\d?[a-z]{0,2}|A\.?\d[a-z]{0,2}|"
    r"F\.?\s?App'?x|WL|Fed\.?\s?Reg\.?)"
    r"\s+[\d,]{1,7}\b"
)

# A statutory citation with a section symbol.
RE_STATUTE = re.compile(
    r"(?:\d{1,2}\s+U\.?S\.?C\.?\s*)?"
    r"§{1,2}\s?[\d]+[A-Za-z]?(?:\([a-z0-9]+\))*"
)

# Rules, registers, reports and foreign neutral citations carry no reporter
# and no section symbol, so they need their own pattern or they get no probe.
RE_OTHER = re.compile(
    r"Fed\.\s?R\.\s?Evid\.\s?\d+(?:\([a-z0-9]+\))*"
    r"|Fed\.\s?R\.\s?Civ\.\s?P\.\s?\d+(?:\([a-z0-9]+\))*"
    r"|\d{2,3}\s?Fed\.\s?Reg\.\s?[\d,]+"
    r"|H\.R\.\s?Rep\.\s?No\.\s?[\d-]+"
    r"|S\.\s?Rep\.\s?No\.\s?[\d-]+"
    r"|Circular\s?\d+"
    r"|\[\d{4}\]\s?(?:EWCA|EWHC|UKSC|UKHL)[^,.\]]*"
    r"|art\.\s?\d+\(\d+\)"
)

# A pincite: "650 F.3d at 305", "136 F. Supp. 2d at 291". An item carrying
# one is a claim about that page, so nothing weaker may satisfy it.
RE_PINCITE = re.compile(
    r"\b\d{1,4}\s+"
    r"(?:U\.?S\.?|F\.?\d?[a-z]{0,2}|F\.?\s?Supp\.?(?:\s?\d[a-z]{0,2})?|"
    r"N\.?Y\.?\d?[a-z]{0,2}|Cal\.?\s?\d?[a-z]{0,2}|A\.?\d[a-z]{0,2})"
    r"\s+at\s+[\d,]{1,7}(?:\s?n\.\s?\d+)?"
)

# Short forms that are ordinary English and prove nothing.
SHORT_STOP = {
    "united states", "in re", "ex parte", "the people", "state",
    "commonwealth", "copyright office", "restatement", "compendium",
}

# The operative quotation. If the checklist quotes a holding and the draft
# contains that quotation, the authority reached the prose -- this is the
# strongest probe available and needs no citation parsing at all.
RE_QUOTE = re.compile(r"[\u201c\"]([^\u201c\u201d\"\n]{18,160})[\u201d\"]")

# An italicised span, which in this corpus means a case name or short form.
RE_ITALIC = re.compile(r"\*([^*\n]{3,90})\*")

# Noise that is italicised but is not an authority.
ITALIC_STOP = {
    "id.", "see", "accord", "cf.", "e.g.", "i.e.", "supra", "infra",
    "not", "the", "and", "or", "but", "is", "was", "never", "only",
    "created, operated, or used", "before", "after", "against", "for",
    "that", "this", "sui generis", "a contrario", "a fortiori",
    "arguable whether the text can any longer be described as ai-generated",
}


RE_HINT = re.compile(r"\{probe:\s*\"([^\"]{4,160})\"\s*\}")
RE_OMIT = re.compile(r"\{omit:\s*\"([^\"]{4,600})\"\s*\}")


def probes_for(line):
    """Candidate strings any one of which proves the item reached the draft."""
    # An explicit hint wins outright: the checklist author has named the
    # string that proves this item landed.
    hints = RE_HINT.findall(line)
    if hints:
        return hints
    line = RE_HINT.sub("", line)
    line = RE_OMIT.sub("", line)
    # Bold markers swallow the italic spans they wrap; drop them first.
    # Backslash-escaped stars (\*7-8) are pincite noise, not emphasis.
    line = line.replace("\\*", "").replace("**", "")
    line = re.sub(r"`NEW`", "", line)

    out = []
    weak = []

    # A pincite item is a claim about a page. Probe the page.
    pins = [m.group(0) for m in RE_PINCITE.finditer(line)]

    for m in RE_REPORTER.finditer(line):
        out.append(m.group(0))
    for m in re.finditer(r"\u00a7{1,2}\s?\d+[A-Za-z]?(?:\([a-z0-9]+\))*"
                         r"(?:\s*,\s*\((?:[a-z0-9]+)\)(?:\([a-z0-9]+\))*)+", line):
        base = re.match(r"\u00a7{1,2}\s?\d+[A-Za-z]?", m.group(0)).group(0)
        base = base.replace("\u00a7\u00a7", "\u00a7")
        for sub in re.findall(r"\((?:[a-z0-9]+)\)(?:\([a-z0-9]+\))*", m.group(0)):
            out.append(base + sub)

    for m in RE_STATUTE.finditer(line):
        s = m.group(0)
        out.append(s)
        # A draft cites "17 U.S.C. SS 1203(a)" once and "SS 1203(a)"
        # thereafter. Always probe the bare-section form too.
        idx = s.find("\u00a7")
        if idx > 0:
            out.append(s[idx:].strip())
        # "17 U.S.C. SS 101, 201(a)" is two citations, and a draft may place
        # them paragraphs apart. Probe each section on its own.
        if "\u00a7\u00a7" in line:
            m2 = re.search(r"\u00a7\u00a7\s?([\d]+[A-Za-z]?(?:\([a-z0-9]+\))*"
                           r"(?:\s*,\s*[\d]+[A-Za-z]?(?:\([a-z0-9]+\))*)+)", line)
            if m2:
                for part in re.split(r",\s*", m2.group(1)):
                    part = part.strip()
                    if part:
                        out.append("\u00a7 " + part)
    for m in RE_ITALIC.finditer(line):
        cand = m.group(1).strip().rstrip(",.;:")
        if norm(cand) in ITALIC_STOP or len(cand) < 4:
            continue
        # A full case name is a strong probe; keep it whole.
        out.append(cand)
        # Short forms are collected separately and used only as a fallback;
        # see below. "Torah Soft" proves nothing about page 291.
        short = cand.split(" v. ")[0].split(" v ")[0].strip()
        if (len(short) >= 10 and short != cand
                and norm(short) not in SHORT_STOP):
            weak.append(short)

    for m in RE_OTHER.finditer(line):
        out.append(m.group(0))

    # Quoted operative language: the strongest probe. Trim a trailing ellipsis
    # or bracketed alteration so a quote the draft renders slightly
    # differently still matches on its distinctive core.
    for m in RE_QUOTE.finditer(line):
        q = m.group(1).strip()
        q = q.replace("\u2026", "").strip(" .,;:")
        if len(q) >= 18:
            out.append(q)
            # Also probe the longest clean run, so a mid-quote bracket or
            # internal ellipsis in either document does not defeat the match.
            runs = [r.strip(" .,;:") for r in re.split(r"\u2026|\[[^\]]*\]|\.\.\.", q)]
            runs = [r for r in runs if len(r) >= 24]
            if runs:
                out.append(max(runs, key=len))
            # A draft that alters the opening word -- "[a]ny delay or
            # failure..." -- does not contain the unaltered quote. Probe the
            # tail as well, which is unaffected by the alteration.
            parts = q.split(" ", 1)
            if len(parts) == 2 and len(parts[1]) >= 24:
                out.append(parts[1])

    if pins:
        # Keep only the page-level evidence: the pincite itself, and any
        # quotation from that page. Drop reporter-only and short-form probes,
        # which are satisfied by a different passage of the same case.
        quotes = [q for q in out if not RE_REPORTER.search(q)
                  and "\u00a7" not in q and len(q) >= 24]
        out = pins + quotes
    elif not out:
        out = weak

    return [p for p in dict.fromkeys(out) if p.strip()]


def pin_parts(pin):
    """Split "136 F. Supp. 2d at 291" into ("136 F. Supp. 2d", ["291"])."""
    m = re.match(r"(.*?)\s+at\s+([\d,\s\u2013\u2014-]+(?:n\.\s?\d+)?)$", pin)
    if not m:
        return None, []
    vol = m.group(1).strip()
    pages = re.findall(r"\d+", m.group(2))
    return vol, pages


def pin_satisfied(draft_raw, pin):
    """True when the draft pins the same page of the same reporter volume.

    Accepts the short form ("704 F.2d at 1011") and the full form
    ("704 F.2d 1009, 1011-12") alike, since both pin the page. Rejects a
    different page of the same case, and rejects a page that merely falls
    inside a range the draft cites -- the quotation probe is what certifies
    those, not arithmetic.
    """
    vol, pages = pin_parts(pin)
    if not vol or not pages:
        return False
    want = pages[0]
    v = norm(vol)
    d = norm(draft_raw)
    for m in re.finditer(re.escape(v), d):
        # Stop at the court-and-year parenthetical; numbers past it are years,
        # not pages.
        window = d[m.end():m.end() + 48].split("(")[0]
        if want in re.findall(r"\d+", window):
            return True
    return False


def contains(haystack, probe):
    p = norm(probe)
    if not p or len(p) < 3:
        return False
    return p in haystack


# ---------------------------------------------------------------- checklist

class Item(object):
    def __init__(self, lineno, raw, section):
        self.lineno = lineno
        self.raw = raw
        self.section = section
        self.checked = raw.lstrip().startswith("- [x]")
        self.caveat = WARN in raw
        m = RE_OMIT.search(raw)
        self.omit = m.group(1) if m else None
        self.probes = probes_for(raw)
        self.covered = False
        self.hit = None

    def label(self):
        t = re.sub(r"^\s*- \[[ x]\]\s*", "", self.raw).strip()
        t = re.sub(r"`NEW`", "", t)
        t = t.replace("**", "").replace("*", "")
        return re.sub(r"\s+", " ", t)[:118]


def load_checklist():
    lines = io.open(CHECKLIST, encoding="utf-8").read().split("\n")
    items, section = [], "(preamble)"
    for i, ln in enumerate(lines):
        if re.match(r"^##+\s", ln):
            section = ln.lstrip("# ").strip()
        if re.match(r"^\s*- \[[ x]\]", ln):
            items.append(Item(i, ln, section))
    return lines, items


# ---------------------------------------------------------------- ledger

LEDGER_HEADER = """# CAVEAT SIGN-OFF LEDGER

Every checklist item flagged with a caution mark needs a human-verified
disposition before the section ships. `audit.py` fails while any row reads
`PENDING`.

Allowed dispositions:
  APPLIED   the caveat was honoured in the drafted prose
  DROPPED   the authority was deliberately left out of the draft
  N/A       the caveat does not bear on the drafted text

Format, one per line:  <id> | <disposition> | <one-line reason>

"""


def load_ledger():
    if not os.path.exists(LEDGER):
        return {}
    out = {}
    for ln in io.open(LEDGER, encoding="utf-8").read().split("\n"):
        if "|" not in ln or ln.strip().startswith("#"):
            continue
        parts = [x.strip() for x in ln.split("|")]
        if len(parts) >= 2 and re.match(r"^C\d+$", parts[0]):
            out[parts[0]] = (parts[1].upper(), parts[2] if len(parts) > 2 else "")
    return out


def write_ledger(caveats, existing):
    body = [LEDGER_HEADER]
    for cid, it in caveats:
        disp, why = existing.get(cid, ("PENDING", ""))
        body.append("%s | %s | %s" % (cid, disp, why))
        body.append("    ^ %s [checklist line %d]" % (it.label(), it.lineno + 1))
        body.append("")
    io.open(LEDGER, "w", encoding="utf-8").write("\n".join(body))


# ---------------------------------------------------------------- reverse

def reverse_sweep(draft_raw, items):
    """Authorities in the draft that no checklist item accounts for."""
    known = []
    for it in items:
        known.extend(it.probes)
    known_n = [norm(k) for k in known]

    found = []
    for m in RE_REPORTER.finditer(draft_raw):
        found.append(m.group(0))
    # Only italic spans shaped like an authority count. Ordinary emphasis is
    # not an uncited case, and reporting it as one trains the reader to
    # ignore the orphan list -- which defeats the check.
    CASEISH = re.compile(
        r"\sv\.?\s|\bIn re\b|\bEx parte\b|\bLtd\b|\bInc\b|\bLLC\b|"
        r"\bCorp\b|\bCo\.|\bCircular\b|\bRep\. No\.|\bRestatement\b"
    )
    for m in RE_ITALIC.finditer(draft_raw):
        c = m.group(1).strip().rstrip(",.;:")
        if norm(c) in ITALIC_STOP or len(c) < 6:
            continue
        if not CASEISH.search(c):
            continue
        found.append(c)

    orphans = []
    for f in dict.fromkeys(found):
        fn = norm(f)
        if any(fn in k or k in fn for k in known_n):
            continue
        orphans.append(f)
    return orphans


# ---------------------------------------------------------------- main

def main():
    tick = "--tick" in sys.argv

    lines, items = load_checklist()
    draft_raw = io.open(DRAFT, encoding="utf-8").read()
    draft = norm(draft_raw)

    for it in items:
        for p in it.probes:
            ok = contains(draft, p)
            if not ok and RE_PINCITE.fullmatch(p.strip()):
                ok = pin_satisfied(draft_raw, p.strip())
            if ok:
                it.covered = True
                it.hit = p
                break

    structural = [i for i in items if "STRUCTURAL" in i.section.upper()]
    cited = [i for i in items if i not in structural]

    excluded = [i for i in cited if i.omit]
    missing = [i for i in cited if not i.covered and not i.omit]
    covered = [i for i in cited if i.covered and not i.omit]
    # An "omit" that shows up in the draft anyway is the dangerous case: the
    # instruction said remove it and it is still there.
    violated = [i for i in excluded if i.covered]
    noprobe = [i for i in cited if not i.probes and not i.omit]

    caveats = []
    n = 0
    for it in items:
        if it.caveat:
            n += 1
            caveats.append(("C%02d" % n, it))
    existing = load_ledger()
    write_ledger(caveats, existing)
    pending = [c for c, _ in caveats if existing.get(c, ("PENDING",))[0] == "PENDING"]

    orphans = reverse_sweep(draft_raw, items)

    # ---- report
    print("=" * 74)
    print("CITATION AUDIT  --  %s" % os.path.basename(DRAFT))
    print("=" * 74)
    print("checklist items (citable) : %d" % len(cited))
    print("  covered in draft        : %d" % len(covered))
    print("  MISSING from draft      : %d" % len(missing))
    print("  excluded on purpose     : %d" % len(excluded))
    print("  EXCLUSION VIOLATED      : %d" % len(violated))
    print("  NO PROBE (unverifiable) : %d  (add a {probe: \"...\"} hint)" % len(noprobe))
    print("structural directives     : %d  (manual read required)" % len(structural))
    print("caveats needing sign-off  : %d   PENDING: %d" % (len(caveats), len(pending)))
    print("orphan cites in draft     : %d" % len(orphans))
    print("")

    if missing:
        print("-" * 74)
        print("MISSING  (in checklist, not found in draft)")
        print("-" * 74)
        by = {}
        for i in missing:
            by.setdefault(i.section, []).append(i)
        for sec in by:
            print("\n  [%s]" % sec)
            for i in by[sec]:
                print("    L%-4d %s" % (i.lineno + 1, i.label()))
        print("")

    if noprobe:
        print("-" * 74)
        print("NO PROBE  (audit cannot verify these mechanically -- read them)")
        print("-" * 74)
        for i in noprobe:
            print("    L%-4d %s" % (i.lineno + 1, i.label()))
        print("")

    if orphans:
        print("-" * 74)
        print("ORPHANS  (cited in draft, absent from checklist)")
        print("-" * 74)
        for o in orphans:
            print("    %s" % o)
        print("")

    if excluded:
        print("-" * 74)
        print("EXCLUDED ON PURPOSE  (kept out of the draft, with reason)")
        print("-" * 74)
        for i in excluded:
            print("    L%-4d %s" % (i.lineno + 1, i.label()[:70]))
            print("           reason: %s" % i.omit)
        print("")

    if violated:
        print("!" * 74)
        print("EXCLUSION VIOLATED  (marked omit, but found in the draft)")
        print("!" * 74)
        for i in violated:
            print("    L%-4d %s" % (i.lineno + 1, i.label()[:70]))
            print("           matched on: %r" % i.hit)
        print("")

    if pending:
        print("-" * 74)
        print("CAVEATS PENDING SIGN-OFF  (edit %s)" % os.path.basename(LEDGER))
        print("-" * 74)
        for c in pending:
            print("    %s" % c)
        print("")

    if tick:
        changed = 0
        for i in covered:
            if not i.checked:
                lines[i.lineno] = lines[i.lineno].replace("- [ ]", "- [x]", 1)
                changed += 1
        for i in missing:
            if i.checked:
                lines[i.lineno] = lines[i.lineno].replace("- [x]", "- [ ]", 1)
                changed += 1
        io.open(CHECKLIST, "w", encoding="utf-8").write("\n".join(lines))
        print("ticked: %d checklist boxes rewritten to match reality" % changed)
        print("")

    # An item nothing can probe is an item that can be silently missed. Treat
    # it as a failure until the checklist carries a {probe: "..."} hint.
    fail = (bool(missing) or bool(pending) or bool(orphans)
            or bool(noprobe) or bool(violated))
    print("=" * 74)
    print("RESULT: %s" % ("FAIL" if fail else "PASS"))
    print("=" * 74)
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
