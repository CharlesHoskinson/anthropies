# Sprint 1 Deterministic Format Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap existing Anthropies format handlers as CapabilityPack values and advertise them on GET /capabilities, without new algorithms or mixed report scores.

**Architecture:** Sprint 0 kernel (`inspectArtifact` / `transformArtifact` / `builtinRegistry`) stays. New packs live under `src/packs/` and import `src/formats/*`. Inspector/Cleaner keep public signatures and keep calling named format functions. HTTP `serviceVersion` stays `"0.3.0"`. html/md/docx/odt are inspect+remove on markClass `provenance-metadata`. svg-strip, raster-strip, and pdf-tools are remove-only so they do not conflict with `c2paPack` or `pdfPack` inspect owners.

**Tech Stack:** TypeScript, Effect 3 Schema.Class, Vitest, existing `inspectHtmlText` / `inspectDocx` / `PdfTools`.

## Global Constraints

- No new watermark algorithms. Wrap existing functions.
- Do not UTF-8-decode `docx`/`odt` zips as Layer A pack input.
- Four report channels stay unmixed. No `score` / `watermarkScore`.
- HTTP `serviceVersion` stays `"0.3.0"`.
- Do not edit `src/report.ts` honesty stanza strings.
- Do not replace `c2paPack` or `pdfPack`.
- Grok implements from write-first five-part specs. Codex Sol audits OpenSpec vs diff. Architect does not hand-patch kernel code.
- Endstop r4 is the live contract. Do not create a fifth contract for Phase A.

## File map

- Create: `src/packs/html.ts`, `src/packs/md.ts`, `src/packs/svg-strip.ts`, `src/packs/docx.ts`, `src/packs/odt.ts`, `src/packs/raster-strip.ts`, `src/packs/pdf-tools.ts`
- Create: `tests/packs-html-md.test.ts`, `tests/packs-svg-strip.test.ts`, `tests/packs-office.test.ts`, `tests/packs-raster-pdf.test.ts`
- Modify: `src/core/builtin-registry.ts`, `src/http/server.ts`, `tests/http-capabilities.test.ts`
- Do not modify: `src/report.ts`, `src/packs/c2pa.ts`, `src/packs/pdf.ts`, `src/packs/layer-a.ts` except via registry import list

---

### Task 1: HTML and Markdown metadata packs

**Files:**
- Create: `src/packs/html.ts`, `src/packs/md.ts`, `tests/packs-html-md.test.ts`
- Modify: `src/core/builtin-registry.ts`

**Interfaces:**
- Consumes: `inspectHtmlText`, `cleanHtmlText`, `inspectMdText`, `cleanMdText`, `CapabilityPack`, `makeArtifact`
- Produces: `htmlPack` id `anthropies.html`, `mdPack` id `anthropies.md`

- [ ] **Step 1: Write the failing test**

Create `tests/packs-html-md.test.ts`:

```ts
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { htmlPack } from "../src/packs/html.js"
import { mdPack } from "../src/packs/md.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

describe("packs_html_md", () => {
  it("html source imports inspectHtmlText", () => {
    const src = readFileSync(new URL("../src/packs/html.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/html\.js"/)
    expect(src).toMatch(/inspectHtmlText/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("md source imports inspectMdText", () => {
    const src = readFileSync(new URL("../src/packs/md.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/md\.js"/)
    expect(src).toMatch(/inspectMdText/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("html generator meta is present", async () => {
    const html = `<html><head><meta name="generator" content="Claude"></head><body>hello</body></html>`
    const findings = await Effect.runPromise(
      htmlPack.inspect(makeArtifact(new TextEncoder().encode(html), "html"), inspectCtx)
    )
    expect(htmlPack.manifest.id).toBe("anthropies.html")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )
  })
})
```

- [ ] **Step 2: Run** `pnpm test tests/packs-html-md.test.ts` — expect FAIL (files missing).
- [ ] **Step 3: Implement wrappers**

