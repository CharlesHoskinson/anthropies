# Anthropies Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Python CLI with an Effect 3 TypeScript package that certifies Layer A and hard-bound C2PA, and that refuses official-detector claims.

**Architecture:** Single ESM Node 22 package. `@effect/cli` is the process edge. `classify` and Layer A are pure. Format handlers are bytes-in / `{ bytes, reportDelta }`-out. Detect adapters never share a number. `capture` / `demo` are the only HTTP paths.

**Tech Stack:** TypeScript, Node 22+, Effect 3 (`effect`, `@effect/platform-node`, `@effect/cli`), pnpm, vitest + `@effect/vitest`.

**Spec:** `docs/superpowers/specs/2026-08-16-anthropies-wave1-design.md`

## Global Constraints

- Version `0.2.0`. `1.0.0` is forbidden this wave.
- Product sentence: “Restore clean title in Outputs the user already owns.”
- Effect 3 stable only. Not Effect 4.
- ESM-only. `strict` + `NodeNext` + `verbatimModuleSyntax` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Fail (`Schema.TaggedError`, exit 2, no write) ≠ Finding (on `Report`).
- No top-level `suspicious`. No mixed `removed`. No 5-gram CI gate.
- Command is `capture`, never `sample`.
- Official text adapter is `Unavailable` unless `ANTHROPIC_DETECT_URL` is set. No default URL.
- Forbidden imports: `node:fs`, `node:fs/promises`, `node:child_process`, `node:http`, `fetch`, `process.env`, `process.argv` (except `CliCommand.run`), `console.log`, `Effect.runPromise` outside `cli` / test harness, default exports.
- Env knobs via `Config` only. Ours are `ANTHROPIES_*`. Vendor keys are `ANTHROPIC_API_KEY` and `ANTHROPIC_DETECT_URL`.
- Out of scope: HTTP service, Docker, stylometry, pixel/CtrlRegen/MarkDiffusion, MarkLLM, directory audit, official-detector-fail claims.
- Copy rules in spec §13 and `docs/CLAIMS.md` apply to every string this plan adds.

---

## Protocol: 1 implements, 3 check

This is not optional review flavor. It is how every task in this plan ends.

**Implementer:** exactly one Grok (the session agent, or one `grok-4.6` implementer). No second implementer in parallel on the same files.

**Auditors:** after the implementer’s tests pass and before the next task starts, dispatch **three** `grok-4.6` agents in one message, `capability_mode=read-only`, using these personas and no others:

1. **TypeScript/Effect style** — forbidden imports, `Effect.Service` + `Layer`, Fail≠Finding, per-command `R`, `@effect/cli` only, ESM/strict tsconfig, no `any`.
2. **QA** — named acceptance tests from spec §16.2 that this task owns, `--json` stdout purity, residual exit 1 unless `degraded`, no official-detect lie, binary guard / caps if touched.
3. **Docs/comments** — `docs/CLAIMS.md`, honesty stanza, banned phrases, skill/README/plugin drift, JSDoc only on public API, test names like `removesHardBoundC2paFromPng` not `removesWatermark`.

**Gate:** all three must return APPROVE or APPROVE-WITH-CHANGES with BLOCKERs fixed before Task N+1. A reminder scheduler (`01a00dbb5f12`, every 30m, foreground) restates this protocol. Do not disable it for this wave.

**Auditor prompt prefix (use verbatim, then attach the task diff):**

```
You are a Grok 4.6 auditor for anthropies Wave 1.
Spec: docs/superpowers/specs/2026-08-16-anthropies-wave1-design.md
Plan: docs/superpowers/plans/2026-08-16-anthropies-wave1.md
Persona: <STYLE|QA|DOCS>
Read the uncommitted + last-task diff only. Do not implement.
Verdict: APPROVE | APPROVE-WITH-CHANGES | REJECT
List BLOCKER / MAJOR / NIT. Cite file:line.
```

---

## File map

