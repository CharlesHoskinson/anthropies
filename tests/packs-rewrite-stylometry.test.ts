import { HttpClient } from "@effect/platform"
import { NodeContext, NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Either, Layer } from "effect"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { builtinRegistry } from "../src/core/builtin-registry.js"
import { HttpApp } from "../src/http/server.js"
import {
  rejectsOfficialRemovalClaim,
  rewriteStylometryPack,
  selectRewriteCandidate
} from "../src/packs/rewrite-stylometry.js"
import { honestyStanza } from "../src/report.js"
import { observeRewrite, unicodeWords } from "../src/rewrite-metric.js"
import {
  CODE_PROMPT,
  Humanizer,
  PROSE_PROMPT,
  originBlocked,
  reportFromHumanize
} from "../src/services/humanizer.js"

const longProse = (stem: string, n: number): string =>
  Array.from({ length: n }, (_, i) => `${stem}${["a", "b", "c", "d"][i % 4] ?? "a"}`).join(" ")

const layers = Effect.provide(Layer.mergeAll(Humanizer.Default, NodeContext.layer))

const TestLive = HttpApp.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map())))
)

const withEnv = (env: ReadonlyArray<readonly [string, string]>) =>
  Effect.withConfigProvider(ConfigProvider.fromMap(new Map(env)))

