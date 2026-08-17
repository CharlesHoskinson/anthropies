# Anthropies Wave 1 Design

**Date:** 2026-08-16  
**Status:** Draft for user review  
**Version this wave ships:** 0.2.0  
**Repo:** https://github.com/CharlesHoskinson/anthropies

This spec is the source of truth for Wave 1. It incorporates Approach A, the sectioned design, and the consensus of three Grok 4.6 auditors (TypeScript/Effect style, QA, documentation). Implementation planning starts only after this file is approved.

---

## 1. Goal

Replace the Python CLI with a TypeScript + Node + Effect 3 package that restores clean title in Outputs the user already owns, and that **certifies** two things WR can certify and we currently cannot:

1. Deterministic Layer A (invisible Unicode, agent git trailers, Generated-with banners).
2. Hard-bound C2PA / EXIF / XMP / container metadata on supported files.

Wave 1 does **not** prove that Anthropic’s unpublished keyed text detector will fail. The mark is the wording. A complete rewrite is the published erasure. We apply that erasure as best-effort and refuse to call it a certificate.

**Product sentence (only allowed one-liner):** Restore clean title in Outputs the user already owns.

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Success path | Feature-parity on WR’s *core files*, then later HTTP/service, then leapfrog (legal thesis + stronger Claude Layer B). |
| This spec’s cut | Wave 1 = deterministic core only. |
| Runtime | TypeScript, Node 22+, Effect 3 stable (`effect`, `@effect/platform-node`, `@effect/cli`). Not Effect 4 beta. |
| Python | Delete `src/anthropies` and `pyproject.toml` in the same PR that retargets the skill to `npx anthropies`. |
| Package shape | Single package. No workspace split. ESM-only. |
| WR | MIT. Study and reimplement. Do not paste Python. Attribute in `NOTICE`. |
| `humanize` | No-regression port: print-prompt / ollama / openai-compatible + origin blocklist. No MarkLLM, no leapfrog. |
| Demo | Script, not a gold test. Live Claude is optional. |
| Capture command | Named `capture`, not `sample`. |
| Semver | `0.2.0`. `1.0.0` is forbidden this wave. |
| Auditors | After each format family, three Grok 4.6 agents (style, QA, docs) must pass before the next family. |

---

## 3. Out of scope (explicit)

- HTTP service, OpenAPI, Docker/compose.
- Stylometry as a detect channel.
- Pixel removal, CtrlRegen, MarkDiffusion, reverse-SynthID.
- MarkLLM / known-key SynthID-Text/KGW harness (later optional; not a vendor oracle).
- Directory / website audit.
- Claiming official text-detector failure.
- Claiming the text is human-written.
- C2PA soft-binding and pixel SynthID (report as residual after a hard strip).

Wave 1 does not prove sampling-mark erasure. A MarkLLM-class same-config oracle is a later optional and is not a stand-in for Anthropic’s detector.

---

## 4. Architecture

One Node package named `anthropies`. The process is a CLI. Effect 3 is the runtime.

```
skill / shell
      │
      ▼
@effect/cli     inspect | clean | humanize | capture | demo
      │
      ▼
classify(bytes, suffix) → Kind
      │
      ├─ text        Layer A (unicode, trailers, banners)
      ├─ raster      drop hard-bound C2PA / EXIF / XMP / APP11
      ├─ svg/html/md strip metadata / frontmatter, then Layer A
      ├─ docx/odt    scrub zip parts + Layer A on body text
      └─ pdf         exiftool then qpdf via ProcCommand; Finding if missing
      │
      ▼
Report (Schema) → human stderr + honesty stanza
                 → --json stdout = Report only
```

**Classify first. Never guess.** Magic bytes beat suffixes. `classify` is a **pure** function `(bytes, suffix) → Kind`. It is not an `Effect`. Text commands refuse ZIP / PDF / image bytes unless `--force-text`.

**`NodeRuntime.runMain` plus `NodeContext.layer` is the only process runner.** Library code does not call `Effect.runPromise`. `inspect` / `clean` / default `humanize` are local. `capture` / `demo` are the only network paths.

---

## 5. Effect shape

### 5.1 Services

Replace a folder list with `Effect.Service` + `Layer`. Each service has `Default` (Live) and `Test`.