```
package.json                         # name anthropies, version 0.2.0, type module, bin
pnpm-lock.yaml
tsconfig.json
eslint.config.js                     # forbid node:fs, process.env, etc.
docs/CLAIMS.md
docs/CHANNELS.md
fixtures/README.md
fixtures/THIRD_PARTY.md
fixtures/layer-a/trailer-claude.txt
fixtures/layer-a/banner-generated.txt
fixtures/layer-a/zwsp.txt
fixtures/layer-a/keep-emoji-zwj.txt
fixtures/layer-a/keep-human-trailer.txt
fixtures/c2pa/fixture-c2pa-present.png
fixtures/c2pa/fixture-c2pa-present.jpg
fixtures/c2pa/fixture-c2pa-present.svg
fixtures/live/.gitignore             # ignore *
src/cli.ts                           # CliCommand root + runMain
src/config.ts                        # Config wrappers
src/kind.ts                          # Kind + classify
src/layer-a.ts                       # pure Layer A
src/report.ts                        # Report Schema + honesty stanza
src/fail.ts                          # TaggedError Fails
src/services/inspector.ts
src/services/cleaner.ts
src/services/humanizer.ts
src/services/detector.ts
src/services/capturer.ts
src/services/reporter.ts
src/services/c2pa.ts
src/formats/text.ts
src/formats/raster.ts
src/formats/svg.ts
src/formats/html.ts
src/formats/md.ts
src/formats/docx.ts
src/formats/odt.ts
src/formats/pdf.ts
src/formats/registry.ts
src/models/allowlist.json            # MARKED_MODEL_IDS, may be []
src/rewrite-metric.ts
tests/cert-layer-a.test.ts
tests/cert-c2pa.test.ts
tests/json-stdout.test.ts
tests/residual-exit.test.ts
tests/official-unavailable.test.ts
tests/official-claim-forbidden.test.ts
tests/binary-guard.test.ts
tests/zip-caps.test.ts
tests/origin-blocklist.test.ts
tests/humanize-print-prompt.test.ts
tests/premark-model.test.ts
tests/write-guard.test.ts
```

Python `src/anthropies/` and `pyproject.toml` die only in Task 7.

---

### Task 1: Honesty patch (Family 0)

**Files:**
- Create: `docs/CLAIMS.md`
- Create: `docs/CHANNELS.md`
- Modify: `skills/purge-anthropies/SKILL.md` (frontmatter description + keep Python invocation until Task 7)
- Modify: `commands/purge-anthropies.md`
- Modify: `.claude-plugin/plugin.json` (description only; version stays until package exists)
- Modify: `docs/MANIFESTO.md` — fix or delete the `knowledge/raw/` citation

**Interfaces:**
- Consumes: spec §13 copy rules
- Produces: public copy that does not claim C2PA or official text-kill

- [ ] **Step 1: Write `docs/CLAIMS.md`** with the spec’s forbidden phrases, required honesty stanza, channel verbs, and “does not prove official detector / human-written / absence ≠ uninvolved.”

- [ ] **Step 2: Write `docs/CHANNELS.md`** describing `deterministic | c2pa | official | statistical`, certificate vs best-effort, and that `demo` prints four rows and never a success banner.

- [ ] **Step 3: Replace skill description** with exactly:

```
description: >
  Use when the user asks to purge anthropies, strip Co-Authored-By Claude,
  strip Generated-with banners, inspect owned files for vendor marks,
  or runs /purge-anthropies or /anthropies.
  Does not claim official watermark removal.
```

Keep the Python `python3 -m anthropies` commands. Do not add C2PA back.

- [ ] **Step 4: Rewrite `commands/purge-anthropies.md`** to: “Run purge-anthropies on the named path. Deterministic clean first. Do not rewrite with Claude. Do not claim official-detector failure.”

- [ ] **Step 5: Rewrite plugin `description`** to: “Restore clean title in Outputs you own. Strip git trailers, banners, and (once implemented) hard-bound C2PA metadata. Does not defeat Anthropic’s unpublished text detector.”

- [ ] **Step 6: Fix `docs/MANIFESTO.md`** — if `knowledge/raw/` briefs are not in the repo, delete that sentence. Do not cite missing files.

