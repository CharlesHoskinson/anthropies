import { FileSystem, HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Encoding, Layer, Schema } from "effect"
import { fileURLToPath } from "node:url"
import { decodeRequestFile, InspectResponse } from "../src/http/schema.js"
import { HttpApp } from "../src/http/server.js"

const trailerPath = fileURLToPath(new URL("../fixtures/layer-a/trailer-claude.txt", import.meta.url))

const TestLive = HttpApp.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map())))
)

const KeyedLive = HttpApp.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(
    Layer.setConfigProvider(
      ConfigProvider.fromMap(new Map([["ANTHROPIES_SERVER_API_KEY", "secret"]]))
    )
  )
)

const trailerFile = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(trailerPath)
  return Encoding.encodeBase64(bytes)
})

describe("http_inspect_clean", () => {
  it.scoped("inspects trailer fixture with deterministic present and official unavailable", () =>
    Effect.gen(function* () {
      const file = yield* trailerFile
      const res = yield* HttpClient.execute(
        HttpClientRequest.post("/inspect").pipe(
          HttpClientRequest.bodyUnsafeJson({ file, name: "trailer-claude.txt" })
        )
      )
      expect(res.status).toBe(200)
      const body = yield* res.json
      const parsed = Schema.decodeUnknownSync(InspectResponse)(body)
      expect(parsed.ok).toBe(true)
      expect(parsed.kind).toBe("text")
      const report = parsed.report
      const deterministic = report.findings.find((f) => f.channel === "deterministic")
      const official = report.findings.find((f) => f.channel === "official")
      expect(deterministic?.status).toBe("present")
      expect(official?.status).toBe("unavailable")
      expect(report.official?._tag).toBe("Unavailable")
      expect(report.honesty.join("\n")).toMatch(
        /does not prove the official Claude text detector will fail/
      )
      expect(JSON.stringify(report)).not.toMatch(/"score"/)
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("GET /health reports 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("GET /capabilities lists tools and officialDetect", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = yield* res.json
      expect(body).toEqual(
        expect.objectContaining({
          version: "0.3.0",
          tools: expect.objectContaining({
            qpdf: expect.any(Boolean),
            exiftool: expect.any(Boolean),
            c2patool: expect.any(Boolean)
          }),
          scorers: { officialDetect: expect.any(Boolean) }
        })
      )
      const scorers = (body as { scorers: { officialDetect: boolean } }).scorers
      expect(scorers.officialDetect).toBe(false)
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("POST /clean returns cleaned base64 without the Claude trailer", () =>
    Effect.gen(function* () {
      const file = yield* trailerFile
      const res = yield* HttpClient.execute(
        HttpClientRequest.post("/clean").pipe(
          HttpClientRequest.bodyUnsafeJson({ file, name: "trailer-claude.txt" })
        )
      )
      expect(res.status).toBe(200)
      const body = yield* res.json
      const parsed = body as {
        ok: boolean
        kind: string
        cleaned: string
        report: { findings: ReadonlyArray<{ channel: string; status: string }> }
      }
      expect(parsed.ok).toBe(true)
      expect(parsed.kind).toBe("text")
      const cleaned = Encoding.decodeBase64(parsed.cleaned)
      expect(cleaned._tag).toBe("Right")
      if (cleaned._tag === "Right") {
        const text = new TextDecoder().decode(cleaned.right)
        expect(text).not.toMatch(/noreply@anthropic\.com/)
        expect(text).toMatch(/Fix the bug/)
      }
      const official = parsed.report.findings.find((f) => f.channel === "official")
      expect(official?.status).toBe("unavailable")
    }).pipe(Effect.provide(TestLive))
  )

  it.scoped("missing bearer is 401 when key set", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(401)
      expect(yield* res.json).toEqual({ ok: false, error: "unauthorized" })
    }).pipe(Effect.provide(KeyedLive))
  )

  it.scoped("wrong bearer is 401 when key set", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.execute(
        HttpClientRequest.get("/health").pipe(HttpClientRequest.bearerToken("nope"))
      )
      expect(res.status).toBe(401)
    }).pipe(Effect.provide(KeyedLive))
  )

  it.scoped("valid bearer is 200 when key set", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.execute(
        HttpClientRequest.get("/health").pipe(HttpClientRequest.bearerToken("secret"))
      )
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
    }).pipe(Effect.provide(KeyedLive))
  )

  it.scoped("invalid base64 is 400", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.execute(
        HttpClientRequest.post("/inspect").pipe(
          HttpClientRequest.bodyUnsafeJson({ file: "@@@", name: "bad.txt" })
        )
      )
      expect(res.status).toBe(400)
      const body = (yield* res.json) as { ok: boolean }
      expect(body.ok).toBe(false)
    }).pipe(Effect.provide(TestLive))
  )

  it("decoded input over cap is InputTooLarge", () => {
    const result = decodeRequestFile("AAAA", 1)
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("InputTooLarge")
    }
  })
})
