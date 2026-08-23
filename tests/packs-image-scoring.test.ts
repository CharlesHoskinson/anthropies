import { HttpClient } from "@effect/platform"
import { NodeContext, NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Encoding, Layer } from "effect"
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { makeArtifact } from "../src/core/domain.js"
import { inspectArtifact } from "../src/core/pipeline.js"
import { createRegistry } from "../src/core/registry.js"
import { HttpApp } from "../src/http/server.js"
import { layerAPack } from "../src/packs/layer-a.js"
import {
  DEFAULT_IMAGE_SCORING_BASE_URL,
  IMAGE_SCORING_PINS,
  createImageScoringPack,
  imageScoringPack,
  pinsComplete,
  resolveImageScoringBaseUrl
} from "../src/packs/image-scoring.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const srcRoot = fileURLToPath(new URL("../src", import.meta.url))
const dockerPath = fileURLToPath(new URL("../Dockerfile", import.meta.url))

const HealthLive = HttpApp.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map())))
)

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })

const healthOk = { protocolVersion: "1.0.0", ok: true as const }
const capabilitiesOk = {
  protocolVersion: "1.0.0",
  id: "anthropies.image-scoring",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  operations: ["score", "inspect"]
}

const rasterBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const rasterArtifact = makeArtifact(rasterBytes, "raster")

const inspectOkBody = {
  protocolVersion: "1.0.0",
  ok: true as const,
  packId: "anthropies.image-scoring",
  artifact: {
    bytes: Encoding.encodeBase64(rasterBytes),
    kind: "text" as const,
    digest: rasterArtifact.digest
  },
  findings: [{}]
}

const inspectAbsentBody = {
  ...inspectOkBody,
  findings: [] as Array<Record<string, never>>
}

const failureOf = async (
  effect: Effect.Effect<unknown, { readonly code: string; readonly reason: string; readonly packId: string }>
): Promise<{ code: string; reason: string; packId: string }> => {
  const exit = await Effect.runPromiseExit(effect)
  if (exit._tag !== "Failure") {
    throw new Error("expected failure")
  }
  const dump = JSON.stringify(exit.cause)
  const match = dump.match(/"code":"([^"]+)".*"reason":"([^"]+)".*"packId":"([^"]+)"/s)
  if (match) {
    return { code: match[1]!, reason: match[2]!, packId: match[3]! }
  }
  const schemaOrder = dump.match(/"code":"([^"]+)".*"packId":"([^"]+)".*"reason":"([^"]+)"/s)
  if (schemaOrder) {
    return { code: schemaOrder[1]!, packId: schemaOrder[2]!, reason: schemaOrder[3]! }
  }
  throw new Error(`unrecognized failure ${dump.slice(0, 400)}`)
}

const withEnv = <A, E>(
  env: ReadonlyArray<readonly [string, string]>,
  effect: Effect.Effect<A, E>
): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.withConfigProvider(ConfigProvider.fromMap(new Map(env)))))

const routeFetch = (
  routes: Record<string, (init?: RequestInit) => Promise<Response> | Response>
): ((input: string, init?: RequestInit) => Promise<Response>) => {
  return async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input)
    const key = `${init?.method ?? "GET"} ${url.pathname}`
    const handler = routes[key]
    if (handler === undefined) {
      throw new Error(`unexpected fetch ${key}`)
    }
    return handler(init)
  }
}

const walkRel = (root: string, prefix = ""): Array<string> => {
  const entries = readdirSync(root, { withFileTypes: true })
  const out: Array<string> = []
  for (const entry of entries) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      out.push(...walkRel(join(root, entry.name), rel))
    } else {
      out.push(rel)
    }
  }
  return out
}