- [ ] **Step 7: Grep the tree** for banned phrases in skill/plugin/slash:

```bash
rg -n -i "destamp|undetectable|official detector will fail|proves human-written|strip a Claude watermark|clean C2PA from a Claude file" skills commands .claude-plugin
```

Expected: no matches except Anthropic quotations in manifesto/README mark explainer.

- [ ] **Step 8: Three-auditor gate (Docs-heavy).** Dispatch STYLE, QA, DOCS on this markdown-only diff. STYLE may APPROVE quickly (no TS). QA checks no false capability. DOCS is the hard gate.

- [ ] **Step 9: Commit**

```bash
git add docs/CLAIMS.md docs/CHANNELS.md docs/MANIFESTO.md \
  skills/purge-anthropies/SKILL.md commands/purge-anthropies.md \
  .claude-plugin/plugin.json
git commit -m "docs: honesty patch — drop C2PA and official-kill claims"
```

---

### Task 2: Effect scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `eslint.config.js`
- Create: `src/fail.ts`, `src/kind.ts`, `src/report.ts`, `src/config.ts`, `src/cli.ts`
- Create: `tests/official-claim-forbidden.test.ts`
- Modify: `.gitignore` — add `node_modules/`, `fixtures/live/*` (keep `.gitignore`), `graphify-out/`
- Modify: `NOTICE` — add WR MIT block (spec §14)

**Interfaces:**
- Consumes: none
- Produces:
  - `export class BinaryInput extends Schema.TaggedError<BinaryInput>()("BinaryInput", { path: Schema.String, reason: Schema.String }) {}`
  - same pattern: `OriginBlocked`, `MissingApiKey`, `PreMarkModel`, `DecodeError`, `WriteGuard`, `InputTooLarge`
  - `export const Kind = Schema.Literal("text","raster","svg","html","md","docx","odt","pdf","binary")`
  - `export type Kind = typeof Kind.Type`
  - `export class Report extends Schema.Class<Report>("Report")({ ... }) {}` per spec §8
  - `export const honestyStanza = (input: { official: string; c2pa: string; deterministic: string; statistical: string }) => string[]`
  - `bin`: `anthropies` → `dist/cli.ts` compiled to `dist/cli.js`

- [ ] **Step 1: Write the failing claim-forbidden test**

```ts
import { describe, it, expect } from "@effect/vitest"
import { honestyStanza } from "../src/report.js"

describe("official_claim_forbidden", () => {
  it("honesty stanza contains the two does-not-prove lines", () => {
    const lines = honestyStanza({
      official: "unavailable (ANTHROPIC_DETECT_URL unset)",
      c2pa: "not-applicable",
      deterministic: "none",
      statistical: "not-run"
    })
    expect(lines.join("\n")).toMatch(/does not prove the official Claude text detector will fail/)
    expect(lines.join("\n")).toMatch(/does not prove the text is human-written/)
    expect(lines.join("\n")).not.toMatch(/watermark removed/i)
    expect(lines.join("\n")).not.toMatch(/undetectable/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/official-claim-forbidden.test.ts
```

Expected: FAIL (package or module missing).

- [ ] **Step 3: Scaffold package**

`package.json` (exact fields):

```json
{
  "name": "anthropies",
  "version": "0.2.0",
  "description": "Restore clean title in Outputs the user already owns",
  "type": "module",
  "bin": { "anthropies": "./dist/cli.js" },
  "engines": { "node": ">=22" },
  "license": "Apache-2.0",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:live": "LIVE=1 vitest run tests/live-capture.test.ts",
    "demo": "node dist/cli.js demo"
  }
}
```

Dependencies: `effect`, `@effect/platform`, `@effect/platform-node`, `@effect/cli`, `@effect/vitest`, `typescript`, `vitest` as appropriate for Effect 3 latest stable. No Effect 4.

`tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module`/`moduleResolution` `NodeNext`, `verbatimModuleSyntax`, `outDir` `dist`, `rootDir` `src`.

