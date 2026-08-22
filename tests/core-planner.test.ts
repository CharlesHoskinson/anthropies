import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { CapabilityManifest, defaultNativeLimits, type CapabilityPack } from "../src/core/capability.js"
import { Availability } from "../src/core/domain.js"
import { plan } from "../src/core/planner.js"
import { createRegistry } from "../src/core/registry.js"

const baseInput = {
  displayName: "Pack",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text"],
  markClasses: ["invisible-unicode"],
  operations: ["inspect"],
  channel: "deterministic" as const,
  priority: 100,
  ordering: {},
  runtime: "native-ts" as const,
  network: "none" as const,
  privacy: "local-only" as const,
  limits: defaultNativeLimits,
  license: "apache-2.0" as const,
  distribution: "core" as const
}

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const mockPack = (manifest: CapabilityManifest): CapabilityPack => ({
  manifest,
  probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
  inspect: () => Effect.succeed([])
})

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

describe("core_planner", () => {
  it("selects a text pack for text inspect", () => {
    const registry = createRegistry()
    const pack = mockPack(decodeManifest({ ...baseInput, id: "a" }))
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = plan(registry, { kind: "text", context: inspectCtx })
    expect(result).toEqual({ ok: true, packs: [pack] })
  })

  it("omits a text pack for raster even when forceText is true", () => {
    const registry = createRegistry()
    const pack = mockPack(decodeManifest({ ...baseInput, id: "a" }))
    expect(registry.register(pack)).toEqual({ ok: true })
    expect(plan(registry, { kind: "raster", context: inspectCtx })).toEqual({ ok: false, code: "none" })
    expect(
      plan(registry, { kind: "raster", context: { ...inspectCtx, forceText: true } })
    ).toEqual({ ok: false, code: "none" })
  })

  it("orders by priority descending when there are no edges", () => {
    const registry = createRegistry()
    const low = mockPack(
      decodeManifest({
        ...baseInput,
        id: "low",
        priority: 50,
        markClasses: ["agent-trailer"]
      })
    )
    const high = mockPack(
      decodeManifest({
        ...baseInput,
        id: "high",
        priority: 200,
        markClasses: ["generated-banner"]
      })
    )
    expect(registry.register(low)).toEqual({ ok: true })
    expect(registry.register(high)).toEqual({ ok: true })
    const result = plan(registry, { kind: "text", context: inspectCtx })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.packs.map((p) => p.manifest.id)).toEqual(["high", "low"])
    }
  })

  it("honors ordering.after", () => {
    const registry = createRegistry()
    const a = mockPack(decodeManifest({ ...baseInput, id: "a", priority: 50 }))
    const b = mockPack(
      decodeManifest({
        ...baseInput,
        id: "b",
        priority: 200,
        markClasses: ["agent-trailer"],
        ordering: { after: ["a"] }
      })
    )
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    const result = plan(registry, { kind: "text", context: inspectCtx })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.packs.map((p) => p.manifest.id)).toEqual(["a", "b"])
    }
  })

  it("returns conflict on an ordering cycle", () => {
    const registry = createRegistry()
    const a = mockPack(
      decodeManifest({ ...baseInput, id: "a", ordering: { after: ["b"] } })
    )
    const b = mockPack(
      decodeManifest({
        ...baseInput,
        id: "b",
        markClasses: ["agent-trailer"],
        ordering: { after: ["a"] }
      })
    )
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    expect(plan(registry, { kind: "text", context: inspectCtx })).toEqual({
      ok: false,
      code: "conflict"
    })
  })
})
