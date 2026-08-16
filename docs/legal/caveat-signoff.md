# CAVEAT SIGN-OFF LEDGER

Every checklist item flagged with a caution mark needs a human-verified
disposition before the section ships. `audit.py` fails while any row reads
`PENDING`.

Allowed dispositions:
  APPLIED   the caveat was honoured in the drafted prose
  DROPPED   the authority was deliberately left out of the draft
  N/A       the caveat does not bear on the drafted text

Format, one per line:  <id> | <disposition> | <one-line reason>


C01 | APPLIED | cited for fixation and for the locus of originality only; no authorship language is attributed to Stern
    ^ Stern Elecs., Inc. v. Kaufman, 669 F.2d 852, 855–57 (2d Cir. 1982) — ⚠ no authorship language; cite for copyrightabili [checklist line 27]

C02 | APPLIED | denial given by docket number and date; no reporter citation invented
    ^ Thaler v. Perlmutter, 130 F.4th 1039, 1049 (D.C. Cir. 2025), cert. denied, No. 25-449 (U.S. Mar. 2, 2026) — ⚠ no repor [checklist line 32]

C03 | APPLIED | quoted on the administrative-record holding; the words waiver and forfeiture are not used
    ^ Thaler, 687 F. Supp. 3d 140, 149–50 (D.D.C. 2023) — ⚠ district court did not use "waiver"/"forfeiture" [checklist line 33]

C04 | APPLIED | draft cites (c)(7) for identifying numbers or symbols and describes (c)(1)-(6); (c)(6) is never called the catch-all
    ^ 17 U.S.C. § 1202(c)(2), (c)(3), (c)(7) — ⚠ (c)(6) is terms and conditions [checklist line 37]

C05 | APPLIED | draft states ownership follows the country most closely connected to creation and first publication, and that it is not an election
    ^ Itar-Tass Russian News Agency v. Russian Kurier, Inc., 153 F.3d 82 (2d Cir. 1998) — ⚠ does not permit a US-origin work [checklist line 43]

C06 | APPLIED | draft says the repeal was proposed in March 2026 and not enacted
    ^ UK CDPA 1988 § 9(3) — ⚠ repeal proposed March 2026, not enacted [checklist line 45]

C07 | APPLIED | VERIFIED. The Ninth Circuit's own citation in Design Data, 847 F.3d at 1173, reads "Torah Soft Ltd. v. Drosnin, 136 F.Supp.2d 276, 283 (S.D.N.Y. 2001)", and the quoted language is confirmed verbatim against the Harvard CAP full text
    ^  Torah Soft Ltd. v. Drosnin, 136 F. Supp. 2d 276, 283 (S.D.N.Y. 2001) — where "the Software does the lion's share of t [checklist line 55]

C08 | APPLIED | quotation confirmed verbatim against the Justia text, but page 276 could not be verified from any free source, so the pincite is dropped rather than asserted
    ^  Georgia v. Public.Resource.Org, Inc., 590 U.S. 255 (2020) — Copyright Office guidance is "a non-binding administrativ [checklist line 58]

C09 | APPLIED | draft states the claim is per-output and temporal, and that later breach does not revest title absent an express reverter
    ^ ⚠ NARROW THE CLAIM: per-output and temporal. Breach after vesting does not automatically revest absent express reverte [checklist line 80]

C10 | APPLIED | draft says adequately alleged and labels the posture Rule 12(b)(6)
    ^  Lindsay v. Wrecked & Abandoned Vessel R.M.S. Titanic, 1999 WL 816163, at \5 — ⚠ Rule 12(b)(6), "adequately alleged,"  [checklist line 87]

C11 | APPLIED | honoured by construction; Dreamwriter is framed on the preparatory constraints its team set in advance, which is the distinction Li v. Liu turns on
    ^  Li v. Liu, (2023) Jing 0491 Min Chu No. 11279, at 14–15 — ⚠ limiting principle: designer denied authorship where it n [checklist line 88]