- [ ] **Step 4: Implement `src/fail.ts`, `src/kind.ts`, `src/report.ts`, `src/config.ts`**

`honestyStanza` must emit the spec §8 lines. `Report` has no `suspicious` field. `removed` is nested per channel. `OfficialFinding` is a tagged union with no `score` on `Unavailable`.

`src/config.ts` wraps `ANTHROPIC_API_KEY`, `ANTHROPIC_DETECT_URL`, `ANTHROPIES_REWRITE_*` as `Config`. Unset detect URL is a value, not a throw.

- [ ] **Step 5: Minimal `src/cli.ts`**

```ts
import * as CliCommand from "@effect/cli/Command"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const inspect = CliCommand.make("inspect", /* Args.file path */)
const clean = CliCommand.make("clean")
const humanize = CliCommand.make("humanize")
const capture = CliCommand.make("capture")
const demo = CliCommand.make("demo")

export const cli = CliCommand.make("anthropies").pipe(
  CliCommand.withSubcommands([inspect, clean, humanize, capture, demo])
)

NodeRuntime.runMain(CliCommand.run(cli, { name: "anthropies", version: "0.2.0" }).pipe(
  Effect.provide(NodeContext.layer)
))
```

Handlers may be stubs that fail with a Finding-free message until later tasks. Subcommand names must exist so `--help` lists them.

- [ ] **Step 6: Run tests**

```bash
pnpm test -- tests/official-claim-forbidden.test.ts
```

Expected: PASS.

- [ ] **Step 7: Three-auditor gate.** STYLE is the hard gate (tsconfig, Effect 3, no forbidden imports). QA checks the claim test. DOCS checks `0.2.0` and product sentence.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json eslint.config.js \
  src/fail.ts src/kind.ts src/report.ts src/config.ts src/cli.ts \
  tests/official-claim-forbidden.test.ts NOTICE .gitignore
git commit -m "feat: scaffold Effect 3 CLI at 0.2.0"
```

---

### Task 3: Classify + Layer A + text inspect/clean (Family 1)

**Files:**
- Create: `src/layer-a.ts`, `src/formats/text.ts`, `src/formats/registry.ts`
- Create: `src/services/inspector.ts`, `src/services/cleaner.ts`, `src/services/detector.ts`, `src/services/reporter.ts`
- Create: `tests/cert-layer-a.test.ts`, `tests/binary-guard.test.ts`, `tests/json-stdout.test.ts`, `tests/write-guard.test.ts`
- Create: fixtures under `fixtures/layer-a/`
- Modify: `src/cli.ts` — wire inspect/clean for text
- Modify: `src/kind.ts` — implement `classify(bytes: Uint8Array, suffix: string | undefined): Kind`

**Interfaces:**
- Consumes: `Kind`, `Report`, Fails from Task 2
- Produces:
  - `export const classify = (bytes: Uint8Array, suffix?: string): Kind`
  - `export const applyLayerA = (text: string): { text: string; removed: { unicode: number; trailer: number; banner: number } }`
  - `Detector.deterministic(text): Finding[]`
  - `Inspector.inspect(path: string, options: { forceText: boolean; json: boolean }): Effect<Report, BinaryInput | DecodeError | InputTooLarge, FileSystem>`
  - `Cleaner.clean(...): Effect<{ report: Report; bytes: Uint8Array }, ..., FileSystem>`
  - Magic: `PK` → not text; `%PDF` → pdf; `\x89PNG` → raster; `\xff\xd8\xff` → raster. Suffix `.md`/`.txt` only if magic is text.

- [ ] **Step 1: Write failing `cert_layer_a_roundtrip`**

```ts
import { describe, it, expect } from "@effect/vitest"
import { applyLayerA } from "../src/layer-a.js"

