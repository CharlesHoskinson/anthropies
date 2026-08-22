import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { CapabilityManifest, defaultNativeLimits, type CapabilityPack } from "../src/core/capability.js"
import { Availability, kernelApiVersion } from "../src/core/domain.js"
import { createRegistry, kernelRangeIncludes } from "../src/core/registry.js"

const layerAInput = {
  id: "anthropies.layer-a",
  displayName: "Layer A",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text", "svg", "html", "md", "docx", "odt"],
  markClasses: ["invisible-unicode", "agent-trailer", "generated-banner"],
  operations: ["inspect", "remove"],
  channel: "deterministic",
  priority: 100,
  ordering: {},
  runtime: "native-ts",
  network: "none",
  privacy: "local-only",
  limits: defaultNativeLimits,
  license: "apache-2.0",
  distribution: "core"
} as const

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const mockPack = (manifest: CapabilityManifest): CapabilityPack => ({
  manifest,
  probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
  inspect: () => Effect.succeed([])
})

const textRemove = {
  artifactKind: "text" as const,
  markClass: "invisible-unicode" as const,
  operation: "remove" as const
}

describe("core_registry", () => {
  it("kernelRangeIncludes is inclusive X.Y.Z", () => {
    expect(kernelApiVersion).toBe("1.0.0")
    expect(kernelRangeIncludes("1.0.0", "1.0.0", "1.0.0")).toBe(true)
    expect(kernelRangeIncludes("1.0.0", "2.0.0", "1.0.0")).toBe(true)
    expect(kernelRangeIncludes("2.0.0", "2.0.0", "1.0.0")).toBe(false)
    expect(kernelRangeIncludes("0.9.0", "0.9.0", "1.0.0")).toBe(false)
    expect(kernelRangeIncludes("not-a-version", "1.0.0", "1.0.0")).toBe(false)
  })

  it("registers a compatible pack", () => {
    const registry = createRegistry()
    const pack = mockPack(decodeManifest(layerAInput))
    expect(registry.register(pack)).toEqual({ ok: true })
    expect(registry.list().map((p) => p.manifest.id)).toEqual(["anthropies.layer-a"])
    expect(registry.ownerFor(textRemove)).toEqual({ ok: true, owner: pack.manifest })
  })

  it("rejects an incompatible kernel range and does not list it", () => {
    const registry = createRegistry()
    const pack = mockPack(decodeManifest({ ...layerAInput, id: "too-new", kernelApiMin: "2.0.0", kernelApiMax: "2.0.0" }))
    expect(registry.register(pack)).toEqual({ ok: false, code: "incompatible" })
    expect(registry.list()).toEqual([])
    const old = mockPack(decodeManifest({ ...layerAInput, id: "too-old", kernelApiMax: "0.9.0", kernelApiMin: "0.9.0" }))
    expect(registry.register(old)).toEqual({ ok: false, code: "incompatible" })
    expect(registry.list()).toEqual([])
  })

  it("rejects a second claimant of the same owner tuple", () => {
    const registry = createRegistry()
    const a = mockPack(decodeManifest(layerAInput))
    const b = mockPack(decodeManifest({ ...layerAInput, id: "anthropies.layer-a-dup" }))
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: false, code: "conflict" })
    expect(registry.list().map((p) => p.manifest.id)).toEqual(["anthropies.layer-a"])
  })

  it("rejects a duplicate pack id even when artifactKinds is empty", () => {
    const registry = createRegistry()
    const empty = mockPack(
      decodeManifest({ ...layerAInput, id: "anthropies.empty-kinds", artifactKinds: [] })
    )
    const again = mockPack(
      decodeManifest({ ...layerAInput, id: "anthropies.empty-kinds", artifactKinds: [] })
    )
    expect(registry.register(empty)).toEqual({ ok: true })
    expect(registry.register(again)).toEqual({ ok: false, code: "conflict" })
    expect(registry.list().map((p) => p.manifest.id)).toEqual(["anthropies.empty-kinds"])
  })

  it("empty artifactKinds create no owner claims", () => {
    const registry = createRegistry()
    const empty = mockPack(
      decodeManifest({ ...layerAInput, id: "anthropies.empty-kinds", artifactKinds: [] })
    )
    const layerA = mockPack(decodeManifest(layerAInput))
    expect(registry.register(empty)).toEqual({ ok: true })
    expect(registry.register(layerA)).toEqual({ ok: true })
    expect(registry.list().map((p) => p.manifest.id)).toEqual([
      "anthropies.empty-kinds",
      "anthropies.layer-a"
    ])
    expect(registry.ownerFor(textRemove)).toEqual({ ok: true, owner: layerA.manifest })
  })

  it("ownerFor returns none when nobody claims the tuple", () => {
    const registry = createRegistry()
    const empty = mockPack(
      decodeManifest({ ...layerAInput, id: "anthropies.empty-kinds", artifactKinds: [] })
    )
    expect(registry.register(empty)).toEqual({ ok: true })
    expect(registry.ownerFor(textRemove)).toEqual({ ok: false, code: "none" })
  })
})