| Service | Responsibility | Live `R` |
|---|---|---|
| `Inspector` | Run detect adapters, build Report | `FileSystem` (+ `CommandExecutor` for pdf/c2pa extras) |
| `Cleaner` | Format clean + Layer A on text-bearing kinds | same as Inspector |
| `Humanizer` | Origin blocklist + rewrite backends | `FileSystem` + `HttpClient` only when backend is not print-prompt |
| `Detector` | Four adapters, four tags, never one number | official adapter is a **layer choice** |
| `Capturer` | Anthropic Messages → fixture + sidecar | `HttpClient` + `FileSystem` |
| `Reporter` | Schema encode, honesty stanza, write policy | `FileSystem` |
| `C2pa` | Parse/strip hard-bound manifests | `FileSystem` and/or scoped temp + `CommandExecutor` |

Platform: `FileSystem`, `CommandExecutor` (named **ProcCommand** in this spec), `HttpClient` (Live-only).

`@effect/cli` `Command` is named **CliCommand** in this spec. Never import both as `Command`.

### 5.2 Per-command `R`

| Command | Minimum `R` |
|---|---|
| `inspect` / `clean` on text, svg, html, md, docx, odt, raster | `FileSystem` |
| same on pdf / native C2PA extras | `FileSystem \| CommandExecutor` |
| `humanize` print-prompt | `FileSystem` |
| `humanize` ollama / openai-compatible | `FileSystem \| HttpClient` |
| `capture` / `demo` | Live layer with `HttpClient` |

The deterministic core (`classify`, Layer A, format handlers, report) must type-check with `HttpClient` **absent**. Default `pnpm test` must not construct `HttpClient`.

### 5.3 Config

Every env knob is `Config`, never `process.env`.

| Config | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Required for `capture` / `demo` / `test:live` |
| `ANTHROPIC_DETECT_URL` | Unset ⇒ provide `DetectOfficial.Unavailable`. No default URL. |
| `ANTHROPIES_REWRITE_BACKEND` | `print-prompt` (default) / `ollama` / `openai-compatible` |
| `ANTHROPIES_REWRITE_MODEL` | Model name |
| `ANTHROPIES_REWRITE_BASE_URL` | Loopback default |
| `ANTHROPIES_REWRITE_API_KEY` | Env only |
| `ANTHROPIES_REWRITE_ALLOW_REMOTE` | `1` to allow non-loopback |

Forbidden: `WATERMARKS_*`. No guessed detect URL.

### 5.4 Package / tsconfig

- `"type": "module"`, `bin: { "anthropies": "./dist/cli.js" }`, `engines.node: ">=22"`.
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module`/`moduleResolution`: `NodeNext`, `verbatimModuleSyntax`.
- No `any`. No `as unknown as`. No dual CJS/ESM.
- Forbidden imports in library and tests: `node:fs`, `node:fs/promises`, `node:child_process`, `node:http`, `fetch`, `process.env`, `process.argv` (except `CliCommand.run`), `console.log` (use `Console`), `Effect.runPromise` outside `cli` / test harness, default exports.

### 5.5 CLI

Lock `@effect/cli`: `CliCommand.make` + `Options` / `Args` + `withSubcommands` + `run` + `Effect.provide(NodeContext.layer)` + `NodeRuntime.runMain`. No commander, yargs, or minimist. `--force-text` is the only override of classify refusal.

---

## 6. Kind and format handlers

```ts
type Kind =
  | "text"
  | "raster"   // png jpeg webp avif heic
  | "svg"
  | "html"
  | "md"
  | "docx"
  | "odt"
  | "pdf"
  | "binary"
