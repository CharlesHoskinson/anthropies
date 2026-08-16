# README editorial revision design

## Objective

Revise `README.md` without changing its position, technical claims, legal claims, citations, commands, links, or authorial voice. The finished README should read as though one person wrote it deliberately from beginning to end. It should explain difficult points with enough prose to carry the reader between diagrams and conclusions.

## Editorial approach

Use a targeted expansion rather than a structural rewrite. Keep the existing order: technical explanation, tool documentation, manifesto, and legal argument. Preserve the direct technical voice and the sharper manifesto and legal cadence.

Apply the humanizer review as an editorial diagnostic. Replace formulaic transitions, negative parallelisms, repeated sentence shapes, inflated declarations, detached fragments, and generic summary lines with concrete prose. Do not remove unusual details, genuine rhetorical pressure, technical terms, case citations, or intentional short sentences. Added prose must explain a mechanism, connect an inference, or prepare the reader for the next section. It must not merely restate a heading or diagram.

## Technical and operational sections

Expand compressed passages where a reader currently has to infer the connection between the sampling mechanism, the detector, and the three removal paths. Retain the board-game analogy, numerical measurements, commands, configuration examples, and warnings. Favor plain sentences around specialized terms so that the README remains useful to readers who do not already understand watermarking.

## Manifesto and legal sections

Keep the existing argument and combative voice. Improve continuity between paragraphs, especially where the text moves from ownership to provenance, indemnity, authorship, or re-identification. Preserve all quotations and authorities without inventing support or strengthening a claim beyond what the current text says.

## ASCII diagrams

Treat every fenced ASCII diagram as a fixed-width layout. Align box edges, arrows, labels, branch points, and continuation text by display column. Keep related labels on stable baselines and add spacing where a label currently crowds a border or arrow. Do not change what a diagram asserts. Check the diagrams in a monospaced rendering and reject tabs or trailing whitespace.

## Validation

Review the final diff for semantic drift. Confirm that Markdown links and anchors remain valid, fenced blocks remain balanced, commands are unchanged unless a formatting correction is necessary, and diagrams have consistent line widths where their geometry requires it. Scan the final README for the humanizer patterns targeted by this revision and read the prose aloud for cadence. Run the repository test suite to ensure the documentation edit did not disturb packaged examples or command text used by tests.

## Out of scope

Do not revise `docs/MANIFESTO.md`, implementation code, tests, project branding, the hero image, licensing, or the project's stated legal and technical position. Do not publish, push, or open a pull request unless the user asks.