describe("cert_layer_a_roundtrip", () => {
  it("strips Claude trailer and keeps human trailer", () => {
    const src = "Fix the bug\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nCo-authored-by: Jane Doe <jane@example.com>\n"
    const { text, removed } = applyLayerA(src)
    expect(text).not.toMatch(/noreply@anthropic\.com/)
    expect(text).toMatch(/jane@example\.com/)
    expect(removed.trailer).toBeGreaterThan(0)
  })
  it("strips Generated-with banner", () => {
    const { text } = applyLayerA("# helper\n# Generated with Claude Code\nprint(1)\n")
    expect(text).not.toMatch(/Generated with Claude Code/)
    expect(text).toMatch(/print\(1\)/)
  })
  it("strips ZWSP and keeps emoji ZWJ family", () => {
    const family = "family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}"
    expect(applyLayerA("hello\u200Bworld").text).toBe("helloworld")
    expect(applyLayerA(family).text).toBe(family)
  })
})
```

- [ ] **Step 2: Run to verify fail.** Expected: `applyLayerA` not defined.

- [ ] **Step 3: Implement `applyLayerA` and `classify`.** Port the current Python regexes (agent trailers including Cursor/Copilot/Codex, Generated-with banners, ZWSP/bidi/tags). Do not paste WR Python. Keep emoji ZWJ. Leading BOM U+FEFF stays.

- [ ] **Step 4: Write failing binary-guard and write-guard tests** that call `Inspector`/`Cleaner` with PNG bytes (`\x89PNG\r\n\x1a\n...`) and a DOCX `PK` prefix. Expect `BinaryInput`, no dest file, no `.bak`. `--force-text` proceeds.

- [ ] **Step 5: Implement services + CLI inspect/clean** for `Kind.text` only. Other kinds may return `DecodeError` “unsupported in this family” or classify as `binary` until later tasks. `--json` writes **only** `Schema.encode` JSON to stdout; honesty human line to stderr.

- [ ] **Step 6: Write `json_stdout_purity` test** as a subprocess: `node dist/cli.js inspect --json fixtures/layer-a/trailer-claude.txt`. `JSON.parse(stdout)` succeeds; stdout has no honesty prose; exit 1 (deterministic present); stderr may contain honesty.

- [ ] **Step 7: Run `pnpm test`.** Expected: PASS. `HttpClient` must not appear in this task’s `R`.

- [ ] **Step 8: Three-auditor gate.** All three. QA owns cert-layer-a, binary-guard, json-stdout, write-guard.

- [ ] **Step 9: Commit**

```bash
git add src/layer-a.ts src/kind.ts src/formats src/services \
  tests/cert-layer-a.test.ts tests/binary-guard.test.ts \
  tests/json-stdout.test.ts tests/write-guard.test.ts fixtures/layer-a src/cli.ts
git commit -m "feat: classify, Layer A, and text inspect/clean"
```

---

### Task 4: Humanize print-prompt + origin blocklist

**Files:**
- Create: `src/services/humanizer.ts`, `src/rewrite-metric.ts`
- Create: `tests/origin-blocklist.test.ts`, `tests/humanize-print-prompt.test.ts`
- Modify: `src/cli.ts` — wire `humanize`

**Interfaces:**
- Consumes: `applyLayerA`, `Report`
- Produces:
  - `export const originBlocked = (backend: string, model: string): boolean` — true if either lowercased string contains `claude|anthropic|gemini|google-gemini|synthid`
  - `Humanizer.humanize(text, { kind: "prose" | "code" }): Effect<{ text: string; note: string; metric: RewriteMetric }, OriginBlocked, FileSystem>`
  - Default backend `print-prompt` returns the prompt, not a rewrite. `rewrite_metric.status = "not-run"`
  - `RewriteMetric` shape from spec §7

- [ ] **Step 1: Write failing origin-blocklist and print-prompt tests**

```ts
import { describe, it, expect } from "@effect/vitest"
import { originBlocked } from "../src/services/humanizer.js"

