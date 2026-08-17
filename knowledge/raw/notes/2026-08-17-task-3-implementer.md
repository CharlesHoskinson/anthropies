# Task 3 implementer note (classify + Layer A + text inspect/clean)

Date: 2026-08-17
Role: implementer
Task: Classify + Layer A + text inspect/clean (Family 1)

## What I changed

- Created `src/layer-a.ts` `applyLayerA`. Ported current Python trailer/banner/ZWSP/bidi/tag behavior (Claude/Cursor/Copilot/Codex trailers, Generated-with banners). Leading BOM U+FEFF stays. Emoji ZWJ family stays. Did not paste WR Python.
- Created `src/kind.ts` `classify(bytes, suffix?)`. Magic: `\x89PNG` / `\xff\xd8\xff` / GIF / WEFF / ftyp avif|heic → `raster`; `%PDF` → `pdf`; `PK` + `.docx`/`.odt` → those kinds, else `binary`. Suffix `.md`/`.txt` only if magic is text. Unknown non-text magics → `binary`.
- Created `src/formats/text.ts` and `src/formats/registry.ts`. Registry is a `Partial<Record<Kind, FormatHandler>>` with `text` only. Later families add handlers. force-text falls back to the text handler.
- Created `src/services/{detector,reporter,inspector,cleaner}.ts` as `Effect.Service` + `Default`. Inspector/Cleaner `R` is `FileSystem` only. No `HttpClient`.
- `Inspector.inspect` and `Cleaner.clean` fail closed with `BinaryInput` on non-text kinds unless `--force-text`. Images are not “not implemented.”
- `Reporter.print`: `--json` writes `Schema.encode` JSON to stdout only; honesty stanza to stderr. `writeAtomic` is temp + rename; symlink dest is `WriteGuard`; no `.bak`.
- Wired `src/cli.ts` inspect/clean with `--json`, `--force-text`, `--in-place`, `-o`. Certificate-channel `present` → exit 1 (`ResidualHits` at the CLI edge). Fails → exit 2. humanize/capture/demo remain stubs.
- Created `tests/cert-layer-a.test.ts` (brief verbatim), `tests/binary-guard.test.ts`, `tests/write-guard.test.ts`, `tests/json-stdout.test.ts`.
- Created `fixtures/layer-a/` trailer, banner, zwsp, keep-emoji-zwj, keep-human-trailer.

## Why

Family 1 has to certify Layer A and refuse ZIP/PDF/image bytes on text commands. Classify is pure. Effect begins at read/write. `--json` stdout must stay Schema-only.

## Residual risks

- `.md` / `.html` / `.svg` classify as those kinds and fail closed (`BinaryInput`) until later families register handlers. `--force-text` proceeds.
- `json_stdout_purity` runs `tsc` then `node dist/cli.js` each time (~2s).
- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- `ResidualHits` is a CLI-edge exit-1 signal, not a Fail in `fail.ts`.
- Official adapter is still `Unavailable`. No detect URL, no HTTP.

## Almost did, did not

- Almost returned `DecodeError` “unsupported in this family” / “not implemented” on PNG. Did not. Ruling: fail closed `BinaryInput`. T5 owns raster.
- Almost added `HttpClient` to Inspector `R`. Did not.
- Almost pasted WR Python. Did not. Ported current `src/anthropies/clean.py` regexes only.
- Almost treated every `PK` as `docx`. Only `.docx`/`.odt` suffix after `PK`; otherwise `binary`.
- Almost dispatched STYLE/QA/DOCS subagents. Parent instruction: do not dispatch.