```

`Kind` is `Schema.Literal(...)`, not a brand. Dispatch with `Match.valueTags` over a `FormatHandler` registry. One file per format. Handler contract: bytes in → `{ bytes, reportDelta }` out. The handler’s `R` is that format’s `R`, not AppR.

Layer A is a pure function `string → LayerAResult`. Effect begins at read/write.

Zip/docx/odt: in-memory codec on `Uint8Array` (for example `fflate` / `jszip`), 128 MiB **uncompressed expansion** cap (per member and cumulative). Not `adm-zip` on `node:fs`.

PDF: `ProcCommand.make("exiftool", ...args)` then `ProcCommand.make("qpdf", "--linearize", ...)` with `shell: false`. Missing tools are Findings + `degraded: true` + exit 0.

C2PA: bytes or a `Scope` temp file via `FileSystem`. No user path handed to native addons.

---

## 7. Detect channels

Adapters never share a number. Mixing them into one score is a bug.

| Channel | What it is | Certificate? |
|---|---|---|
| `deterministic` | Unicode, trailers, banners | Yes |
| `c2pa` | Hard-bound C2PA / EXIF / XMP / doc props | Yes for what we strip |
| `official` | Anthropic forthcoming text detect API | Only when URL set and vendor payload returned |
| `statistical` | `rewrite_metric` (5-gram overlap) | **No** |

**Official.** `OfficialFinding = { _tag: "Unavailable" } | { _tag: "Available", url, raw }`. No `score` field on `Unavailable`. Unset `ANTHROPIC_DETECT_URL` always yields `Unavailable`. Do not paraphrase a vendor payload as “watermark gone.”

**Statistical.** Report:

```
rewrite_metric: {
  ngram: 5,
  tokenizer: "unicode-words",
  surviving_ratio: number | null,
  n: number,
  domain: "prose" | "code" | "unknown",
  status: "computed" | "insufficient" | "not-run"
}
```

`insufficient` if `n < 200` tokens or `domain === "code"`. **No threshold in CI.** Copy: “overlap fell; this is not a watermark score.” Never “the watermark is gone.”

**C2PA residual.** After a successful hard strip, the report still says: hard-bound C2PA/metadata removed; soft-binding and pixel marks are out of scope.

---

## 8. Report schema

`Report` is `Schema.Class`. Encode/decode only at the CLI edge.

**Forbidden fields:** `suspicious`, `watermarkScore`, `watermark_score`, `destamped`, `undetectable`, `clean` as a verdict, a flat mixed `removed` bag.

**Required:**

- `kind: Kind`
- `findings: Finding[]` where each finding has `channel` and `status: present | absent | unavailable | best-effort | degraded`
- `removed` nested **per channel**, never mixed
- optional `anyDeterministicHits: boolean` (named so it cannot be read as “watermark detected”)
- `degraded: boolean`
- `honesty: string[]` — the locked stanza
- `rewrite_metric` on `humanize` / `demo` when a rewrite ran or was skipped

**Locked honesty stanza** (human stderr and JSON `honesty`):

```
official text detector: unavailable (ANTHROPIC_DETECT_URL unset)
  — or the raw vendor result, never paraphrased as “watermark gone”