describe("origin_blocklist", () => {
  it("blocks claude, anthropic, gemini, synthid", () => {
    expect(originBlocked("claude", "llama")).toBe(true)
    expect(originBlocked("ollama", "gemini-2.5")).toBe(true)
    expect(originBlocked("openai-compatible", "synthid-demo")).toBe(true)
    expect(originBlocked("ollama", "llama3.2")).toBe(false)
    expect(originBlocked("print-prompt", "")).toBe(false)
  })
})
```

```ts
describe("humanize_print_prompt_default", () => {
  it("returns the prompt and does not claim removal", async () => {
    // run Humanizer.Default with Config backend print-prompt
    // assert output contains original sentence
    // assert metric.status === "not-run"
    // assert report.honesty matches /best-effort/
  })
})
```

- [ ] **Step 2: Run to verify fail.**

- [ ] **Step 3: Implement `originBlocked` and print-prompt `Humanizer`.** Port current `PROSE_PROMPT` / `CODE_PROMPT` from `src/anthropies/humanize.py` (rewrite H-grams; keep facts/URLs/fences). Ollama / openai-compatible may exist as stubs that hit `HttpClient` but are not required to pass default tests. If implemented, loopback-only unless `ANTHROPIES_REWRITE_ALLOW_REMOTE`.

- [ ] **Step 4: Wire CLI `humanize`.** `OriginBlocked` → exit 2, input bytes unchanged.

- [ ] **Step 5: `pnpm test`.** Expected: PASS.

- [ ] **Step 6: Three-auditor gate.**

- [ ] **Step 7: Commit**

```bash
git add src/services/humanizer.ts src/rewrite-metric.ts \
  tests/origin-blocklist.test.ts tests/humanize-print-prompt.test.ts src/cli.ts
git commit -m "feat: humanize print-prompt and origin blocklist"
```

---

### Task 5: Raster C2PA (Family 2)

**Files:**
- Create: `src/formats/raster.ts`, `src/services/c2pa.ts`
- Create: `tests/cert-c2pa.test.ts`, `tests/residual-exit.test.ts`
- Create: `fixtures/c2pa/fixture-c2pa-present.png`, `.jpg`, plus SVG in Task 6; for this task PNG and JPEG
- Modify: `src/formats/registry.ts`, `src/kind.ts` magic for PNG/JPEG/WebP/AVIF/HEIC
- Modify: `NOTICE` if WR fixture bytes are copied — also `fixtures/THIRD_PARTY.md`

**Interfaces:**
- Consumes: `C2pa` service, `Cleaner`, `Inspector`
- Produces:
  - `C2pa.inspect(bytes, kind): { present: boolean; findings: Finding[] }`
  - `C2pa.strip(bytes, kind): { bytes: Uint8Array; removed: boolean }`
  - PNG: drop `caBX` / chunks whose payload starts with `c2pa` / `jumb`; drop `iTXt`/`tEXt`/`zTXt` with XMP/C2PA keys; keep `IHDR`/`IDAT`/`IEND`
  - JPEG: drop APP11 and APP1 XMP
  - Residual after failed strip → clean exit **1**. Successful strip → inspect `c2pa` absent, exit 0
  - Soft-binding sentence always on image reports

- [ ] **Step 1: Build synthetic fixtures** (minimal valid PNG/JPEG with a planted `tEXt`/`APP11` containing the ascii `c2pa`). Do not require a real Anthropic signature. Name them `fixture-c2pa-present.png` / `.jpg`.

- [ ] **Step 2: Write failing `cert_c2pa_png_jpeg_svg`** (PNG/JPEG rows only this task):

```ts
it("inspect sees planted c2pa and clean drops it", async () => {
  // Inspector on fixture-c2pa-present.png → findings some channel==="c2pa" status==="present"
  // Cleaner → bytes
  // Inspector on cleaned → no c2pa present
  // cleaned still starts with \x89PNG
})
```

- [ ] **Step 3: Run to verify fail.**

- [ ] **Step 4: Implement raster parse/strip in `src/formats/raster.ts` + `C2pa`.** Stdlib/byte parsing. Optional `c2patool` via `ProcCommand` is a double-check: if missing, not a fail; if present and prints `No claim found` / `No JUMBF data found`, `has_manifest === false` (`cert_c2patool_false_positive`).

- [ ] **Step 5: `residual_exit_not_suppressed`** — if clean leaves the planted chunk, exit 1 in human and `--json` modes.

- [ ] **Step 6: `pnpm test`.** Expected: PASS. Still no `HttpClient` in default tests.

- [ ] **Step 7: Three-auditor gate.** Restore skill C2PA trigger **only after this test is green**, and only the narrow line from spec §13: “clean hard-bound C2PA metadata from owned png/jpg/svg (and other supported files).”

- [ ] **Step 8: Commit**

```bash
git add src/formats/raster.ts src/services/c2pa.ts tests/cert-c2pa.test.ts \
  tests/residual-exit.test.ts fixtures/c2pa fixtures/THIRD_PARTY.md \
  skills/purge-anthropies/SKILL.md
