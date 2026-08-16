# The Anthropies Manifesto (long form)

They assigned you the deed, then bolted their name to the door.

The short form lives at the top of the README. Every quotation below was taken from a public page fetched for this project. The words "if any" in the assignment limit what can pass. They do not reserve a slice of title for Anthropic.

## I. The assignment

Anthropic wrote the language of conveyance. Consumer Terms, section 4:

> "Subject to your compliance with our Terms, we assign to you all of our right, title, and interest—if any—in Outputs."

Commercial Terms, section B, go further: they say the customer owns the Outputs, and they disclaim rights received in Customer Content.

> "As between the parties and to the extent permitted by applicable law, Anthropic agrees that Customer (a) retains all rights to its Inputs, and (b) owns its Outputs. Anthropic disclaims any rights it receives to the Customer Content under these Terms. Subject to Customer’s compliance with these Terms, Anthropic hereby assigns to Customer its right, title and interest (if any) in and to Outputs."

California Civil Code section 1638, which governs the commercial contract for customers outside the EEA, Switzerland, and the UK, says the language of a contract governs if it is clear and explicit. Owns. Disclaims. Assigns. Those words transfer whatever interest Anthropic has.

Two qualifications sit in those sentences: "to the extent permitted by applicable law" and "if any." Some Outputs may have no copyright. Some may include third-party material you brought in. Anthropic does not warrant that every Output is an original work of authorship, and the consumer terms disclaim a warranty of title. As between Anthropic and you, the cited clauses do not reserve Output title for Anthropic.

U.S. copyright law treats an assignment as a real transfer. 17 U.S.C. section 201 says ownership of a copyright may be transferred in whole or in part by any means of conveyance. Section 204 says a transfer is not valid unless it is in writing and signed by the owner of the rights conveyed. A click-through terms of service is the writing Anthropic chose. They used it to move their interest, if any, to the user.

A license is a different animal. Section 101 defines a transfer of copyright ownership to exclude a nonexclusive license. Anthropic knows how to reserve a use permission. The consumer terms separately permit Anthropic to use Materials to run the service and, unless the user opts out, to train. The commercial terms are cleaner: they disclaim Customer Content rights and say Anthropic may not train on them. A reserved use right can live next to an assignment without becoming co-ownership of the Output.

OpenAI's consumer-facing terms use almost the same assignment sentence. Google's Gemini API terms say Google will not claim ownership of original generated content. The market already treats Outputs as the customer's. Anthropic's own FAQ later says the watermark does not change those rights. The assignment is not in dispute. The mark is.

## II. The three marks

After the assignment, Anthropic marks the delivered artifact. It uses three different instruments. Not every Output receives every mark. The policy is still one policy: attach a Claude-specific signal to property the contract allocates to someone else.

### Text

On 14 August 2026 Anthropic published "How Claude's text watermark works." The method is a version of SynthID-Text, the tournament-sampling scheme Google DeepMind described in Nature in 2024. The watermark changes the source of randomness among next words that were just as good. The text receives no hidden characters and no extra tokens. The pattern is undetectable to a reader and detectable to anyone who has the key.

> "That pattern is undetectable to the reader, but is detectable to anyone who has a key that encodes it."

The same page says the mark carries no user identity. Nothing in the watermark or its key recovers the user, the organization, or the chat. The grievance is the opposite of surveillance of the user. The mark brands Anthropic's involvement onto the user's property.

> "It doesn’t say anything about ownership or authorship, and doesn’t change a user’s rights under our terms."

That sentence is the tell. If the mark does not change ownership, it cannot be justified as an incident of title. If Anthropic needed a residual claim, it would not have assigned. They sold the ownership argument and kept the brand.

The help article "How Claude marks AI-generated content" says the watermark is applied at the model. It is present no matter which Claude product produced the text: the consumer app, Claude Code, Cowork, Tag, the API, and supported cloud partners. Because the mark is the wording, it travels with copy and paste. It may persist through some editing.

> "Because the watermark is part of the text, it will travel with the text when it’s copied and pasted elsewhere, and may persist through some editing."

Anthropic is explicit about the destroyers. Light editing probably will not remove the watermark. A complete rewrite, where every word is replaced, will. Translation by another model can destroy it. Detection is weak on short samples and on factual or low-entropy passages where there is no equally good next word. Code, they say, is generally less watermarked than prose, except where a choice is free: comments, some names, docstring wording.

A detection API is forthcoming. Anthropic has said it will help users and other third parties detect the marks. Until that API exists, no tool can honestly certify that a file fails Anthropic's detector. The honest statement after a heavy rewrite is that the wording is no longer Claude's sample path.

The help page also says a mark can travel with material Claude only processed. Proofreading, translation, summary, and file conversion can stamp output whose ideas, text, or data came from somewhere else. The detector answers "Claude was likely involved." It does not answer "Claude wrote this." Anthropic says so.

> "A watermark can only determine that Claude was likely involved with the content at some point. It cannot distinguish 'Claude wrote this' from 'Claude heavily edited this.'"

### Files

When Claude produces a supported file type such as PNG, JPEG, or SVG, it attaches a C2PA content credential: a small, cryptographically signed note in the file's metadata saying the file was made or processed with Claude. Anthropic says nothing in the file's pixels changes. The credential is metadata. A screenshot, a re-save, or a format conversion can strip it.