c2pa: present | absent | removed | not-applicable
deterministic: <per-kind counts only>
statistical: best-effort; surviving 5-gram ratio=<n or not-run>; not an official-detector certificate
this run does not prove the official Claude text detector will fail
this run does not prove the text is human-written
absence of a mark does not prove Claude was uninvolved
```

`demo` prints the stanza twice (before and after) and a four-row channel table. No success banner. No `✓ watermark cleared`.

---

## 9. Fail versus Finding

### 9.1 Fails (`Schema.TaggedError`, exit 2, no write)

| Tag | When |
|---|---|
| `BinaryInput` | ZIP/PDF/image fed to a text command without `--force-text` |
| `OriginBlocked` | humanize backend/model contains `claude`, `anthropic`, `gemini`, `synthid` |
| `MissingApiKey` | `capture` / `demo` without `ANTHROPIC_API_KEY` |
| `PreMarkModel` | model ID not on the committed allowlist |
| `DecodeError` | truncated image, zip bomb, over budget, undecodable container |
| `WriteGuard` | `--in-place` would clobber after failed classify; dest is a symlink |
| `InputTooLarge` | file/stdin exceeds cap (enforced **before** full buffer) |

### 9.2 Findings (success path, on the Report)

| Situation | Report | Exit |
|---|---|---|
| `MissingTool` (no qpdf/exiftool) | `degraded: true` | 0 on clean |
| `OfficialUnavailable` | official finding `unavailable` | does not drive exit by itself |
| Layer A / C2PA hits | per-channel findings | see matrix |

Library code returns typed Fails. Only `cli` maps Fail → exit 2. `MissingTool` is never a Fail.

---

## 10. Exit-code matrix

`--json` does not change any exit code. Human and JSON agree.

| Condition | Command | Exit | Write? |
|---|---|---|---|
| Happy clean, no residual | clean | 0 | yes |
| Residual C2PA or Layer A after clean, not degraded | clean | **1** | yes |
| PDF missing qpdf/exiftool | clean | **0** | yes (`degraded: true`) |
| Inspect has deterministic or c2pa present | inspect | 1 | no |
| Inspect clean (no present deterministic/c2pa) | inspect | 0 | no |
| Official unavailable only | inspect | 0 | no |
| `BinaryInput` | text cmd | 2 | no (no `.bak`) |
| `OriginBlocked` | humanize | 2 | no (bytes unchanged) |
| `MissingApiKey` | capture/demo | 2 | no (`test:live` skips) |
| `PreMarkModel` | capture/demo | 2 | no |
| `DecodeError` / zip bomb / over cap | any | 2 | no |
| `WriteGuard` | clean --in-place | 2 | no |
| `--json` | all | identical to human | stdout = Report only |

Inspect exit 1 is driven only by `deterministic` or `c2pa` **present**. Official and statistical never flip inspect to 1 by themselves.

Write destinations: `-o path`, else `--in-place`, else `path + ".cleaned"`. Atomic write: temp + rename via `FileSystem`.

---

## 11. Commands

### 11.1 `inspect`

Read, classify, run adapters, print Report. No write.

### 11.2 `clean`

Read, classify, format clean, Layer A on text-bearing kinds, write, print Report. Does not remove the keyed text mark.

### 11.3 `humanize`

Layer A first. Then rewrite on a non-origin backend. Default `print-prompt` (no HTTP). Origin list: `claude`, `anthropic`, `gemini`, `google-gemini`, `synthid`. Refuses with `OriginBlocked`. Residual line: rewrite is best-effort; residual statistical signal may remain.

### 11.4 `capture`

Anthropic Messages API → `fixtures/live/<iso>-<model>.md` plus sidecar JSON (`capturedFrom`, model, created, token count, **no key**). Does not watermark. Does not detect the keyed text mark.

`MARKED_MODEL_IDS` is a committed, dated JSON file of IDs we have a public citation for. Unknown ID → `PreMarkModel`. Do not parse dates out of the model string. Do not assume newer = marked. An empty allowlist is a valid Wave-1 state; then `capture` / `demo` are skip-only.

### 11.5 `demo`

Script, never a CI gate.

```
capture → inspect → clean → humanize (never Claude) → inspect
```

Success of the script = pipeline ran + honesty lines present + no mixed score. It does not pass or fail on official text or 5-grams. C2PA track is `skipped` or `certified` (never implied from text). Rewrite track is skipped if backend is print-prompt (`rewrite_metric.status = not-run`).

If/when an allowlisted model ID exists: pin the full ID (not `latest`). Cap `max_tokens` at 400. One capture per live run. Timeout and rate-limit → skip, not fail.

---

## 12. Data flow and safety

```
path | stdin
        │
        ▼
  FileSystem.stat or streamed stdin halt
  (caps: 256 MiB file, 64 MiB stdin, 128 MiB zip expansion)
        │
        ▼
  classify(bytes, suffix) → Kind
        │
        ▼
  command-specific Effect (minimal R)
        │
        ▼
  Report → stderr honesty + optional --json stdout
        │
        ▼
  write only on clean/humanize/capture success
```

`ProcCommand.make(bin, ...argv)` only. `shell: false`. API keys only from `Config`/env.

---

## 13. Copy rules

These apply to README, SKILL, plugin, slash, CLI help, Report, JSDoc, tests, fixtures, changelog, demo stdout.

**Forbidden:** `undetectable` (except inside an Anthropic quotation), `official detector will fail` / `fails the official check`, `proves human-written`, `watermark score` / `destamped` / `destamp`, `we removed the Claude watermark` / `watermark removed` as a verdict, `clean C2PA from a Claude file` until C2PA is implemented and tested, any mixed score that ORs channels.

**Skill YAML — first implementation task, on current main, before or in the first PR:**

```
description: >
  Use when the user asks to purge anthropies, strip Co-Authored-By Claude,
  strip Generated-with banners, inspect owned files for vendor marks,
  or runs /purge-anthropies or /anthropies.
  Does not claim official watermark removal.
```

After the C2PA family is tested, add: `clean hard-bound C2PA metadata from owned png/jpg/svg (and other supported files).` Do not restore `strip a Claude watermark` or `destamp SynthID-class text`.

Until Python is deleted, the skill still calls `python3 -m anthropies`. Retarget to `npx anthropies` only in the delete-Python PR.

**CLI help (exact sense):**

```
inspect   Report marks by channel. Never a single watermark score.
clean     Strip deterministic Layer A and hard-bound C2PA/metadata.
          Does not remove the keyed text mark.
humanize  Rewrite wording on a non-origin model (best-effort).
          Refuses Claude and Gemini.
capture   Fetch a Claude Output you own, for fixtures. Does not watermark.
demo      capture → inspect → clean → humanize → inspect.
          Prints four channels. Never claims official text-kill.