git commit -m "feat: strip hard-bound C2PA from PNG and JPEG"
```

---

### Task 6: Markup + office + PDF (Families 3–5)

**Files:**
- Create: `src/formats/svg.ts`, `src/formats/html.ts`, `src/formats/md.ts`, `src/formats/docx.ts`, `src/formats/odt.ts`, `src/formats/pdf.ts`
- Create: `tests/zip-caps.test.ts`
- Create: `fixtures/c2pa/fixture-c2pa-present.svg`
- Modify: registry, `cert-c2pa.test.ts` (add SVG row), Inspector/Cleaner

**Interfaces:**
- Consumes: `applyLayerA`, `C2pa`, zip budget 128 MiB uncompressed
- Produces:
  - SVG: strip `<metadata>`, XMP; Layer A on text nodes; inspect planted metadata
  - HTML: strip generator / `data-ai*` / JSON-LD AI keys; Layer A on body
  - MD: drop YAML frontmatter AI keys (`ai_generated`, `generator: claude`, etc.); Layer A on body
  - DOCX/ODT: zip rewrite; scrub `docProps` / `customXml` / `meta.xml`; Layer A on `w:t` / text nodes; prune dangling rels
  - PDF: `exiftool` then `qpdf --linearize` via `ProcCommand.make`. Missing tool → `degraded: true`, exit 0, warning in findings. Never `shell: true`
  - `DecodeError` if zip expansion exceeds 128 MiB (per member or sum)

- [ ] **Step 1: Write failing SVG row in `cert-c2pa.test.ts` and `zip_bomb_and_caps`** with a patched 16-byte cap in Test layer (do not commit a real bomb).

- [ ] **Step 2: Run to verify fail.**

- [ ] **Step 3: Implement svg/html/md.** Layer A after meta strip.

- [ ] **Step 4: Implement docx/odt** in-memory (`fflate` or `jszip` on `Uint8Array`). No `node:fs`.

- [ ] **Step 5: Implement pdf** as Finding-on-missing-tool. Test with a `ProcCommand` test double, not a real qpdf dependency in default CI.

- [ ] **Step 6: `pnpm test`.** Expected: PASS.

- [ ] **Step 7: Three-auditor gate** after **each** of svg/html/md, office, and pdf if they land as separate commits. If one commit, one trio is enough only if all three families are in that commit — prefer three commits, three gates.

- [ ] **Step 8: Commits** (one per family)

```bash
git commit -m "feat: strip SVG HTML Markdown metadata and run Layer A"
git commit -m "feat: scrub DOCX and ODT props with zip budget"
git commit -m "feat: PDF clean via exiftool and qpdf with degraded path"
```

---

### Task 7: Capture, demo, delete Python (Family 6)

**Files:**
- Create: `src/services/capturer.ts`, `src/models/allowlist.json` (`[]` is valid)
- Create: `tests/premark-model.test.ts`, `tests/official-unavailable.test.ts`, `fixtures/live/.gitignore`
- Modify: `src/cli.ts` — implement `capture` and `demo`
- Modify: `skills/purge-anthropies/SKILL.md` — retarget every `python3 -m anthropies` to `npx anthropies` / `node dist/cli.js`
- Modify: `README.md` — honesty box first (spec §14 order); install via `pnpm install -g` / `npx`; command matrix
- Delete: `src/anthropies/`, `pyproject.toml`, Python tests that import `anthropies`
- Keep: `docs/MANIFESTO.md`, `docs/legal/*`, `assets/`

**Interfaces:**
- Consumes: `Inspector`, `Cleaner`, `Humanizer`, `Report`
- Produces:
  - `Capturer.capture({ model, prompt }): Effect<{ path: string; sidecar: Sidecar }, MissingApiKey | PreMarkModel, FileSystem | HttpClient>`
  - Allowlist: unknown model → `PreMarkModel`. Empty list → every model is unknown.
  - `demo` runs the script contract (spec §11.5). Exit 0 if certificates that *could* run did; skip C2PA/rewrite tracks rather than fail.
  - Sidecar: `capturedFrom`, model, created, token count. No API key. No field named `watermarked` or `sampled`.

- [ ] **Step 1: Write failing `premark_unknown_model` and `official_unavailable_default`**

```ts
it("refuses models not on the allowlist", async () => {
  // Capturer with model "claude-opus-5" and allowlist []
  // expect PreMarkModel
})

it("official adapter is Unavailable when detect URL unset", async () => {
  const report = /* inspect any fixture */
  const official = report.findings.filter((f) => f.channel === "official")
  expect(official.every((f) => f.status === "unavailable")).toBe(true)
  expect(JSON.stringify(report)).not.toMatch(/"score"/)
})
```

- [ ] **Step 2: Run to verify fail.**

- [ ] **Step 3: Implement allowlist + Capturer + demo script.** `test:live` is a separate file, skipped unless `LIVE=1` and key present. Live test asserts HTTP 200 + sidecar + official unavailable. **No** assert that text is marked or unmarked.

- [ ] **Step 4: Rewrite README** per spec §14. Honesty box. `npx anthropies inspect|clean|humanize|capture|demo`. Four-channel matrix. Keep How the Mark Works, manifesto short, legal last.

- [ ] **Step 5: Retarget skill to `npx anthropies`.** Grep: no `python3 -m anthropies` left in skill/commands/README.

- [ ] **Step 6: Delete Python package** (`src/anthropies`, `pyproject.toml`, `tests/test_clean.py`, `tests/test_humanize.py`). `pnpm test` still green.

- [ ] **Step 7: `pnpm test && pnpm build`.** Expected: PASS. `node dist/cli.js --version` prints `0.2.0`.

- [ ] **Step 8: Three-auditor gate on the full Wave-1 diff** (not just this task). STYLE, QA, DOCS. Fix BLOCKERs.

- [ ] **Step 9: `graphify update .`** in the repo (AST-only is fine).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: capture, demo, and replace the Python CLI"
```

