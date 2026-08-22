import { HttpClient } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer } from "effect"
import { HttpApp } from "../src/http/server.js"

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
      for (const pack of body.packs) {
        expect(pack.id.length).toBeGreaterThan(0)
        expect(pack.availability.status.length).toBeGreaterThan(0)
        expect(pack.license.length).toBeGreaterThan(0)
        expect(pack.privacy.length).toBeGreaterThan(0)
      }
      expect(JSON.stringify(body)).not.toMatch(/"score"/)
    }).pipe(Effect.provide(TestLive))
  )
})
