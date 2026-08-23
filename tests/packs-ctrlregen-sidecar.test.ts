import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Encoding } from "effect"
import { makeArtifact } from "../src/core/domain.js"
import { transformArtifact } from "../src/core/pipeline.js"
import { createRegistry } from "../src/core/registry.js"
import { createCtrlRegenPack, ctrlRegenPack } from "../src/packs/ctrlregen.js"
import { rasterStripPack } from "../src/packs/raster-strip.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

const rasterBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const rasterArtifact = makeArtifact(rasterBytes, "raster")

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })

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

describe("packs_ctrlregen_sidecar", () => {
  it("CtrlRegen sidecar probe is unavailable when URL unset", async () => {
    const availability = await withEnv(
      [["CTRLREGEN_WEIGHTS", "dummy"]],
      ctrlRegenPack.probe(inspectCtx)
    )
    expect(availability.status).toBe("unavailable")
    expect(availability.reason).toBe("env-unset")
    expect(availability.detail).toBe("CTRLREGEN_SIDECAR_URL")

    const unsetBoth = await Effect.runPromise(
      ctrlRegenPack.probe(inspectCtx).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(unsetBoth.status).toBe("unavailable")
    expect(unsetBoth.reason).toBe("env-unset")

    const unsetWeights = await withEnv(
      [["CTRLREGEN_SIDECAR_URL", "http://127.0.0.1:18766"]],
      ctrlRegenPack.probe(inspectCtx)
    )
    expect(unsetWeights.status).toBe("unavailable")
    expect(unsetWeights.reason).toBe("env-unset")
    expect(unsetWeights.detail).toBe("CTRLREGEN_WEIGHTS")
  })

  it("CtrlRegen sidecar refuses non-loopback", async () => {
    let calls = 0
    const pack = createCtrlRegenPack({
      fetch: async () => {
        calls += 1
        return jsonResponse({ protocolVersion: "1.0.0", ok: true })
      }
    })
    const availability = await withEnv(
      [
        ["CTRLREGEN_WEIGHTS", "dummy"],
        ["CTRLREGEN_SIDECAR_URL", "http://example.com"]
      ],
      pack.probe(inspectCtx)
    )
    expect(calls).toBe(0)
    expect(availability.status).toBe("unavailable")
    expect(availability.reason).toBe("privacy-denied")

    await expect(
      withEnv(
        [
          ["CTRLREGEN_WEIGHTS", "dummy"],
          ["CTRLREGEN_SIDECAR_URL", "http://example.com"]
        ],
        pack.inspect(rasterArtifact, inspectCtx)
      )
    ).rejects.toBeTruthy()
    expect(calls).toBe(0)
  })

  it("CtrlRegen sidecar inspect maps protocol 1.0.0", async () => {
    const posted: Array<{ url: string; body: unknown }> = []
    const inspectBody = {
      protocolVersion: "1.0.0",
      ok: true as const,
      packId: "anthropies.ctrlregen",
      artifact: {
        bytes: Encoding.encodeBase64(rasterBytes),
        kind: "text" as const,
        digest: rasterArtifact.digest
      },
      findings: [{}]
    }
    const pack = createCtrlRegenPack({
      fetch: routeFetch({
        "POST /v1/inspect": (init) => {
          posted.push({
            url: "POST /v1/inspect",
            body: init?.body !== undefined ? JSON.parse(String(init.body)) : undefined
          })
          return jsonResponse(inspectBody)
        }
      })
    })

    const findings = await withEnv(
      [
        ["CTRLREGEN_WEIGHTS", "dummy"],
        ["CTRLREGEN_SIDECAR_URL", "http://127.0.0.1:18766"]
      ],
      pack.inspect(rasterArtifact, inspectCtx)
    )

    expect(posted).toHaveLength(1)
    expect(posted[0]?.body).toMatchObject({
      protocolVersion: "1.0.0",
      operation: "inspect"
    })
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => f.channel === "statistical")).toBe(true)
    expect(findings.every((f) => f.markClass === "pixel")).toBe(true)
    expect(findings.every((f) => f.packId === "anthropies.ctrlregen")).toBe(true)
    const encoded = JSON.stringify(findings)
    expect(encoded).not.toMatch(/watermarkScore/)
    expect(encoded).not.toMatch(/"score"\s*:/)
    expect(encoded).not.toMatch(/Removal|"removals"|"changedScope"/)
    expect(ctrlRegenPack.manifest.runtime).toBe("loopback-sidecar")
  })

  it("absent CtrlRegen sidecar does not fail raster-strip", async () => {
    const registry = createRegistry()
    expect(registry.register(rasterStripPack)).toEqual({ ok: true })
    expect(registry.register(ctrlRegenPack)).toEqual({ ok: true })
    const artifact = makeArtifact(rasterBytes, "raster")
    const transformed = await Effect.runPromise(
      transformArtifact(registry, artifact, removeCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(transformed).toBeDefined()
    expect(
      transformed.removals.some((r) => r.markClass === "provenance-metadata") ||
        transformed.remediation === "unchanged" ||
        transformed.remediation === "changed"
    ).toBe(true)
    expect(
      transformed.residualFindings.some((f) => f.packId === "anthropies.ctrlregen")
    ).toBe(false)
    expect(ctrlRegenPack.manifest.distribution).toBe("optional")
  })
})