`src/packs/html.ts`:

```ts
import { Effect, Schema } from "effect"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import {
  Availability,
  Evidence,
  KernelFinding,
  makeArtifact,
  Removal,
  TransformResult,
  type Artifact
} from "../core/domain.js"
import { cleanHtmlText, inspectHtmlText } from "../formats/html.js"

const PACK_ID = "anthropies.html"
const PACK_VERSION = "0.4.0"
const contractEvidence = (): Evidence => new Evidence({ kind: "contract" })

export const htmlPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "HTML metadata",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["html"],
    markClasses: ["provenance-metadata"],
    operations: ["inspect", "remove"],
    channel: "c2pa",
    priority: 80,
    ordering: {},
    runtime: "native-ts",
    network: "none",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "core"
  }),
  probe: (_context: RunContext) =>
    Effect.succeed(new Availability({ status: "available", reason: "ready" })),
  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      const scanned = inspectHtmlText(new TextDecoder("utf-8").decode(artifact.bytes))
      return [
        new KernelFinding({
          channel: "c2pa",
          markClass: "provenance-metadata",
          status: scanned.present ? "present" : "absent",
          evidence: contractEvidence(),
          packId: PACK_ID,
          packImplementationVersion: PACK_VERSION
        })
      ]
    }),
  transform: (artifact: Artifact, _context: RunContext) =>
    Effect.sync(() => {
      const cleaned = cleanHtmlText(new TextDecoder("utf-8").decode(artifact.bytes))
      const next = makeArtifact(cleaned.bytes, "html")
      return new TransformResult({
        artifact: next,
        removals:
          cleaned.labels.length > 0
            ? [
                new Removal({
                  channel: "c2pa",
                  markClass: "provenance-metadata",
                  changedScope: "metadata",
                  evidence: contractEvidence(),
                  labels: [...cleaned.labels]
                })
              ]
            : [],
        evidence: contractEvidence(),
        residualFindings: [],
        warnings: [],
        remediation: next.digest === artifact.digest ? "unchanged" : "changed"
      })
    })
}
```

`src/packs/md.ts` is the same shape with `PACK_ID = "anthropies.md"`, kinds `["md"]`, imports `inspectMdText` / `cleanMdText` from `../formats/md.js`, and `makeArtifact(cleaned.bytes, "md")`.

Register both in `src/core/builtin-registry.ts`:

```ts
import { c2paPack } from "../packs/c2pa.js"
import { htmlPack } from "../packs/html.js"
import { layerAPack } from "../packs/layer-a.js"
import { mdPack } from "../packs/md.js"
import { pdfPack } from "../packs/pdf.js"
import { createRegistry, type PackRegistry } from "./registry.js"

export const builtinRegistry = (): PackRegistry => {
  const registry = createRegistry()
  registry.register(layerAPack)
  registry.register(c2paPack)
  registry.register(pdfPack)
  registry.register(htmlPack)
  registry.register(mdPack)
  return registry
}
```

- [ ] **Step 4: Re-run** `pnpm test tests/packs-html-md.test.ts` — expect PASS. `pnpm exec tsc -p tsconfig.json --noEmit` exit 0.
- [ ] **Step 5: Commit listed paths only.** Do not `git add -A`.

```bash
git add src/packs/html.ts src/packs/md.ts tests/packs-html-md.test.ts src/core/builtin-registry.ts
git commit -m "Add html and md metadata capability packs"
```

### Task 2: SVG strip remove-only pack

**Files:**
- Create: `src/packs/svg-strip.ts`, `tests/packs-svg-strip.test.ts`
- Modify: `src/core/builtin-registry.ts`

**Interfaces:**
- Consumes: `cleanSvgText`
- Produces: `svgStripPack` id `anthropies.svg-strip`, operations `["remove"]`

- [ ] **Step 1: Write the failing test**

Create `tests/packs-svg-strip.test.ts`:

```ts
import { describe, expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { svgStripPack } from "../src/packs/svg-strip.js"

describe("packs_svg_strip", () => {
  it("svg strip source imports cleanSvgText", () => {
    const src = readFileSync(new URL("../src/packs/svg-strip.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/svg\.js"/)
    expect(src).toMatch(/cleanSvgText/)
    expect(src).not.toMatch(/inspectSvgText/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("svg strip operations are remove only", () => {
    expect(svgStripPack.manifest.id).toBe("anthropies.svg-strip")
    expect(svgStripPack.manifest.operations).toEqual(["remove"])
    expect(svgStripPack.manifest.artifactKinds).toEqual(["svg"])
  })
})
```
- [ ] **Step 2: Run** `pnpm test tests/packs-svg-strip.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `src/packs/svg-strip.ts` with `operations: ["remove"]`, no `inspect` beyond a stub that returns `[]` if the type requires it. CapabilityPack.inspect is required on the interface, so inspect SHALL return `[]` and SHALL NOT call `inspectSvgText` (c2paPack owns svg inspect). Transform SHALL call `cleanSvgText`.
- [ ] **Step 4: Run tests plus tsc.**
- [ ] **Step 5: Commit listed paths.**

### Task 3: DOCX and ODT packs

**Files:**
- Create: `src/packs/docx.ts`, `src/packs/odt.ts`, `tests/packs-office.test.ts`

**Interfaces:**
- Consumes: `inspectDocx`, `cleanDocx`, `inspectOdt`, `cleanOdt`, `zipMembers` for fixtures
- Produces: `docxPack` id `anthropies.docx`, `odtPack` id `anthropies.odt`

- [ ] **Step 1: Write tests**

Create `tests/packs-office.test.ts` using the `sampleDocx` / `sampleOdt` builders from `tests/cert-office.test.ts`:

```ts
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { zipMembers } from "../src/formats/zip.js"
import { docxPack } from "../src/packs/docx.js"
import { odtPack } from "../src/packs/odt.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}
const enc = (s: string): Uint8Array => new TextEncoder().encode(s)
const sampleDocx = (): Uint8Array =>
  zipMembers([
    { name: "[Content_Types].xml", data: enc(`<Types></Types>`) },
    { name: "word/document.xml", data: enc(`<w:document><w:t>hello</w:t></w:document>`) },
    { name: "docProps/core.xml", data: enc(`<cp:coreProperties><dc:creator>Claude</dc:creator></cp:coreProperties>`) }
  ])