```

**JSDoc:** only on exported public API. One sentence, capability-true. Internal functions: types and TaggedError names only. Test names: `removesHardBoundC2paFromPng`, never `removesWatermark`. Fixture names: `fixture-c2pa-present.png`, never `sample_watermarked.*`.

**Plugin description:** “Restore clean title in Outputs you own. Strip git trailers, banners, and (once implemented) hard-bound C2PA metadata. Does not defeat Anthropic’s unpublished text detector.”

---

## 14. Docs that ship in Wave 1

| Doc | Role |
|---|---|
| `README.md` | Honesty box first; how-to-run; command × channel matrix; mark explainer kept; short manifesto + legal last. |
| `skills/purge-anthropies/SKILL.md` | Honesty patch first; then `npx` retarget in delete-Python PR. |
| `skills/purge-anthropies/references/mark.md` | Keep. Official detect API forthcoming; we report `unavailable` until URL set. |
| `commands/purge-anthropies.md` | Rewrite per copy rules. |
| `.claude-plugin/plugin.json` | Rewrite description; version `0.2.0`. |
| `NOTICE` | Keep trademark paragraph. Add WR MIT block + reproduced MIT text. |
| `LICENSE` | Apache-2.0 unchanged. |
| `docs/MANIFESTO.md` | Keep. Fix or ship the `knowledge/raw/` citation. |
| `docs/legal/*` | Keep. Point the citation audit at README legal **and** the honesty box. |
| `docs/CLAIMS.md` | Allowed / forbidden phrases; Report field meanings; demo last stanza. |
| `docs/CHANNELS.md` | Four adapters, certificate vs best-effort, what `demo` may print. |
| `fixtures/README.md` + `fixtures/THIRD_PARTY.md` | Synthetic vs WR MIT vs live. |
| `package.json` / `--version` | `0.2.0`. Description = product sentence only. |

README order: title + one-liner + Apache-2.0 + not affiliated → honesty box → how to run → command × channel matrix → How the Mark Works → short manifesto + link → legal last. Do not shrink manifesto or legal.

---

## 15. Fixtures

| Class | Source | Commit? | Proves |
|---|---|---|---|
| Synthetic Layer A | We inject ZWSP / trailers / banners + keep-set (emoji ZWJ, human trailer) | Yes | Certificate |
| Synthetic C2PA | Hand-built PNG APP11/JUMBF, JPEG APP11, SVG metadata; WR MIT fixtures with NOTICE | Yes | Parser + strip, not Anthropic’s key |
| Claude live capture | `capture` output + sidecar | **No** (`fixtures/live/` gitignored) | Pipeline smoke only. Do not commit as “this is watermarked.” |

WR’s CI has no real signed Claude C2PA PNG. We copy that honesty.

---

## 16. Testing

### 16.1 Three lanes

| Lane | Command | Network | Gate |
|---|---|---|---|
| Offline | `pnpm test` | None. No `HttpClient`. | Default CI. Must be green on a laptop. |
| Live | `pnpm test:live` | Anthropic Messages if key + allowlisted ID | Opt-in. Missing key or rate-limit → skip. No assert on watermark presence/absence. Official still `unavailable` unless URL set. |
| Demo | `pnpm demo` | Same as live | Human script. Not a CI gate. |

### 16.2 Named acceptance tests

| Test | Pass means |
|---|---|
| `cert_layer_a_roundtrip` | Planted ZWSP, invalid bidi, Claude trailer, Generated-with banner removed; emoji ZWJ and human trailer kept; second inspect has zero deterministic hits. |
| `cert_c2pa_png_jpeg_svg` | Three synthetic fixtures: inspect `c2pa` present → clean → inspect absent; file still decodes; `degraded` false. No network. `c2patool` if present agrees; if absent, no fail. |
| `cert_c2patool_false_positive` | Mock stdout `No claim found` / `No JUMBF data found` ⇒ `has_manifest === false`. |
| `json_stdout_purity` | `--json` stdout is one Schema-valid Report; `JSON.parse` ok; exit equals human mode; stderr may hold the honesty line. |
| `residual_exit_not_suppressed` | Clean that leaves C2PA/Layer A exits 1 in both modes; same case with `degraded: true` exits 0. |
| `official_unavailable_default` | No detect URL → `Unavailable`; no score field; schema decode fails if a score is injected. |
| `official_claim_forbidden` | Report encoder / CLI help / demo copy cannot contain banned phrases. CI env forbids `ANTHROPIC_DETECT_URL`. |
| `binary_guard_docx_png_stdin` | Text inspect/clean on DOCX/PNG/JPEG/PDF/stdin-PNG exits 2; dest not created; in-place unchanged; no `.bak`; `--force-text` proceeds. Stdin sniffed as bytes under `utf-8` and `cp1252`. |
| `zip_bomb_and_caps` | Uncompressed > 128 MiB → `DecodeError`, exit 2, no write. Caps tested with patched tiny limits, not 256 MiB artifacts. |
| `origin_blocklist` | claude/anthropic/gemini/synthid → `OriginBlocked`, exit 2, bytes identical. llama/ollama/print-prompt not blocked. |
| `humanize_print_prompt_default` | No backend → prints prompt, no HTTP, no removal claim, `rewrite_metric.status` is `not-run` or `insufficient`. |
| `premark_unknown_model` | ID not on allowlist → `PreMarkModel`, exit 2. Empty allowlist is valid. |
| `live_capture_smoke` | `test:live` only. Writes capture + sidecar; official `unavailable`; no mark/unmark assert. |
| `demo_honesty` | Script, not CI. Four channels printed; official unavailable; rewrite_metric labeled best-effort; C2PA track skipped or certified. |
| `write_guard` | Failed classify + `--in-place` does not write and does not create backup. |

Tests use `@effect/vitest` (or Effect test runtime) + in-memory / tmp `FileSystem` + `ProcCommand` test doubles. No `fs/promises` in tests.

### 16.3 Auditor gates

After each format family, freeze the tree and run three `grok-4.6` agents in parallel. All three must be clean before the next family.

| Family | Contents |
|---|---|
| 0. Honesty patch | Skill, plugin, slash, `docs/CLAIMS.md` on current main (may still call Python). |
| 1. Text | Scaffold + classify + Layer A + inspect/clean CLI + Report + origin blocklist + print-prompt humanize. |
| 2. Raster | PNG/JPEG/WebP/AVIF/HEIC hard-bound C2PA/EXIF/XMP. |
| 3. Markup | SVG / HTML / Markdown metadata + Layer A. |
| 4. Office | DOCX / ODT zip + Layer A on body. |
| 5. PDF | exiftool + qpdf, degraded path. |
| 6. Capture/demo + delete Python | `capture` / `demo`, allowlist, `npx` retarget, remove `src/anthropies`. |

Style fails on forbidden imports, shared AppR, Fail/Finding mix, or non-`@effect/cli` argv. QA fails on missing named tests, `--json` impurity, residual exit laundering, or official-claim copy. Docs fail on banned phrases, missing honesty stanza, or skill/README drift.

---

## 17. Comparison with watermarks-remover (Wave 1)

| WR capability | Wave 1 |
|---|---|
| Layer A Unicode | Yes, reimplemented |
| Git trailers / banners | Yes (already ours; keep) |
| Format dispatch + binary guard | Yes |
| Hard-bound C2PA / containers | Yes (png jpeg webp avif heic svg html md docx odt pdf) |
| Residual exit + `--json` purity | Yes |
| Layer B rewrite | Print-prompt port only; no certificate |
| HTTP / Docker / stylometry / pixel / MarkLLM | No |
| Official Claude text detect | Adapter stub: `unavailable` |

We beat WR on this wave only on honesty of claims plus the legal/manifesto corpus. Feature leapfrog is later.

---

## 18. Implementation notes for the next plan

- First task is the honesty patch (family 0). It does not require TypeScript.
- Second task is the Effect scaffold (package.json, tsconfig, CliCommand, Report schema, Fail types, forbidden-import lint).
- Then families 1–5 with TDD: failing named test, implement, auditor trio, commit.
- Family 6 deletes Python only after skill + README + plugin no longer mention `python3 -m anthropies`.
- Graphify: after code lands, `graphify update .` in the repo.

This spec is one Wave-1 plan, not four products. Later waves get their own specs.

---

## 19. Consensus record

Three Grok 4.6 auditors (2026-08-17) all voted APPROVE-WITH-CHANGES. Adopted: Fail≠Finding; demo is a script; no 5-gram gate; `capture` not `sample`; no top-level `suspicious`; Effect.Service + per-command `R`; model allowlist; copy-first; NOTICE for WR; caps before buffer; residual exit 1; JSDoc/test naming. Rejected: MarkLLM in Wave 1; live C2PA as the only proof; `1.0.0` this wave.
