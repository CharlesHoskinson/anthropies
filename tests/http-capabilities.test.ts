import { HttpClient } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer } from "effect"
import { readFileSync } from "node:fs"
import { HttpApp } from "../src/http/server.js"
import { selectRewriteCandidate } from "../src/packs/rewrite-stylometry.js"

const TestLive = HttpApp.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map())))
)

describe("http_capabilities_inventory", () => {
  it.scoped("GET /health reports 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("health is 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
    }).pipe(Effect.provide(TestLive))
  )

  it("inspector source still names inspectDocx", () => {
    const src = readFileSync("src/services/inspector.ts", "utf8")
    expect(src).toMatch(/inspectDocx/)
    expect(src).toMatch(/inspectOdt/)
  })

  it.scoped("GET /capabilities has kernelApiVersion and nonempty packs", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = (yield* res.json) as {
        version: string
        kernelApiVersion: string
        tools: { qpdf: boolean; exiftool: boolean; c2patool: boolean }
        scorers: { officialDetect: boolean }
        packs: ReadonlyArray<{
          id: string
          availability: { status: string; reason: string }
          license: string
          privacy: string
        }>
      }
      expect(body.version).toBe("0.3.0")
      expect(body.kernelApiVersion).toBe("1.0.0")
      expect(body.tools).toEqual(
        expect.objectContaining({
          qpdf: expect.any(Boolean),
          exiftool: expect.any(Boolean),
          c2patool: expect.any(Boolean)
        })
      )
      expect(body.scorers).toEqual({ officialDetect: expect.any(Boolean) })
      expect(body.packs.length).toBeGreaterThan(0)
      expect(body.packs.some((pack) => pack.id === "anthropies.layer-a")).toBe(true)
      const ids = body.packs.map((pack) => pack.id)
      for (const id of [
        "anthropies.layer-a",
        "anthropies.c2pa",
        "anthropies.pdf",
        "anthropies.html",
        "anthropies.md",
        "anthropies.svg-strip",
        "anthropies.docx",
        "anthropies.odt",
        "anthropies.raster-strip",
        "anthropies.pdf-tools"
      ]) {
        expect(ids).toContain(id)
      }
      for (const pack of body.packs) {
        expect(pack.id.length).toBeGreaterThan(0)
        expect(pack.availability.status.length).toBeGreaterThan(0)
        expect(pack.license.length).toBeGreaterThan(0)
        expect(pack.privacy.length).toBeGreaterThan(0)
      }
      expect(JSON.stringify(body)).not.toMatch(/"score"\s*:/)
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("capabilities lists detector packs", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = (yield* res.json) as {
        packs: ReadonlyArray<{ id: string }>
      }
      const ids = body.packs.map((pack) => pack.id)
      expect(ids).toContain("anthropies.gemini-synthid")
      expect(ids).toContain("anthropies.official")
      expect(ids).toContain("anthropies.markllm")
      expect(JSON.stringify(body)).not.toMatch(/"score"\s*:/)
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("capabilities version stays 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = (yield* res.json) as { version: string }
      expect(body.version).toBe("0.3.0")
    }).pipe(Effect.provide(TestLive))
  )

  it("detector score does not pick the rewrite winner", () => {
    const source = "alpha beta gamma delta epsilon zeta eta theta iota kappa"
    const lexicalBest = "one two three four five six seven eight nine ten"
    const lexicalWorse = "alpha beta gamma delta epsilon zeta eta theta iota kappa"
    const withDetectors = selectRewriteCandidate({
      source,
      domain: "prose",
      candidates: [
        { id: "favored", text: lexicalWorse },
        { id: "lexical", text: lexicalBest }
      ],
      detectorHints: [
        { id: "favored", favorability: 0.99 },
        { id: "lexical", favorability: 0.01 }
      ]
    })
    const withoutDetectors = selectRewriteCandidate({
      source,
      domain: "prose",
      candidates: [
        { id: "favored", text: lexicalWorse },
        { id: "lexical", text: lexicalBest }
      ]
    })
    expect(withoutDetectors.selectedId).toBe("lexical")
    expect(withDetectors.selectedId).toBe(withoutDetectors.selectedId)
    expect(withDetectors.selectedText).toBe(lexicalBest)
  })
})