describe("packs_rewrite_stylometry", () => {
  it("rewrite pack id is stable", () => {
    expect(rewriteStylometryPack.manifest.id).toBe("anthropies.rewrite-stylometry")
    expect(rewriteStylometryPack.manifest.operations).toContain("rewrite")
    expect(
      builtinRegistry().list().some((pack) => pack.manifest.id === "anthropies.rewrite-stylometry")
    ).toBe(true)
  })

  it.scoped("unset backend resolves to print-prompt", () =>
    layers(
      Effect.gen(function* () {
        const result = yield* Humanizer.humanize("The compiler rejected the patch.", {
          kind: "prose"
        })
        expect(result.note).toMatch(/print-prompt/)
        expect(result.text.startsWith(PROSE_PROMPT)).toBe(true)
      })
    )
  )

  it.scoped("print-prompt emits prompt text not a rewrite", () =>
    withEnv([["ANTHROPIES_REWRITE_BACKEND", "print-prompt"]])(
      layers(
        Effect.gen(function* () {
          const sentence = "The compiler rejected the patch."
          const result = yield* Humanizer.humanize(sentence, { kind: "prose" })
          expect(result.text.startsWith(PROSE_PROMPT)).toBe(true)
          expect(result.text).toContain(sentence)
          expect(result.text).toMatch(/Rewrite the text below/)
          expect(result.note).not.toMatch(/rewrote via/)
        })
      )
    )
  )

  it.scoped("print-prompt denial is present", () =>
    withEnv([["ANTHROPIES_REWRITE_BACKEND", "print-prompt"]])(
      layers(
        Effect.gen(function* () {
          const result = yield* Humanizer.humanize("The compiler rejected the patch.", {
            kind: "prose"
          })
          expect(result.note).toMatch(/print-prompt/)
          expect(result.note).toMatch(/does not destamp/)
        })
      )
    )
  )

  it.scoped("print-prompt metric is not-run", () =>
    withEnv([["ANTHROPIES_REWRITE_BACKEND", "print-prompt"]])(
      layers(
        Effect.gen(function* () {
          const result = yield* Humanizer.humanize("The compiler rejected the patch.", {
            kind: "prose"
          })
          expect(result.metric.status).toBe("not-run")
          expect(result.metric.surviving_ratio).toBeNull()
        })
      )
    )
  )

  it("claude backend is blocked", () => {
    expect(originBlocked("claude", "llama")).toBe(true)
    expect(originBlocked("anthropic", "llama")).toBe(true)
  })

  it.scoped("gemini model is blocked", () =>
    withEnv([
      ["ANTHROPIES_REWRITE_BACKEND", "ollama"],
      ["ANTHROPIES_REWRITE_MODEL", "gemini-2.5"]
    ])(
      layers(
        Effect.gen(function* () {
          expect(originBlocked("ollama", "gemini-2.5")).toBe(true)
          const result = yield* Humanizer.humanize("The compiler rejected the patch.", {
            kind: "prose"
          }).pipe(Effect.either)
          expect(Either.isLeft(result)).toBe(true)
          if (Either.isLeft(result)) {
            expect(result.left._tag).toBe("OriginBlocked")
          }
        })
      )
    )
  )

  it("unmarked local model is allowed", () => {
    expect(originBlocked("ollama", "llama3.2")).toBe(false)
    expect(originBlocked("print-prompt", "")).toBe(false)
  })

  it("destamp capability stays forbidden", () => {
    expect(rewriteStylometryPack.manifest.operations).not.toContain("destamp")
    const names = [...rewriteStylometryPack.manifest.operations, rewriteStylometryPack.manifest.id]
    expect(names.some((name) => name.includes("destamp"))).toBe(false)
  })

  it("rewrite pack tests reject score", () => {
    const src = readFileSync(new URL("../src/packs/rewrite-stylometry.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/\bscore\b/)
    expect(src).not.toMatch(/watermarkScore/)
  })

  it.scoped("capabilities includes rewrite pack id", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = (yield* res.json) as {
        packs: ReadonlyArray<{ id: string }>
      }
      expect(body.packs.some((pack) => pack.id === "anthropies.rewrite-stylometry")).toBe(true)
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("health stays 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
    }).pipe(Effect.provide(TestLive))
  )

  it("no humanize HTTP route", () => {
    const src = readFileSync(new URL("../src/http/server.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/["'`]\/humanize["'`]/)
    expect(src).toMatch(/No \/humanize/)
  })

  it("package excludes model blobs", () => {
    const root = fileURLToPath(new URL("..", import.meta.url))
    const skip = new Set(["node_modules", "dist", ".git", "fixtures"])
    const modelBlob = /\.(gguf|safetensors|onnx|pt|pth|ckpt|bin)$/i
    const walk = (dir: string): Array<string> => {
      const out: Array<string> = []
      for (const name of readdirSync(dir)) {
        if (skip.has(name)) {
          continue
        }
        const path = join(dir, name)
        const st = statSync(path)
        if (st.isDirectory()) {
          out.push(...walk(path))
        } else if (modelBlob.test(name)) {
          out.push(path)
        }
      }
      return out
    }
    expect(walk(root)).toEqual([])
    expect(rewriteStylometryPack.manifest.provenance).toMatch(/no bundled models/i)
    expect(rewriteStylometryPack.manifest.provenance).toMatch(/operator/i)
  })

  it("two candidates each get observations", () => {
    const source = "alpha beta gamma delta epsilon zeta eta theta"
    const selected = selectRewriteCandidate({
      source,
      domain: "prose",
      candidates: [
        { id: "a", text: "one two three four five six seven eight" },
        { id: "b", text: "alpha beta gamma delta epsilon zeta eta theta" }
      ]
    })
    expect(selected.observations.length).toBeGreaterThanOrEqual(2)
    expect(selected.observations.map((o) => o.id).sort()).toEqual(["a", "b"])
    for (const obs of selected.observations) {
      expect(obs.text.length).toBeGreaterThan(0)
      expect(obs.metric).toBeDefined()
    }
  })

  it("selected text is one candidate", () => {
    const candidates = [
      { id: "a", text: "completely different wording for every clause here" },
      { id: "b", text: "another fully rewritten passage with new boundaries" }
    ]
    const selected = selectRewriteCandidate({
      source: "The compiler rejected the patch after review.",
      domain: "prose",
      candidates
    })
    expect(candidates.map((c) => c.text)).toContain(selected.selectedText)
    expect(candidates.some((c) => c.id === selected.selectedId && c.text === selected.selectedText)).toBe(
      true
    )
  })

  it("detector disagreement does not change lexical winner", () => {
    const source = "alpha beta gamma delta epsilon zeta eta theta iota kappa"
    const lexicalBest = "one two three four five six seven eight nine ten"
    const lexicalWorse = "alpha beta gamma delta epsilon zeta eta theta iota kappa"
    const withDetectors = selectRewriteCandidate({
      source,
      domain: "prose",
      candidates: [
        { id: "a", text: lexicalBest },
        { id: "b", text: lexicalWorse }
      ],
      detectorHints: [
        { id: "a", favorability: 0.99 },
        { id: "b", favorability: 0.01 }
      ]
    })
    const withoutDetectors = selectRewriteCandidate({
      source,
      domain: "prose",
      candidates: [
        { id: "a", text: lexicalBest },
        { id: "b", text: lexicalWorse }
      ]
    })
    expect(withoutDetectors.selectedId).toBe("a")
    expect(withDetectors.selectedId).toBe(withoutDetectors.selectedId)
    expect(withDetectors.selectedText).toBe(lexicalBest)
  })

  it("missing detectors still select", () => {
    const selected = selectRewriteCandidate({
      source: "alpha beta gamma delta epsilon",
      domain: "prose",
      candidates: [
        { id: "near", text: "alpha beta gamma delta epsilon" },
        { id: "far", text: "red blue green yellow purple" }
      ]
    })
    expect(selected.selectedId).toBe("far")
    expect(selected.selectedText).toBe("red blue green yellow purple")
  })

  it("selection is not a clean certificate", () => {
    const selected = selectRewriteCandidate({
      source: "alpha beta gamma delta epsilon",
      domain: "prose",
      candidates: [
        { id: "a", text: "red blue green yellow purple" },
        { id: "b", text: "alpha beta gamma delta epsilon" }
      ]
    })
    expect(selected.isCleanCertificate).toBe(false)
    expect(selected.note).toMatch(/not a clean certificate/i)
    expect(selected.note).not.toMatch(/official.?kill|destamp success|certified absent/i)
  })

  it("not-run when rewrite skipped", () => {
    const obs = observeRewrite({ executed: false, domain: "prose" })
    expect(obs.metric.status).toBe("not-run")
    expect(obs.metric.surviving_ratio).toBeNull()
    expect(obs.stylometry.status).toBe("not-run")
  })

  it("insufficient for short prose", () => {
    const before = "The compiler rejected the patch after review."
    const after = "After review the compiler rejected the patch."
    expect(unicodeWords(before).length).toBeLessThan(200)
    const obs = observeRewrite({
      executed: true,
      before,
      after,
      domain: "prose"
    })
    expect(obs.metric.status).toBe("insufficient")
    expect(obs.metric.surviving_ratio).toBeNull()
    expect(obs.stylometry.status).toBe("insufficient")
  })

  it("insufficient for code domain", () => {
    const before = longProse("tok", 220)
    const after = longProse("rew", 220)
    const obs = observeRewrite({
      executed: true,
      before,
      after,
      domain: "code"
    })
    expect(obs.metric.status).toBe("insufficient")
    expect(obs.metric.surviving_ratio).toBeNull()
    expect(obs.stylometry.status).toBe("insufficient")
  })

  it("computed for long prose rewrite", () => {
    const before = longProse("alpha", 220)
    const after = longProse("bravo", 220)
    expect(unicodeWords(before).length).toBeGreaterThanOrEqual(200)
    const obs = observeRewrite({
      executed: true,
      before,
      after,
      domain: "prose"
    })
    expect(obs.metric.status).toBe("computed")
    expect(obs.metric.ngram).toBe(5)
    expect(obs.metric.tokenizer).toBe("unicode-words")
    expect(obs.metric.surviving_ratio).not.toBeNull()
    expect(obs.stylometry.status).toBe("computed")
  })

  it.scoped("stylometry not-run on print-prompt", () =>
    withEnv([["ANTHROPIES_REWRITE_BACKEND", "print-prompt"]])(
      layers(
        Effect.gen(function* () {
          const result = yield* Humanizer.humanize("The compiler rejected the patch.", {
            kind: "prose"
          })
          expect(result.metric.status).toBe("not-run")
          const obs = observeRewrite({ executed: false, domain: "prose" })
          expect(obs.stylometry.status).toBe("not-run")
        })
      )
    )
  )

  it("stylometry insufficient under 200 tokens", () => {
    const before = "Short prose only."
    const after = "Only short prose."
    expect(unicodeWords(before).length).toBeLessThan(200)
    const obs = observeRewrite({
      executed: true,
      before,
      after,
      domain: "prose"
    })
    expect(obs.stylometry.status).toBe("insufficient")
    expect(obs.metric.surviving_ratio).toBeNull()
  })

  it("stylometry computed only after sufficient prose rewrite", () => {
    const before = longProse("alpha", 220)
    const after = longProse("bravo", 220)
    const skipped = observeRewrite({ executed: false, domain: "prose" })
    expect(skipped.stylometry.status).toBe("not-run")
    const short = observeRewrite({
      executed: true,
      before: "Too short.",
      after: "Still short.",
      domain: "prose"
    })
    expect(short.stylometry.status).toBe("insufficient")
    const obs = observeRewrite({
      executed: true,
      before,
      after,
      domain: "prose"
    })
    expect(obs.stylometry.status).toBe("computed")
    expect(obs.metric.status).toBe("computed")
  })

  it("no CI gate on surviving ratio", () => {
    const before = longProse("alpha", 220)
    const highOverlap = observeRewrite({
      executed: true,
      before,
      after: before,
      domain: "prose"
    })
    const lowOverlap = observeRewrite({
      executed: true,
      before,
      after: longProse("omega", 220),
      domain: "prose"
    })
    expect(highOverlap.metric.status).toBe("computed")
    expect(lowOverlap.metric.status).toBe("computed")
    expect(highOverlap.metric.surviving_ratio).not.toBeNull()
    expect(lowOverlap.metric.surviving_ratio).not.toBeNull()
    // Both ratios are observations only. Neither becomes a pass/fail verb.
    expect(highOverlap.stylometry.status).toBe("computed")
    expect(lowOverlap.stylometry.status).toBe("computed")
    const selected = selectRewriteCandidate({
      source: before,
      domain: "prose",
      candidates: [
        { id: "high", text: before },
        { id: "low", text: longProse("omega", 220) }
      ]
    })
    expect(selected.selectedId).toBeTruthy()
    expect(selected.isCleanCertificate).toBe(false)
    for (const obs of selected.observations) {
      expect(obs.stylometry).toBeDefined()
      expect(["computed", "insufficient", "not-run"]).toContain(obs.stylometry.status)
    }
  })

  it("honesty denies official-detector certificate", () => {
    const lines = honestyStanza({
      official: "unavailable (ANTHROPIC_DETECT_URL unset)",
      c2pa: "not-applicable",
      deterministic: "none",
      statistical: "0.42"
    })
    expect(lines.join("\n")).toMatch(/not an official-detector certificate/)
    const report = reportFromHumanize({
      kind: "text",
      removed: { unicode: 0, trailer: 0, banner: 0 },
      present: false,
      metric: observeRewrite({
        executed: true,
        before: longProse("alpha", 220),
        after: longProse("bravo", 220),
        domain: "prose"
      }).metric
    })
    expect(report.honesty.join("\n")).toMatch(/not an official-detector certificate/)
  })

  it("prose prompt requires H-gram break", () => {
    expect(PROSE_PROMPT).toMatch(/H-gram/i)
    expect(PROSE_PROMPT).toMatch(/clause order/i)
    expect(PROSE_PROMPT).toMatch(/sentence boundar/i)
    expect(PROSE_PROMPT).toMatch(/fact/i)
    expect(PROSE_PROMPT).toMatch(/URL/i)
    expect(PROSE_PROMPT).toMatch(/fence/i)
  })

  it("code prompt keeps APIs stable", () => {
    expect(CODE_PROMPT).toMatch(/public APIs/i)
    expect(CODE_PROMPT).toMatch(/behavior/i)
    expect(CODE_PROMPT).toMatch(/comments/i)
    expect(CODE_PROMPT).toMatch(/docstrings/i)
    expect(CODE_PROMPT).toMatch(/non-load-bearing string literals/i)
  })

  it("report rejects official-kill claim", () => {
    expect(rejectsOfficialRemovalClaim("official-kill complete")).toBe(true)
    expect(rejectsOfficialRemovalClaim("certified destamp success")).toBe(true)
    expect(rejectsOfficialRemovalClaim("destamp success on keyed text")).toBe(true)
    expect(
      rejectsOfficialRemovalClaim("lexical selection only; not a clean certificate or official-removal claim")
    ).toBe(false)
    const selected = selectRewriteCandidate({
      source: "alpha beta gamma delta epsilon",
      domain: "prose",
      candidates: [
        { id: "a", text: "red blue green yellow purple" },
        { id: "b", text: "alpha beta gamma delta epsilon" }
      ]
    })
    expect(rejectsOfficialRemovalClaim(selected.note)).toBe(false)
  })
})