describe("packs_office", () => {
  it("docx source imports cleanDocx", () => {
    const src = readFileSync(new URL("../src/packs/docx.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/docx\.js"/)
    expect(src).toMatch(/cleanDocx/)
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
  })

  it("odt source imports inspectOdt", () => {
    const src = readFileSync(new URL("../src/packs/odt.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/odt\.js"/)
    expect(src).toMatch(/inspectOdt/)
  })

  it("docx creator meta is present", async () => {
    const findings = await Effect.runPromise(
      docxPack.inspect(makeArtifact(sampleDocx(), "docx", { name: "owned.docx" }), inspectCtx)
    )
    expect(docxPack.manifest.id).toBe("anthropies.docx")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL.**
- [ ] **Step 3: Implement packs.** `artifactKinds` are `docx` / `odt` only. Path argument is `artifact.name ?? "owned.docx"` / `"owned.odt"`. IF `inspectDocx` returns `{ ok: false }`, THEN inspect SHALL fail with `CapabilityFailure` code `unavailable` reason `malformed-output`.
- [ ] **Step 4: Run** `pnpm test tests/packs-office.test.ts tests/cert-office.test.ts` — expect PASS.
- [ ] **Step 5: Commit listed paths.**

### Task 4: Raster strip and PDF tools packs

**Files:**
- Create: `src/packs/raster-strip.ts`, `src/packs/pdf-tools.ts`, `tests/packs-raster-pdf.test.ts`
- Do not replace `c2paPack` or `pdfPack`.

**Interfaces:**
- Consumes: `stripRasterBytes`, `PdfTools`
- Produces: `rasterStripPack` id `anthropies.raster-strip` operations `["remove"]`, `pdfToolsPack` id `anthropies.pdf-tools` operations `["remove"]`

- [ ] **Step 1: Write tests** for `stripRasterBytes` import, `operations` equal `["remove"]`, and `pdfToolsPack.probe` returning `degraded` / `tool-missing` when tools are absent. Do not assert a clean certificate.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement.** `pdfToolsPack.probe` yields `PdfTools` live presence the same way `PdfTools.inspect` does: missing qpdf or exiftool means status `degraded`, reason `tool-missing`. Transform SHALL call `PdfTools.strip` with `artifact.name ?? "owned.pdf"` and SHALL copy `degraded` into `warnings` (`missing:qpdf` / `missing:exiftool`). Missing tools SHALL NOT emit a provenance-metadata finding with status `absent`.
- [ ] **Step 4: Run** `pnpm test tests/packs-raster-pdf.test.ts tests/cert-pdf.test.ts tests/cert-c2pa.test.ts`.
- [ ] **Step 5: Commit listed paths.**

### Task 5: Advertise packs on GET /capabilities

**Files:**
- Modify: `src/core/builtin-registry.ts`, `src/http/server.ts`, `tests/http-capabilities.test.ts`

- [ ] **Step 1: Extend** `tests/http-capabilities.test.ts` so `packs[].id` includes `anthropies.html`, `anthropies.md`, `anthropies.svg-strip`, `anthropies.docx`, `anthropies.odt`, `anthropies.raster-strip`, `anthropies.pdf-tools` plus the three Sprint 0 ids. Keep `GET /health reports 0.3.0`.
- [ ] **Step 2: Run** `pnpm test tests/http-capabilities.test.ts` — expect FAIL.
- [ ] **Step 3: Make HTTP use the registry.** Replace `builtinPacks()` in `src/http/server.ts` with `builtinRegistry().list()`. Register every new pack in `builtinRegistry()`. Keep Inspector source names `inspectDocx`, `inspectOdt`, `inspectHtmlText`, `inspectMdText`.
- [ ] **Step 4: Run** `pnpm test tests/http-capabilities.test.ts tests/http-server.test.ts tests/pipeline-compat.test.ts`. Health stays `{ ok: true, version: "0.3.0" }`. Full `pnpm test` plus `pnpm exec tsc -p tsconfig.json --noEmit`.
- [ ] **Step 5: Commit listed paths.**

### Task 6: Phase B codecs (blocked until Phase A OpenSpec archive)

WebP, AVIF, HEIC, BMP, GIF, TIFF, XLSX, PPTX, EPUB, structural PDF. Separate OpenSpec change. Do not start until Tasks 1–5 are archived and Sol+Claude are not BLOCKED.

## Spec coverage

- ROADMAP Sprint 1 sequence item 1 (shared primitives) — already on main as `src/kind.ts`, `src/formats/zip.ts`, `src/formats/registry.ts`. No new extract task.
- Sequence item 2 wrap html/md/svg/docx/odt/pdf/raster — Tasks 1–5
- Sequence items 3–6 — Task 6 later OpenSpec
- No zip UTF-8 — Task 3
- `/capabilities` advertising — Task 5
- Owner-tuple conflict avoidance — Tasks 2 and 4
- Inspector names stay — Task 5

## Execution

Foreman write-first Grok, one task per five-part spec. Independent `pnpm test` plus `tsc`. OpenSpec-vs-code Sol QA/code/docs plus Claude. BLOCKED goes back to Grok. Architect does not hand-patch kernel code. Do not `git add -A`. Do not commit `knowledge/raw` or `.grok`.