C12 | DROPPED | recorded as a deliberate exclusion at checklist L89; patent hired-to-invent doctrine would import a shop-right argument that gives use and not title
    ^  United States v. Dubilier Condenser Corp., 289 U.S. 178, 187–89 (1933) — hired-to-invent, ⚠ not shop right (shop righ [checklist line 89]

C13 | APPLIED | THJ Systems leads the section; Stern, Williams and Midway appear as supporting anti-user-authorship authority
    ^ ⚠ DEMOTE the video-game cases to supporting authority; THJ leads. {probe: "video game's display is generated in real t [checklist line 90]

C14 | APPLIED | cited as 572 U.S. 663 (2014) with no internal pin
    ^  Petrella v. Metro-Goldwyn-Mayer, Inc., 572 U.S. 663 (2014) — "nothing untoward about waiting"; estoppel needs "intent [checklist line 99]

C15 | APPLIED | draft says the Ninth Circuit described the extension without needing to decide it
    ^  Design Data Corp. v. Unigate Enter., Inc., 847 F.3d 1169, 1173 (9th Cir. 2017) — the extension already described. A p [checklist line 114]

C16 | DROPPED | the asserted holding is not in the opinion. Removed and replaced with the narrow-protection point drawn from verified text; exclusion recorded at checklist L119
    ^  Torah Soft, 136 F. Supp. 2d at 291 — ⚠ the other half: output held unprotectable once authorship left the user. Adver [checklist line 119]

C17 | APPLIED | introduced as the Office's own sentence defeating the prompter's claim, not as support for a developer claim
    ^  88 Fed. Reg. 16,190, 16,192 — "When an AI technology determines the expressive elements of its output, the generated  [checklist line 120]

C18 | APPLIED | Micro Star is absent, and the audit's exclusion-violated check fails the run if it reappears
    ^ ⚠ REMOVE Micro Star as an authorship analogy — it concerns unauthorized derivatives of a pre-existing library and wide [checklist line 121]

C19 | APPLIED | the draft claims only that the user is not the author and that the maker's expression may be perceptible; it never claims the maker owns the display
    ^ ⚠ DO NOT claim "the maker owns the display" — invites one-sentence demolition. {omit: "negative instruction. The secti [checklist line 122]

C20 | APPLIED | reporter citation 130 F.4th 1039, 1049 used throughout
    ^ ⚠ Thaler slip op. flagged `[UNVERIFIED F.4th]` by the agent — we have the reporter cite: 130 F.4th 1039, 1049. Use it. [checklist line 123]

C21 | APPLIED | cited in the draft as the limit on joint authorship, conceded in the open rather than buried
    ^  16 Casa Duse, LLC v. Merkin, 791 F.3d 247, 255 (2d Cir. 2015) — ⚠ adverse to joint authorship [checklist line 139]

C22 | DROPPED | recorded as a deliberate exclusion at checklist L140; the fragment claim rests on perceptible expression, not on the model as amanuensis
    ^  Andrien v. S. Ocean Cnty. Chamber of Commerce, 927 F.2d 132, 135 (3d Cir. 1991) — ⚠ ADVERSE: delegated embodiment mus [checklist line 140]

C23 | DROPPED | governs the decision not to argue estoppel; exclusion recorded at checklist L141
    ^  Heckler v. Cmty. Health Servs., 467 U.S. 51, 59 (1984) — ⚠ estoppel needs reliance and change of position "for the wo [checklist line 141]

C24 | DROPPED | deliberately not run; exclusion recorded at checklist L143
    ^  § 1202(a) reverse risk — scienter is the wall; Anthropic's stated purpose is attribution. ⚠ Do not run this offensive [checklist line 143]

C25 | N/A | forum strategy, not a citation. The README argues doctrine rather than venue; Register.com and Casa Duse both appear on their own merits
    ^ ⚠ Forum: Second Circuit for contract + admissions (Register.com, Casa Duse) [checklist line 144]

C26 | APPLIED | quoted for form-independence, which is what carries the trailer; no new statutory category is claimed from it
    ^  Murphy, 650 F.3d at 305 — "regardless of the form in which that information is conveyed." ⚠ helps every form; adds no [checklist line 153]

C27 | APPLIED | now supplies the structural reason the watermark-removal theory fails, since the mark is the wording
    ^  Murphy, 650 F.3d at 303 n.8 — an infringer who "merely copies an entire work whole" does not violate § 1202. ⚠ The co [checklist line 154]

C28 | APPLIED | the draft concedes the watermark is not CMI and quotes Anthropic's statement as the reason
    ^ ⚠ Anthropic's own words defeat the watermark-as-CMI theory under Fischer: "doesn't say anything about ownership or aut [checklist line 159]

C29 | APPLIED | quoted in the removal paragraph in support of the not-removal point
    ^ ⚠ Anthropic on rewriting: a complete rewrite may mean "the text can [no] longer be described as AI-generated" — suppor [checklist line 160]

C30 | N/A | forum strategy, not a citation. Mango is cited for the proposition that the concealed infringement may be the remover's own
    ^ ⚠ Forum: Second Circuit (Mango) [checklist line 161]

C31 | APPLIED | this ledger is that verification; the audit fails while any row is PENDING
    ^ Verify every ⚠ item before publishing [checklist line 178]

C32 | APPLIED | cited without a pincite, as the caveat requires
    ^  Bitmanagement Software GmbH v. United States, 989 F.3d 938 (Fed. Cir. 2021) — license-tracking term "was clearly a co [checklist line 191]

C33 | APPLIED | the draft states outright that the Usage Policy contains no anti-removal clause and rests the nexus on the training and resale prohibitions, the provenance rules, and the intrinsic nexus
    ^ ⚠ NEXUS CORRECTION — material. The Usage Policy contains no anti-watermark-removal clause. Verified against the live p [checklist line 200]

C34 | APPLIED | stated plainly in the closing paragraph of the conditional-assignment section
    ^ ⚠ No 2024–2026 decision construes conditional assignment language in any AI provider's terms. State plainly; do not pa [checklist line 201]