describe("packs_image_scoring", () => {
  it("health carries protocolVersion 1.0.0", async () => {
    const seen: Array<string> = []
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => {
          seen.push("health")
          return jsonResponse(healthOk)
        },
        "GET /capabilities": () => jsonResponse(capabilitiesOk)
      })
    })
    const availability = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.probe(inspectCtx)
    )
    expect(seen).toContain("health")
    expect(availability.status).toBe("available")
    expect(healthOk.protocolVersion).toBe("1.0.0")
    expect(healthOk.ok).toBe(true)
  })

  it("foreign protocol is incompatible", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse({ protocolVersion: "2.0.0", ok: true }),
        "GET /capabilities": () => jsonResponse(capabilitiesOk)
      })
    })
    const availability = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.probe(inspectCtx)
    )
    expect(availability.status).toBe("incompatible")
    expect(availability.reason).toBe("protocol-mismatch")
  })

  it("pin inventory is present", () => {
    expect(IMAGE_SCORING_PINS.containerOrLockDigest.length).toBeGreaterThan(0)
    expect(IMAGE_SCORING_PINS.upstreamCommit.length).toBeGreaterThan(0)
    expect(IMAGE_SCORING_PINS.modelOrCodebookDigest.length).toBeGreaterThan(0)
    expect(IMAGE_SCORING_PINS.configurationDigest.length).toBeGreaterThan(0)
    expect(pinsComplete(IMAGE_SCORING_PINS)).toBe(true)
  })

  it("missing pin blocks certification", async () => {
    const pack = createImageScoringPack({
      pins: {
        containerOrLockDigest: "",
        upstreamCommit: IMAGE_SCORING_PINS.upstreamCommit,
        modelOrCodebookDigest: IMAGE_SCORING_PINS.modelOrCodebookDigest,
        configurationDigest: IMAGE_SCORING_PINS.configurationDigest
      },
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () => jsonResponse(inspectOkBody)
      })
    })
    const findings = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.inspect(rasterArtifact, inspectCtx)
    )
    expect(findings.every((f) => f.evidence.versionFingerprint === undefined)).toBe(true)
    expect(findings.every((f) => f.status === "indeterminate")).toBe(true)
  })

  it("healthy compatible scorer is available", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk)
      })
    })
    const availability = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.probe(inspectCtx)
    )
    expect(availability.status).toBe("available")
    expect(availability.reason).toBe("ready")
  })

  it("capabilities omit score operation", async () => {
    let inspectCalls = 0
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () =>
          jsonResponse({
            ...capabilitiesOk,
            operations: ["remove"]
          }),
        "POST /v1/inspect": () => {
          inspectCalls += 1
          return jsonResponse(inspectOkBody)
        }
      })
    })
    const availability = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.probe(inspectCtx)
    )
    expect(["incompatible", "unavailable"]).toContain(availability.status)
    expect(inspectCalls).toBe(0)
    await expect(
      withEnv(
        [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
        pack.inspect(rasterArtifact, inspectCtx)
      )
    ).rejects.toBeTruthy()
    expect(inspectCalls).toBe(0)
  })

  it("default base URL is loopback", () => {
    const resolved = resolveImageScoringBaseUrl()
    const host = new URL(resolved).hostname
    expect(["127.0.0.1", "localhost"]).toContain(host)
    expect(["127.0.0.1", "localhost"]).toContain(new URL(DEFAULT_IMAGE_SCORING_BASE_URL).hostname)
  })

  it("non-loopback URL is refused", async () => {
    let calls = 0
    const pack = createImageScoringPack({
      fetch: async () => {
        calls += 1
        return jsonResponse(healthOk)
      }
    })
    const availability = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://example.com"]],
      pack.probe(inspectCtx)
    )
    expect(calls).toBe(0)
    expect(availability.status).toBe("unavailable")
    expect(availability.reason).toBe("privacy-denied")

    const fail = await failureOf(
      pack.inspect(rasterArtifact, inspectCtx).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(new Map([["IMAGE_SCORING_BASE_URL", "http://example.com"]]))
        )
      )
    )
    expect(calls).toBe(0)
    expect(fail.code).toBe("unavailable")
    expect(fail.reason).toBe("privacy-denied")
  })

  it("observation stays on statistical", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () => jsonResponse(inspectOkBody)
      })
    })
    const findings = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.inspect(rasterArtifact, inspectCtx)
    )
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => f.channel === "statistical")).toBe(true)
    expect(findings.every((f) => f.markClass === "pixel")).toBe(true)
    expect(JSON.stringify(findings)).not.toMatch(/watermarkScore/)
    expect(JSON.stringify(findings)).not.toMatch(/"score"\s*:/)
  })

  it("observation is not a removal", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () => jsonResponse(inspectOkBody)
      })
    })
    expect(pack.transform).toBeUndefined()
    const findings = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.inspect(rasterArtifact, inspectCtx)
    )
    expect(JSON.stringify(findings)).not.toMatch(/Removal|"removals"|"changedScope"/)
    expect(imageScoringPack.manifest.operations).not.toContain("remove")
  })

  it("scorer output is not clean certificate", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () => jsonResponse(inspectOkBody)
      })
    })
    const findings = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.inspect(rasterArtifact, inspectCtx)
    )
    const encoded = JSON.stringify(findings)
    expect(encoded).not.toMatch(/watermark removed|clean certificate|watermarkScore/i)
    expect(encoded).not.toMatch(/"score"\s*:/)
    expect(findings.every((f) => f.channel === "statistical")).toBe(true)
  })

  it("absent pixel signal is not human proof", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () => jsonResponse(inspectAbsentBody)
      })
    })
    const findings = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.inspect(rasterArtifact, inspectCtx)
    )
    expect(findings.some((f) => f.status === "absent")).toBe(true)
    const encoded = JSON.stringify(findings)
    expect(encoded).not.toMatch(/free of all marks|Claude was uninvolved|human proof/i)
  })

  it("absent sidecar is unavailable", async () => {
    const unset = await Effect.runPromise(
      imageScoringPack.probe(inspectCtx).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(unset.status).toBe("unavailable")
    expect(["optional-absent", "probe-failed", "env-unset"]).toContain(unset.reason)

    const pack = createImageScoringPack({
      fetch: async () => {
        throw new TypeError("fetch failed")
      }
    })
    const down = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.probe(inspectCtx)
    )
    expect(down.status).toBe("unavailable")
    expect(["optional-absent", "probe-failed"]).toContain(down.reason)
  })

  it("absent scorer does not break core inspect", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.register(imageScoringPack)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(
      inspectArtifact(registry, artifact, inspectCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(findings.some((f) => f.packId === "anthropies.layer-a")).toBe(true)
    expect(findings.some((f) => f.packId === "anthropies.image-scoring")).toBe(false)
  })

  it("malformed body is not certified", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () =>
          new Response("not-json", {
            status: 200,
            headers: { "content-type": "application/json" }
          })
      })
    })
    const fail = await failureOf(
      pack.inspect(rasterArtifact, inspectCtx).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(new Map([["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]]))
        )
      )
    )
    expect(fail.code).toBe("malformed-output")
    expect(fail.reason).toBe("malformed-output")
  })

  it("incompatible scorer is not certified", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () =>
          jsonResponse({
            ...capabilitiesOk,
            kernelApiMin: "2.0.0",
            kernelApiMax: "2.0.0"
          }),
        "POST /v1/inspect": () => jsonResponse(inspectOkBody)
      })
    })
    const availability = await withEnv(
      [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
      pack.probe(inspectCtx)
    )
    expect(availability.status).toBe("incompatible")
    let inspectCalls = 0
    const pack2 = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () =>
          jsonResponse({
            ...capabilitiesOk,
            kernelApiMin: "2.0.0",
            kernelApiMax: "2.0.0"
          }),
        "POST /v1/inspect": () => {
          inspectCalls += 1
          return jsonResponse(inspectOkBody)
        }
      })
    })
    const fail = await failureOf(
      pack2.inspect(rasterArtifact, inspectCtx).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(new Map([["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]]))
        )
      )
    )
    expect(fail.code).toBe("incompatible")
    expect(inspectCalls).toBe(0)
  })

  it("manifest has no remove operation", () => {
    expect(
      imageScoringPack.manifest.operations.includes("score") ||
        imageScoringPack.manifest.operations.includes("inspect")
    ).toBe(true)
    expect(imageScoringPack.manifest.operations).not.toContain("remove")
  })

  it("transform path is absent or refused", async () => {
    expect(imageScoringPack.transform).toBeUndefined()
    const registry = createRegistry()
    expect(registry.register(imageScoringPack)).toEqual({ ok: true })
    // Pack alone must not rewrite raster bytes via transform.
    expect(imageScoringPack.transform?.(rasterArtifact, { ...inspectCtx, operation: "remove" })).toBeUndefined()
  })

  it("core package omits noncommercial scorer", () => {
    const rels = walkRel(srcRoot)
    for (const rel of rels) {
      expect(rel).not.toMatch(/\.py$/)
      expect(rel).not.toMatch(/reverse-SynthID|reverse_synthid|aloshdenny/)
      expect(rel).not.toMatch(/spectral_codebook/)
    }
    const docker = readFileSync(dockerPath, "utf8")
    const copyLines = docker.split("\n").filter((line) => /^\s*COPY\b/.test(line))
    for (const line of copyLines) {
      expect(line).not.toMatch(/reverse-SynthID|synthid.score|spectral_codebook/)
    }
  })

  it("optional pack declares non-core distribution", () => {
    expect(imageScoringPack.manifest.distribution).toBe("optional")
    expect(["optional-noncommercial", "optional-restricted"]).toContain(
      imageScoringPack.manifest.license
    )
    expect(imageScoringPack.manifest.runtime).toBe("loopback-sidecar")
    expect(imageScoringPack.manifest.id).toBe("anthropies.image-scoring")
  })

  it("timeout maps cleanly", async () => {
    const pack = createImageScoringPack({
      timeoutMs: 20,
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": async (_init) =>
          await new Promise<Response>((_resolve, reject) => {
            const err = new Error("aborted")
            err.name = "AbortError"
            setTimeout(() => reject(err), 50)
          })
      })
    })
    const fail = await failureOf(
      pack.inspect(rasterArtifact, inspectCtx).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(new Map([["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]]))
        )
      )
    )
    expect(fail.code).toBe("timeout")
    expect(fail.reason).toBe("timeout")
  })

  it("diagnostics stay off stdout JSON", async () => {
    const pack = createImageScoringPack({
      fetch: routeFetch({
        "GET /health": () => jsonResponse(healthOk),
        "GET /capabilities": () => jsonResponse(capabilitiesOk),
        "POST /v1/inspect": () => jsonResponse(inspectOkBody)
      })
    })
    const dir = mkdtempSync(join(tmpdir(), "img-score-stdout-"))
    const logPath = join(dir, "stdout.txt")
    const originalWrite = process.stdout.write.bind(process.stdout)
    const chunks: Array<string> = []
    process.stdout.write = ((chunk: string | Uint8Array, ...args: Array<unknown>) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"))
      return (originalWrite as (c: string | Uint8Array, ...a: Array<unknown>) => boolean)(
        chunk,
        ...args
      )
    }) as typeof process.stdout.write
    try {
      const findings = await withEnv(
        [["IMAGE_SCORING_BASE_URL", "http://127.0.0.1:18765"]],
        pack.inspect(rasterArtifact, inspectCtx)
      )
      writeFileSync(logPath, chunks.join(""), "utf8")
      const stdout = readFileSync(logPath, "utf8")
      expect(stdout).not.toMatch(/CodebookV4|warning:|scorer/i)
      expect(JSON.stringify(findings).startsWith("[")).toBe(true)
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it.scoped("health is 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
    }).pipe(Effect.provide(HealthLive))
  )

  it.scoped("capabilities lists image-scoring pack", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = (yield* res.json) as {
        packs: ReadonlyArray<{ id: string }>
      }
      expect(body.packs.map((p) => p.id)).toContain("anthropies.image-scoring")
      expect(JSON.stringify(body)).not.toMatch(/watermarkScore/)
      expect(JSON.stringify(body)).not.toMatch(/"score"\s*:/)
    }).pipe(Effect.provide(HealthLive))
  )

  it.scoped("capabilities version stays 0.3.0", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/capabilities")
      expect(res.status).toBe(200)
      const body = (yield* res.json) as { version: string }
      expect(body.version).toBe("0.3.0")
    }).pipe(Effect.provide(HealthLive))
  )
})
