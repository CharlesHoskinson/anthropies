import { HttpClient } from "@effect/platform"
import { NodeContext, NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Either, Layer } from "effect"
import { readFileSync } from "node:fs"
import { builtinRegistry } from "../src/core/builtin-registry.js"
import { HttpApp } from "../src/http/server.js"
import { rewriteStylometryPack } from "../src/packs/rewrite-stylometry.js"
import { Humanizer, PROSE_PROMPT, originBlocked } from "../src/services/humanizer.js"

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
})
