<!-- llm-wiki: v1 -->
# Anthropies Wave 1 Wiki — wiki schema

**Domain:** Implementation notes, auditor verdicts, and design rulings for upgrading anthropies to an Effect 3 TypeScript core (Wave 1).

This repository is an LLM-maintained knowledge wiki (Karpathy "LLM Wiki" pattern).
The `llm-wiki` skill operates it. Humans curate sources and ask questions; the
LLM writes and maintains all pages. Every implementer and auditor **must**
ingest a raw note of their thoughts before they finish.

## Layout
- `raw/` — immutable source documents (never edited). `raw/assets/` for images. Agent notes live in `raw/notes/`.
- `wiki/sources|entities|concepts|syntheses/` — LLM-generated pages (+ `_index.md` each).
- `wiki/maps/` — topic MOCs. `wiki/overview.md` — evolving thesis (root MOC).
- `index.md` — router to category indexes. `log.md` — append-only history.

## Workflows
- Ingest / Query / Lint / Init / Scrape are defined by the `llm-wiki` skill. Follow it.

## Conventions (summary; full rules in the skill's references/conventions.md)
- `[[wikilinks]]`; unique titles; every page ≥1 link + in a MOC + category index.
- Every claim on a concept/entity page carries an inline `^[from [[Source]] — "quote"]` marker.
- Contradictions append + flag (`status:` + `> [!conflict]`), never overwrite.
- One atomic git commit per ingest (stage only wiki paths).