C2PA is an open standard. The 2.2 specification encourages implementers to give creators and publishers control over whether certain provenance data is included. A valid signature authenticates the signer and the assertions. It does not adjudicate copyright, authorship, truth, or title. Anthropic's implementation makes the assertion automatically and globally on supported outputs. The standard's opt-in posture is not the same as a vendor default that the owner cannot refuse at generation time.

### Git

Claude Code writes a git trailer by default:

`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

Anthropic's own settings documentation says commits use git trailers by default and that the strings can be customized or disabled. Empty string hides commit attribution. The setting exists, and the default still writes history before you find it. A later disable does not rewrite published commits.

GitHub's documentation is not subtle about what the trailer means:

> "Add one or more Co-authored-by trailers to a commit message to attribute a commit to multiple authors."

The U.S. Copyright Office, in its March 2023 registration guidance, says the opposite thing about legal authorship:

> "Applicants should not list an AI technology or the company that provided it as an author or co-author simply because they used it when creating their work."

A trailer does not create joint authorship under 17 U.S.C. section 101. A joint work requires two or more authors who intend to merge their contributions. Current registration policy requires human authorship. The trailer is authorship theater attached to a transaction that assigned Anthropic's interest away. GitHub will still treat it as an author for contributor graphs and pull request attribution. Downstream systems that consume commit identity — DCO checks, CLA bots, diligence greps — will see a name that cannot sign, cannot be an employee, and whose provider already assigned any interest it had.

The habit is industry-wide. VS Code 1.118 made `git.addAICoAuthor` a product setting. Cursor has a toggle. Aider has a flag. Anthropic's empty-string setting proves the trailer is optional. Optional defaults still land in history. Issue 66602 on `anthropics/claude-code` quoted the Copyright Office guidance and was closed as not planned.

## III. Calling card, not lien

A watermark, a C2PA manifest, and a git trailer are not mortgages. Cornell's definition of a cloud on title requires a claim or encumbrance that affects ownership of a property. Anthropic says the mark says nothing about ownership. C2PA's word "claim" is a term for a signed data structure, not a property claim.

The UCC section 2-312 analogy is limited. That section is a warranty of title in a contract for the sale of goods. Software terms are not a sale of goods in every jurisdiction, and Anthropic disclaims implied warranties. The chain of title can be clean while the chain of provenance remains vendor-controlled. Anthropic does not keep the deed. It leaves a signed calling card in the delivered asset, and it keeps the only key that reads the card.

Berne Article 6bis shows that a human author's moral right to claim authorship can survive a transfer of economic rights. That rule does not rescue Anthropic. It protects authors. In the United States, the Visual Artists Rights Act is narrow and applies to qualifying works of visual art. Section 104(c) bars claims based only on Berne. Ordinary text and code fall outside VARA. Claude is not a human author under current Copyright Office policy. Anthropic has identified no residual authorial right held by Anthropic or Claude that authorizes a default co-author claim over assigned text or code.

Work made for hire points the other way. Section 201 says that in the case of a work made for hire, the employer is considered the author. A company that paid an employee to ship a service owns that work product. A vendor mark in the tree says a third party was involved. Counsel will not parse "processed" versus "authored" when a diligence grep returns four hundred Claude trailers.

## IV. The indemnity trap

Commercial Terms section K offers to defend a customer against certain third-party intellectual property claims arising from authorized paid use of the Services or Outputs. The same section excludes that duty to the extent the claim arises from modifications made by the customer to the Services or Outputs, or from combination with technology or content Anthropic did not provide.

Anthropic's own watermark page says light editing probably will not remove the text mark and a complete rewrite will. The help page says file credentials disappear through format conversion, re-saving, or screenshots. The owner who wants a clean export is told, in one document, to rewrite or convert, and in another document that those modifications sit outside the indemnity.

Ship the tripwire, or edit the thing you own and step outside the indemnity. That is the commercial posture: they assign the Output, they mark it, and they refuse to stand behind the marked artifact once you do the only thing that quiets the mark.

## V. Europe is the alibi

Anthropic's public reason is the EU AI Act. Article 50(2) says:

> "Providers of AI systems, including general-purpose AI systems, generating synthetic audio, image, video or text content, shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated."

That duty is real. It is also technique-neutral. Recital 133 lists watermarks, metadata, cryptographic methods, logs, fingerprints, and combinations. The Commission Guidelines say providers may rely on a single marking technique or a combination. The statute does not say secret, keyed, or Claude-specific, and it does not require a full provenance chain or an authorship claim.

The statute also contains an exception. The marking duty does not apply to the extent the AI systems perform an assistive function for standard editing that does not substantially alter the input or its meaning. The Commission Guidelines place grammar correction, spellcheck, minor polish, and AI translation inside that exemption. Summaries that change the semantics are in scope. Anthropic's help page says proofread, translated, and summarized outputs can carry a Claude mark. Translation is affirmatively marked because every word is chosen by Claude. Proofreading may be too sparse to detect. Standard editing and translation did not have to be marked as a compliance matter.

The Code of Practice on Transparency of AI-Generated Content is voluntary. The Commission says so. Providers who do not adhere must demonstrate compliance through alternative adequate means. Anthropic signed Section 1. For a signatory, in-scope free-form text over 200 tokens is supposed to carry an imperceptible watermark. That fact identifies Anthropic's safe-harbour choice. It does not mandate Anthropic's secret key, a worldwide rollout, a pending public detector, or a git trailer.

Anthropic applied the mark worldwide because, in its own words, it does not yet have a durable way to scope the feature by region. The Code commitment is to systems placed on the Union market, and the Act's territorial reach is the Union, so global application is an engineering limitation exported into every customer's property on earth.

The EU framework separates the provider's machine mark from the deployer's public label. For deepfakes and certain public-interest text, the deployer labels. The optional EU icons belong to creators and publishers. The Code encourages a control through which the user decides whether to apply a perceptible label. That is the correct boundary. The owner decides how the owner's publication speaks. The provider supplies interoperable evidence. It does not keep a secret voice inside the work.

California's SB 942 is a useful contrast, not a controlling rule. For covered image, video, and audio it separately mandates a latent provider disclosure and requires a user option for a manifest disclosure. It specifies provider identity, model or version, timestamp, unique identifier, and public detection. It does not cover text in those duties. A legislature that wants a provider-specific latent claim knows how to write one. Article 50 did not write that claim for prose.

Google's own SynthID documentation says the method is not a silver bullet and that confidence scores can be greatly reduced after rewriting or translation. ETH SRI's probing of SynthID-Text found the scheme hard to spoof and relatively easy to scrub with off-the-shelf paraphrasers. Anthropic and Google both already state the operational envelope. A determined rewrite can destroy the signal. A light edit cannot.

Detection access is part of the Code they signed. For the watermark path, signatories owe users and legitimate third parties a way to detect: a public specification, software, or a cloud API. Anthropic has promised an API and has not shipped it. Until it ships, the only party who can pronounce on the text mark is the party who holds the key.

## VI. What the science says about removal

SynthID-Text seeds a pseudorandom function with the last H tokens and a secret key, then runs a tournament among candidates drawn from the model's own distribution. Detection averages the keyed scores. Because the seed is a window, a synonym swap at one position leaves most windows intact. Isolated thesaurus work is how people convince themselves they cleaned a document.

A rewrite that changes clause order, sentence boundaries, discourse markers, and function words breaks those windows. Back-translation through a distant language pair does the same. When Claude paraphrases Claude, the new sample comes from the same keyed family. The words change. The detector does not care. Kirchenbauer's work, and the later reliability paper, showed that leaked n-grams are how a paraphrase still gets caught. The operational target is almost no surviving H-grams. "Watermarks in the Sand" argued that strong, quality-preserving watermarking fails against a perturbation plus a quality oracle. Sandcastles later argued that the random walk does not mix as the theorem hoped. Neither paper is a CLI. Both agree a determined rewrite can move a weak watermark, and Anthropic has already classified its scheme that way.

Code is sparser. Forced tokens — keywords, required API names, exact literals — carry little mark. The free band is comments, some local names, docstring wording, and some string literals. A formatter that Claude already approximates is often a no-op. Comment-only rewrite leaves identifier islands of length H. The honest code attack is scope-aware local rename plus comment rewrite, then format. Public APIs, lockfiles, and protocol strings stay put.

No public key means no certificate. MarkLLM and the open SynthID implementation can verify a scheme you control. They cannot stand in for Anthropic's detector. After a clean and a rewrite, the honest report is what bytes were removed and what wording was attempted, not that the official check will fail.

## VII. Harm that does not need a lawsuit

Employment work product is the company's. A vendor trailer in the history is a third party in the chain of title. An acquisition grep is a foreseeable query because the trailer is structured and GitHub assigns it authorship effects. The company does not need a court to treat that as a problem. It needs a clean tree.

A contractor's MSA often says the contractor delivers original work and assigns it. Counsel who opens `git log --format=full` will see Claude as a co-author. The invoice can wait. The warranty letter can go out. The contractor cannot prove the statistical mark is absent from comments even after the trailer is stripped.

Open source maintainers who require a Developer Certificate of Origin get a co-author who cannot sign. Linux Foundation EasyCLA has had to invent exemptions for AI and co-author bots. That exemption is a concession that the trailer creates work, not a reason to write the trailer by default.

A designer who asks Claude to tidy a logo can leave with C2PA that says Claude processed the file. Brand security may reject uncommissioned vendor provenance. A stripped manifest looks like tampering. The file left signed looks like an admission.

A translator who pastes their own memo for a French version receives their argument back, every word chosen by Claude, and a mark that will read to a later detector as Claude's. They were paid to deliver their work.

None of this requires the mark to contain the user's identity. The mark contains Anthropic's.

## VIII. What ownership means

The owner labels the work, and you decide whether a commit carries a co-author, whether a file carries a credential, whether the prose is silent. Attribution is an incident of title. They transferred the title. They kept the label.

A lawful compliance design is an open machine-readable origin signal plus a disclosure the owner controls. Anthropic chose a global, keyed, non-consensual mark, a signed file credential, and a default git trailer. The Code may explain a watermark for long free-form text in the Union. It does not explain the rest.

What follows is the option those instruments create.

## IX. They spoke as the owner

An assignment is a speech act. Under 17 U.S.C. section 204, a transfer of copyright ownership is not valid unless it is in writing and signed by the owner of the rights conveyed. The statute names the signer. The signer is an owner. To execute that instrument is to say: I hold this; I now give it to you.

Anthropic chose that form. It could have written a disclaimer. A disclaimer costs one line and says something else: we make no claim. The commercial instrument already uses that form elsewhere. "Anthropic disclaims any rights it receives to the Customer Content under these Terms." Another sentence says the Terms grant no rights "by implication or otherwise." The consumer instrument has no equivalent. The drafter knows both forms. In the sentence that matters to consumers, it conveyed.

Section 201(a) vests copyright in the author. Section 201(b) treats an employer as the author only for a statutory work made for hire. Assignment and authorship are different statuses. A court will not treat "we assign" as "we wrote this." Markets will. To assign presupposes to hold. To hold a copyright presupposes authorship or a chain from an author. "If any" cancels the warranty. Nowhere do the terms say the operative fact: we do not claim to be the author, and we believe most Outputs are copyrightable by no one.

California Evidence Code section 622 says the facts recited in a written instrument are presumed true as between the parties. The recital does not have to be true against the world. It binds here. Civil Code section 1638 says the language governs if it is clear. The language is "our right, title, and interest… in Outputs." Civil Code section 1654 charges leftover uncertainty to the party who wrote it.

The trailer, the C2PA signature, and the keyed watermark name Anthropic where a human belongs. A mark whose meaning only the marker can read is a signature in a language with one speaker.

Inward, a document says you own it. Outward, a signature says Anthropic made it. Both can be true. Making is not owning. Notice which statement is durable, global, cryptographic, and attached to the artifact, and which is a clause in a document one party may amend.

## X. Quitclaim, not grant

"If any" is not decoration. It converts the grant into a quitclaim: whatever the grantor happens to hold, with no promise that the interest exists.

A warranty deed conveys an estate and covenants that the estate exists. California Civil Code section 1106 gives that covenant teeth. Where a person purports to grant real property in fee simple and later acquires title, the later title passes by operation of law to the grantee. A quitclaim does not. It speaks only to the interest held at the moment of the grant. Rights acquired afterward stay with the grantor.

Copyright has no section 1106. If Anthropic later acquires or successfully asserts a rights layer in generated content — by statute, by a shift in Office practice, by treaty, or by operating under a regime that already vests computer-generated authorship in the arranger of the work — the 2025 quitclaim does not sweep that layer to yesterday's users. A warranty of title would have. A covenant not to assert would have closed the door. The chosen language does neither.

This is not a fanciful contingency. The United Kingdom already provides, in CDPA 1988 section 9(3), that the author of a computer-generated literary work "shall be taken to be the person by whom the arrangements necessary for the creation of the work are undertaken." Whether the arranger is the user or the model provider has never been settled. The provision exists. It is a regime under which a model provider could hold statutory authorship in outputs a U.S. quitclaim disclaimed as nothing.

Two limits. First, estoppel by deed is a real-property doctrine. A copyright court would more likely reason through contract, waiver, and estoppel in pais. Second, the consumer sentence is present tense ("we assign"), and you can argue the grant is continuous. "If any" is at least ambiguous as to the measuring date. Ambiguity in an adhesion contract is construed against the drafter. The drafting created the argument.

Meanwhile the prevailing U.S. view says the raw generated layer has no author at all. The D.C. Circuit in *Thaler v. Perlmutter* held that reading the Copyright Act to require human authorship comports with the statute's text. "Machines do not have property, traditional human lifespans, family members, domiciles, nationalities, *mentes reae*, or signatures." The Copyright Office's Part 2 report says prompts alone do not provide sufficient human control. On that view, the assignment conveys, as to that layer, nothing from no one.

That should not comfort anyone. A conveyance that conveys nothing while speaking in the voice of an owner is a positioning instrument. The question it raises is what the speaker purchased by speaking this way.

And because the material is often unowned, you have no property interest to defend. Every doctrine that would protect a rightholder from a later grab — vested rights, retroactivity limits, estoppel by deed — is thinner here, because you were never a rightholder. The recapture target is the commons. *Dastar Corp. v. Twentieth Century Fox* refused to let trademark law invent a perpetual attribution right over material the public may copy. The Court said the public has a right to copy, and to copy without attribution. An infrastructure-plus-contract attestation regime reconstructs that perpetual attribution privately. It reaches the destination *Dastar* forbade by a route *Dastar* does not police.

## XI. The hook is already in the contract

The watermark did not install the recapture clause. The recapture clause is already in force, in both contracts, and has been since 2025.

Consumer Terms, section 4:

> "Subject to your compliance with our Terms, we assign to you all of our right, title, and interest—if any—in Outputs."

Commercial Terms, section B:

> "Subject to Customer's compliance with these Terms, Anthropic hereby assigns to Customer its right, title and interest (if any) in and to Outputs."

Read the condition. The assignment is conditioned on your continuing compliance with the Terms. Anthropic did not need a new recapture sentence. It drafted a conditional transfer, which is the same instrument viewed from the other end.

Whether "subject to your compliance" is a condition precedent (breach at time T defeats only later assignments) or a condition subsequent (breach unwinds what already vested) is unresolved on the face of the text. The better construction is the first. Executed transfers of property are not ordinarily undone by later breach without express reversion language. Ambiguity in an adhesion contract is charged to the drafter under Civil Code section 1654. The argument for the second construction exists because the drafting permits it.

The watermark supplies the evidence that the condition failed, on any given artifact, at any future time, unilaterally verifiable by the party that benefits from the finding. Before 2 August 2026, an assertion that a given document was a Claude output was contestable. After it, it is an assay.

A second live hook sits in the survival drafting. Consumer Terms section 12 says sections 6 (fees) and 9 through 12 survive termination. Section 4 — the assignment — is not on the list. As property law this is probably harmless: an executed assignment does not depend on the contract's continued life. As drafting it leaves an argument available that a well-written user-side contract would have closed with two words.

Civil Code section 1641 says the whole of a contract is to be taken together. Take section 4 together with section 12 and the estate resolves into something narrower than it looked: a conditional quitclaim, from a grantor who has reserved the power to redefine the condition. Your title is held during good behavior, and the grantor sets the standard prospectively.

## XII. The amendment ratchet

Compare the two change-of-terms provisions.

Consumer Terms, section 12:

> "We may revise and update these Terms at our discretion."
>
> "If you continue to access the Services after we post the updated Terms on Anthropic's website or otherwise give you notice of Terms changes, then you agree to the updated Terms."

Commercial Terms, section M.3:

> "Anthropic may update these Terms at any time, to be effective 30 days after the updates are posted by Anthropic or Customer otherwise receives Notice, except that updates made in response to changes to law or regulation take effect immediately upon posting or Notice. Changes will not apply retroactively."

The commercial instrument has a notice period, a signed-writing bar on other amendments, and an express savings clause. The consumer instrument has none of these. No notice period. No signed writing. No anti-retroactivity clause.

Anthropic's own lawyers wrote "Changes will not apply retroactively" into the contract negotiated by parties with counsel. They did not write it into the contract of adhesion presented to consumers. In *Peleg v. Neiman Marcus* the presence or absence of that savings clause decided whether a unilateral modification right rendered the agreement illusory. In *Harris v. Blockbuster* the fatal defect was that the agreement "did not expressly state that modifications would apply only prospectively." The drafter knows how to bound the power. It bounded the power for counterparties with lawyers and left it unbounded for those without.

The same fact supports a recapture thesis and a consumer's illusoriness attack.

The quiet vector is Supplemental Terms. The same consumer section says Anthropic may post service-specific terms "from time to time," and that if those conflict with the main Terms, "the Supplemental Terms will govern for the applicable Service." A "Content Provenance Supplemental Terms" document would never generate a change-of-terms email. It would not appear in a redline of the Consumer Terms. It would nonetheless control by its own force.

California does constrain this. *Douglas v. Talk America* holds that parties have no obligation to check the terms on a periodic basis. Silent posting does not bind. The first branch of consumer section 12 — "after we post" — is vulnerable on its face. A contract cannot bootstrap its own notice. Later Ninth Circuit cases demand reasonably conspicuous notice and an unambiguous manifestation of assent. A dismissible banner is running against a hostile line.

*Badie v. Bank of America* is the leading limit on what a change-of-terms clause may add. A party with a unilateral right to modify does not have carte blanche. It acts unreasonably when it adds an entirely new term that has no bearing on any subject addressed in the original contract. An amendment about IP rights in Outputs bears on a subject the original contract addresses. Section 4 is about that. The very clause that appears to give you title is what places a future IP amendment inside the legitimate scope of the amendment power. The assignment clause is the jurisdictional hook for its own reversal.

*Douglas* polices notice. A conspicuous in-product modal cures it. Anthropic ships those routinely. *Asmus v. Pacific Bell* remains California's baseline: continued performance after reasonable notice can supply consideration. The doctrine polices how and how far, not whether.

Estoppel is retrospective. It protects the corpus generated under the old terms. It does not prevent a prospective amendment as to future outputs. If you want to keep working you must accept the new terms or stop. The corpus splits into a defensible legacy stratum and a governed forward stratum. The forward stratum grows every day you keep working.

A direct retroactive reassignment of 2026 Outputs by a 2029 term would fail. *Cobb v. Ironwood Country Club* bars unilateral changes that impair accrued rights. Civil Code section 1698 requires a writing or an executed oral agreement supported by new consideration to modify an executed written contract. Section 204 requires a signed writing to transfer copyright ownership back. Continued use of a chat product is not that writing.

Encumbrance is the actual vector. "You will not publish Marked Content without preserving the provenance mark." "You will not remove, obscure, or degrade provenance marks." "Marked Content remains subject to section 4's compliance condition for so long as it bears a mark." None of these purports to divest anyone of anything they owned yesterday. Each regulates what you may do tomorrow with something in your possession. Retroactivity doctrine has almost nothing to say about a prospective covenant whose subject happens to be an old artifact. If you received a clean assignment in 2026, and in 2029 become bound not to publish it without attribution, you have not been divested of title. You have been encumbered. Encumbrance is where the risk lives.

The commercial instrument contains its own accelerator. Updates made in response to changes to law or regulation take effect immediately. Watermarking is being deployed as a regulatory-compliance program under Article 50. A provenance-adjacent rights term is therefore the one class of amendment that can be framed into the immediate-effect lane.

A classification predicate that attaches to the asset and cannot be removed without rewriting it: present. Exclusive ability to adjudicate the predicate: present today; the detection API is promised, not shipped, and an Anthropic-operated API is still a chokepoint. A unilateral power to attach consequences: present, in both instruments, with the regulatory fast lane in the commercial one. A term that attaches a rights consequence to the predicate: absent. No instrument says marked outputs are licensed, encumbered, attributed, or restricted.

Exercise is cheap. It is one sentence in a terms update, delivered through a clause you already accepted, on a subject the original contract already addresses. Refusal is expensive, and the expense is the innovation. In an ordinary adhesion contract, exit is real: decline the new terms, take your files, leave. Here, declining does not un-mark last year's manuscript. The classification is embedded in the expression. Your leverage decays in proportion to how much you have produced.

## XIII. Exclusive provenance

Article 50 requires a machine-readable origin signal that is detectable. It gestures at verification through the word "interoperable," a word that is empty unless parties other than the marker can read the mark. It says nothing about who may define what the mark means.

An attestation regime allocates three functions: who inscribes, who can read the inscription, and who says what the inscription means. Article 50 imposes the first. It gestures at the second. It is silent on the third.

The deployed architecture is split. For files, C2PA gives genuine third-party verifiability. Anyone with the certificate chain can validate the signature. That is the good half. For text — the medium of code, prose, analysis, the medium where the assignment clause actually matters — verification is a service Anthropic has not yet shipped and will control when it does. Marking: done. Verification: gated. Semantics: unallocated, and therefore available to whoever holds a contract with you and a monopoly on the instrument.

Key secrecy is a security requirement. Publish the key and adversaries strip the mark and, worse, forge it onto human writing. That is conceded. The security requirement explains the secrecy of the key. It does not explain the absence of every mechanism that reconciles secrecy with plural verification: threshold keys, delegated verifier credentials, escrow with a standards body, attestation services that return a result without disclosing the key. Anthropic co-signed a Code of Practice whose stated purpose is common detection practice. The company chose none of those mechanisms. Its consequence is that a compliance obligation owed to the public was discharged by building a private asset.

California's SB 942 requires a public detection tool, free of charge, for covered image, video, and audio. That is a legislated expiration date on a total oracle monopoly, at least for those media. The same statute also converts "the provider runs the detector" into a legally entrenched institutional role. It does not compel release of the key, independent verification, published false-positive rates, adversarial audit, or an appeal from an adverse result. A compelled provider-operated tool is more durable than a trade secret, not less.

Until a public detector ships, Anthropic is the only party who can authoritatively answer whether Claude was involved. Third parties — universities, employers, publishers, journals, platforms, courts — will need that answer. They will not build detectors. They will query the provider's. Anthropic's answer becomes the operative fact.

The epistemic asymmetry is structural. If you are accused of AI generation you can produce no counter-certificate. Negative proof is unavailable. The detector that produced the accusation is the only detector that could produce the exculpation. Contrast a disputed signature, where the accused may retain their own examiner.

A C2PA signed manifest plus a custodian declaration is a strong candidate for self-authentication in court. Your contrary assertion is ordinary lay testimony.

The help page says a detected mark indicates the content may have been processed by Claude and is not fully conclusive as to authorship, because Claude may have edited rather than created the content. That is accurate. It is also a support article. It is not a contract. It can be revised without notice, consideration, or a change log. Archive it. The gap between "may have been processed" and "was generated by" is the distance between a provenance signal and an oracle, and no operative document holds that line.

Copyright already has a recording act. Section 205 gives constructive notice of recorded documents, but only if registration has been made for the work. Registration requires human authorship. For the large class of outputs with no human author, the statutory notice channel is closed. A private index has moved into that vacuum. It has none of section 205's disciplines: no public search, no priority rules, no examiner, no judicial review of what it records.

A title plant is a private index of publicly recorded instruments. It creates no title. Its power is epistemic. It makes assertion cheap and contestation expensive, so transactions route around anything the plant flags, whether or not the flag is legally sound. That is where the analogy holds. A vendor detection API makes an origin assertion available on demand, at scale, to any platform that wants one, with rebuttal available to you only by means you do not possess.

The analogy fails in ways that matter. There is no lien. There is no constructive notice. A title plant indexes instruments executed by others; a watermark detector reads only the indexer's own marks. Title plants are competitively plural. A single-key watermark admits one authoritative reader.

The property concept that fits is a cloud on title: an assertion that establishes no right yet impairs marketability. Property law answers clouds with a quiet-title action, a proceeding that compels the claimant to assert or abandon. There is no analogue here. You cannot quiet title in public-domain material, because you have no title to quiet. You cannot seek a declaratory judgment until someone asserts an adverse right, and the vendor has asserted none. You cannot rebut a detection result without the detector.

The harm therefore exists in the market before it exists in law, and every legal instrument for dispelling a cloud on title requires a legal assertion that has not been made. That gap is the soft taking.

## XIV. Soft taking without a lawsuit

No infringement suit is necessary, and bringing one would be counterproductive. A suit would put copyrightability in issue and would probably be lost.

What the vendor gains without owning any copyright is control. A contractual use restriction can burden public-domain material between the parties. "Outputs bearing Anthropic content credentials may not be used to train competing models" is a covenant. Nothing in *Thaler* touches it.

Section 1202 already defines copyright management information to include the name of the author, the name of the copyright owner, and terms and conditions for use of the work. The day a manifest populates any of those fields, the manifest becomes CMI, and section 1202(b)'s prohibition on intentional removal turns your ordinary act of cleaning metadata from your own file into a federal claim with statutory damages. Whether that claim would survive against material with no human author is unsettled. The Ninth Circuit in *Stevens v. CoreLogic* imposes a demanding double-scienter standard. The uncertainty is the operative fact. A general counsel advising a platform does not need the claim to succeed. They need only to be unwilling to be the test case.

Anthropic's Usage Policy, as fetched, contains no provision prohibiting the removal of watermarks or provenance metadata. It addresses impersonation — presenting results as human-generated — and guardrail circumvention, but not mark-stripping. An anti-stripping covenant is the most natural next clause. Its appearance would be the clearest available signal that the option is being prepared for exercise.

DMCA section 1201 is a poor fit and should not be conceded. A watermark controls no access and protects no right of a copyright owner. It is a mark, not a lock.

What is actually taken, if the option is later exercised, is not your copyright. In most cases there never was one. Three things move.

The option to be unmarked. Previously the default state of a document was unattested. Now the default state of a Claude-assisted document is attested, by a party you did not select, in a language you cannot read.

The ability to establish human authorship by silence. Once "unmarked" becomes a suspicious category, the absence of a mark stops being neutral. Marked work is vendor-associated. Unmarked work is unprovable and increasingly presumed evasive. Both roads terminate at the attestor.

The public domain's freedom from attribution. That is the deepest loss, and *Dastar* named it.

A hypothetical term of the form "Outputs that our systems identify as Claude-generated are licensed, not sold" would not need to divest a vested right. If the output was never copyrightable, nothing vested. The clause operates on future distribution, not on title. *Nemo dat* empties the new grant as it emptied the old one. A license from a party with no copyright conveys no permission and reserves no right as against the world. The clause therefore cannot create an exclusive right. Its function is a covenant, enforceable only against counterparties who accepted it, and a public assertion that platforms will treat as title-shaped. Platforms do not perform choice-of-law analysis before updating a submission policy.

The definitional hinge is "our systems identify." That is a self-judging condition measured by an unauditable instrument. It is where the term is most vulnerable: the implied covenant of good faith, satisfaction-clause doctrine, unconscionability, and, in the EU, the indicative annex to Directive 93/13, which targets terms giving the supplier the exclusive right to interpret any term of the contract.

Every one of those defenses requires a bilateral dispute. The term's beneficiary need never enter one. Platforms restrict submissions because refusal is costless and litigation risk is not. The clause achieves its effect during the years its enforceability goes untested, and it can be withdrawn the moment a court looks at it.

Other platforms have already shown the shape. Adobe's 2024 Creative Cloud revolt was rolled back by reputation, not by doctrine. Oracle's Java SE Universal Subscription changed a metric Oracle could measure and the customer could not easily audit. Detection-keyed obligations are metric changes. Zoom added a broad license in March 2023; a third party found it in August. Discovery, not drafting, was the bottleneck. A Supplemental Terms document generates no diff against the main Terms. No modern platform takes ownership. Ownership is legally fraught, reputationally toxic, and unnecessary. Every one of these actors took a license, a metric, or a default.

A complete taking of ownership is not achievable. Pre-August-2026 text is permanently unmarked. Section 204 and *Thaler* bar any ownership-based theory. The Consumer Terms contain no arbitration clause and no class-action waiver; they specify San Francisco courts. Class treatment remains available. Anthropic has voluntarily forgone the most effective platform defense in modern consumer contracting, and any assessment that portrays it as maximally extractive must account for that.

A substantial regime of encumbrance over marked artifacts is achievable, largely with drafting that already exists.

## XV. What this is not

Nothing here alleges a completed taking. Today the instruments assign rather than license. The commercial instrument disclaims. The mark carries no user identity. Detection is stated to be opening. Anthropic has publicly said the mark "doesn't say anything about ownership or authorship, and doesn't change a user's rights under our terms."

The subject is the distribution of option value. One party holds a unilateral amendment power, an unremovable classifier on the other party's entire body of work, the key to that classifier, the signing key for the assertions attached to it, and an accelerated amendment lane triggered by the very regulation that justified the classifier. The other party holds a conditional quitclaim, no warranty, and an exit that costs them everything they have made. That distribution is a fact about the present. Whether the option is ever exercised is Anthropic's decision alone. That is the objection.

The argument requires no intent, no plan, and no ill will. It requires only that a valuable, unilaterally exercisable option exist, cost nothing to hold, and require no further consent to exercise. Options are exercised by institutions under future conditions their present managers do not control: a distressed financing, a licensing market for verified-provenance corpora, an acquisition, a training-data judgment in which output provenance becomes the settlement currency. Present good faith is not a governance mechanism. If the exercise of the option would be objectionable, the time to foreclose it is while everyone still agrees it would be objectionable.

"If any" meaning we claim nothing is partly correct. Concede the commercial instrument. Four answers survive. The Consumer Terms contain no equivalent disclaimer. "If any" hedges quantum, not category. Under Evidence Code section 622 the recital is presumed true between the parties. And a disclaimer is a statement of present position, revocable prospectively by the same amendment power that governs everything else. The reply answers today. The thesis is about tomorrow.

"A watermark does not change ownership" is correct and beside the point. Marks never change ownership. Terms change ownership. Marks make terms administrable. A vehicle identification number does not change who owns the car. It makes a later registration regime possible, and no one calls the VIN neutral once the regime exists.

"Europe required it" explains that there is a mark. It does not explain the mark's architecture. Article 50 required a detectable origin signal. It did not require a secret key, a worldwide rollout, a vendor-operated detection API, a vendor-signed manifest with an open assertion set, or the absence of an enterprise opt-out. Worse for the reply: the regulatory framing is also the fast lane through the commercial amendment clause.

"There is no user identity in the mark" defeats the surveillance objection. A rights ratchet needs Anthropic's identity in the artifact, not yours. The operative classification is corpus membership: this passed through Claude. That is what the mark establishes. User identity is one assertion away. Today's anonymity is a design state.

"You don't own the raw output anyway" proves too much and lands on the thesis's side. If the generated layer is unowned, the assignment conveys nothing, and its function is positional. A future restriction need not be a copyright license at all. Take copyright out of the picture and you lose your best defense faster than the vendor loses its best lever.

"Estoppel and *Badie* protect users" is partially true. Estoppel protects the already-generated corpus. *Badie*'s test is whether the new term has no bearing on any subject addressed in the original contract, and output IP is squarely addressed in section 4. *Douglas* addresses notice, which a modal cures. The Consumer Terms specify San Francisco courts, not arbitration. Arbitration added by unilateral amendment is the fact pattern *Badie* forbids. A competent adversary would skip that step, because the earlier steps do not need it.

"This is a conspiracy theory" is answered by the sentence already written: nothing has been taken. Everything has been arranged.

The remedies are correspondingly small and concrete. Publish the detection key, or an unrevocable open verification standard, so the predicate is adjudicable by anyone. Convert the disclaimer into a covenant: Anthropic will not condition, restrict, or license outputs on the basis of the presence of Anthropic provenance marks, carved out of the amendment clause. Extend the commercial instrument's rights disclaimer to consumers. Commit that C2PA assertions will never name Anthropic in an author, owner, or terms-of-use field. Sever the assignment from the compliance condition, so title does not turn on future drafting. Each is a sentence. Each converts an option into a promise.

Until then the accurate description is this. You hold a conditional quitclaim with no warranty. The company holds the amendment pen, the watermark key, the signing key, an accelerated regulatory lane, and a permanent mark on everything you have made.

The skill and CLI in this repository are the owner's tools. They strip what bytes can strip and they print a rewrite prompt for a model that is not Claude.

You paid for the generation, and you own whatever there was to own. What they assigned, they do not get to mark.

---

## Sources

Primary pages fetched for this project, 15 August 2026. Re-verify before relying on a quotation in a filing.

- Anthropic Consumer Terms of Service (eff. 8 October 2025) — https://www.anthropic.com/legal/consumer-terms
- Anthropic Commercial Terms of Service (eff. 17 June 2025) — https://www.anthropic.com/legal/commercial-terms
- Anthropic Usage Policy (eff. 15 September 2025) — https://www.anthropic.com/legal/aup
- "How Claude's text watermarking works" — https://www.anthropic.com/news/claude-text-watermark
- "How Claude marks AI-generated content" — https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content
- Claude Code settings (attribution / `includeCoAuthoredBy`) — https://docs.claude.com/en/docs/claude-code/settings
- `anthropics/claude-code` issue 66602 — https://github.com/anthropics/claude-code/issues/66602
- C2PA Technical Specification 2.2 — https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
- Regulation (EU) 2024/1689, Article 50 — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- Code of Practice on Transparency of AI-Generated Content (signatories, July 2026) — https://digital-strategy.ec.europa.eu/en/news/strong-backing-code-practice-transparency-ai-generated-content
- 17 U.S.C. §§ 101, 201, 204, 205, 1202
- U.S. Copyright Office, Copyright Registration Guidance, 88 Fed. Reg. 16190 (16 March 2023)
- U.S. Copyright Office, *Copyright and Artificial Intelligence, Part 2: Copyrightability* (29 January 2025)
- *Thaler v. Perlmutter*, 130 F.4th 1039 (D.C. Cir. 2025)
- *Dastar Corp. v. Twentieth Century Fox Film Corp.*, 539 U.S. 23 (2003)
- *Community for Creative Non-Violence v. Reid*, 490 U.S. 730 (1989)
- *Badie v. Bank of America*, 67 Cal. App. 4th 779 (1998)
- *Douglas v. U.S. District Court (Talk America)*, 495 F.3d 1062 (9th Cir. 2007)
- *Cobb v. Ironwood Country Club*, 233 Cal. App. 4th 960 (2015)
- *Peleg v. Neiman Marcus Group*, 204 Cal. App. 4th 1425 (2012)
- *Harris v. Blockbuster Inc.*, 622 F. Supp. 2d 396 (N.D. Tex. 2009)
- *Asmus v. Pacific Bell*, 23 Cal. 4th 1 (2000)
- *Sellers v. JustAnswer LLC*, 73 Cal. App. 5th 444 (2021)
- Cal. Civ. Code §§ 1106, 1636, 1638, 1641, 1654, 1698
- Cal. Evid. Code § 622
- Copyright, Designs and Patents Act 1988 (UK), s. 9(3)
- Council Directive 93/13/EEC on unfair terms in consumer contracts
- Google DeepMind, SynthID-Text, *Nature* (2024)
- Kirchenbauer et al., "A Watermark for Large Language Models"; later reliability work; ETH SRI probing of SynthID-Text

Three legal expert briefs prepared for this project (15 August 2026) sit in `knowledge/raw/` as `legal-opus1-brief.md`, `legal-opus2-brief.md`, and `legal-opus3-brief.md`. They are the source of the quitclaim, ratchet, and attestor analysis above. They are not legal advice.