---

## Spec coverage (self-review)

| Spec section | Task |
|---|---|
| §1–3 goal, locks, out of scope | Global constraints + every auditor prompt |
| §5 Effect shape, Config, tsconfig, forbidden imports | Task 2 |
| §6 Kind + handlers | Tasks 3, 5, 6 |
| §7–8 channels + Report + honesty | Tasks 2–3 |
| §9–10 Fail vs Finding + exit matrix | Tasks 3, 5 |
| §11 commands | Tasks 3, 4, 7 |
| §12 caps / ProcCommand | Tasks 3, 6 |
| §13–14 copy + docs | Task 1, 5 (narrow C2PA trigger), 7 (README) |
| §15–16 fixtures + named tests | Tasks 3–7 |
| §16.3 auditor families | Protocol + end of each task |
| Capture rename, 0.2.0, empty allowlist | Tasks 2, 7 |
| Delete Python | Task 7 only, after retarget |

No TBD. Types use `Kind`, `Report`, `OfficialFinding`, `RewriteMetric`, `applyLayerA`, `classify` consistently.

---

## Execution

A 30-minute foreground reminder (`scheduler id 01a00dbb5f12`) restates the 1+3 protocol.

**Plan complete and saved to `docs/superpowers/plans/2026-08-16-anthropies-wave1.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh grok implementer per task, then the three auditor personas, and only then start the next task.

**2. Inline Execution** — I implement in this session using executing-plans, still stopping for the three-auditor gate after every task.

Which approach?
