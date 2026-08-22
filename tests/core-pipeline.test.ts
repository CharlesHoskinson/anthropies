import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { readFileSync } from "node:fs"
import { CapabilityManifest, defaultNativeLimits, type CapabilityPack } from "../src/core/capability.js"
import {
  Availability,
  CapabilityFailure,
  Evidence,
  KernelFinding,
  Removal,
  makeArtifact,
  TransformResult
} from "../src/core/domain.js"
import { inspectArtifact, transformArtifact } from "../src/core/pipeline.js"
import { createRegistry } from "../src/core/registry.js"

const baseInput = {
  displayName: "Pack",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text"],
  markClasses: ["invisible-unicode"],
  operations: ["inspect", "remove"],
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

const finding = (packId: string, markClass: "invisible-unicode" | "agent-trailer"): KernelFinding =>
  new KernelFinding({
    channel: "deterministic",
    markClass,
    status: "present",
    evidence: { kind: "contract" },
    packId,
    packImplementationVersion: "0.4.0"
  })

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

const failDump = async (effect: Effect.Effect<unknown, CapabilityFailure>): Promise<string> => {
  const exit = await Effect.runPromiseExit(effect)
  if (exit._tag !== "Failure") {
    throw new Error("expected failure")
  }
  return JSON.stringify(exit.cause)
}

const changed = (artifact: ReturnType<typeof makeArtifact>): TransformResult =>
  new TransformResult({
    artifact,
    removals: [],
    evidence: { kind: "contract" },
    residualFindings: [],
    warnings: [],
    remediation: "changed"
  })

describe("core_pipeline", () => {
  it("concatenates inspect findings in plan order", async () => {
    const registry = createRegistry()
    const a = {
      manifest: decodeManifest({ ...baseInput, id: "a", priority: 200 }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([finding("a", "invisible-unicode")])
    } satisfies CapabilityPack
    const b = {
      manifest: decodeManifest({
        ...baseInput,
        id: "b",
        priority: 50,
        markClasses: ["agent-trailer"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([finding("b", "agent-trailer")])
    } satisfies CapabilityPack
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(inspectArtifact(registry, artifact, inspectCtx))
    expect(findings.map((f) => f.packId)).toEqual(["a", "b"])
  })

  it("empty plan inspects to no findings", async () => {
    const registry = createRegistry()
    const pack = {
      manifest: decodeManifest({ ...baseInput, id: "a" }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([finding("a", "invisible-unicode")])
    } satisfies CapabilityPack
    expect(registry.register(pack)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "raster")
    const findings = await Effect.runPromise(inspectArtifact(registry, artifact, inspectCtx))
    expect(findings).toEqual([])
  })

  it("successful transform is changed", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned"), "text")
    const next = makeArtifact(new TextEncoder().encode("clean"), "text")
    const pack = {
      manifest: decodeManifest({ ...baseInput, id: "a" }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () => Effect.succeed(changed(next))
    } satisfies CapabilityPack
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.remediation).toBe("changed")
    expect(result.artifact.digest).toBe(next.digest)
    expect(result.artifact.digest).not.toBe(original.digest)
  })

  it("transforms run in plan order and skip missing transform", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("0"), "text")
    const mid = makeArtifact(new TextEncoder().encode("1"), "text")
    const last = makeArtifact(new TextEncoder().encode("2"), "text")
    const seen: string[] = []
    const a = {
      manifest: decodeManifest({ ...baseInput, id: "a", priority: 200 }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: (artifact: ReturnType<typeof makeArtifact>) => {
        seen.push(`a:${new TextDecoder().decode(artifact.bytes)}`)
        return Effect.succeed(changed(mid))
      }
    } satisfies CapabilityPack
    const skip = {
      manifest: decodeManifest({
        ...baseInput,
        id: "skip",
        priority: 150,
        markClasses: ["agent-trailer"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    } satisfies CapabilityPack
    const b = {
      manifest: decodeManifest({
        ...baseInput,
        id: "b",
        priority: 50,
        markClasses: ["generated-banner"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: (artifact: ReturnType<typeof makeArtifact>) => {
        seen.push(`b:${new TextDecoder().decode(artifact.bytes)}`)
        return Effect.succeed(changed(last))
      }
    } satisfies CapabilityPack
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(skip)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(seen).toEqual(["a:0", "b:1"])
    expect(result.artifact.digest).toBe(last.digest)
    expect(result.remediation).toBe("changed")
  })

  it("preserves original bytes when transform times out", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned"), "text")
    const pack = {
      manifest: decodeManifest({ ...baseInput, id: "a" }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () =>
        Effect.fail(new CapabilityFailure({ code: "timeout", packId: "a", reason: "timeout" }))
    } satisfies CapabilityPack
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.artifact.digest).toBe(original.digest)
    expect(result.remediation).toBe("unchanged")
  })

  it("later timeout restores original after a prior change", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned"), "text")
    const dirty = makeArtifact(new TextEncoder().encode("dirty"), "text")
    const a = {
      manifest: decodeManifest({ ...baseInput, id: "a", priority: 200 }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () => Effect.succeed(changed(dirty))
    } satisfies CapabilityPack
    const b = {
      manifest: decodeManifest({
        ...baseInput,
        id: "b",
        priority: 50,
        markClasses: ["agent-trailer"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () =>
        Effect.fail(new CapabilityFailure({ code: "timeout", packId: "b", reason: "timeout" }))
    } satisfies CapabilityPack
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.artifact.digest).toBe(original.digest)
    expect(result.artifact.digest).not.toBe(dirty.digest)
    expect(result.remediation).toBe("unchanged")
  })

  it("plan conflict fails inspect and transform", async () => {
    const registry = createRegistry()
    const a = {
      manifest: decodeManifest({ ...baseInput, id: "a", ordering: { after: ["b"] } }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () => Effect.succeed(changed(makeArtifact(new TextEncoder().encode("x"), "text")))
    } satisfies CapabilityPack
    const b = {
      manifest: decodeManifest({
        ...baseInput,
        id: "b",
        markClasses: ["agent-trailer"],
        ordering: { after: ["a"] }
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    } satisfies CapabilityPack
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const inspectDump = await failDump(inspectArtifact(registry, artifact, inspectCtx))
    expect(inspectDump).toMatch(/"code":"conflict"/)
    expect(inspectDump).toMatch(/"packId":"pipeline"/)
    const transformDump = await failDump(transformArtifact(registry, artifact, removeCtx))
    expect(transformDump).toMatch(/"code":"conflict"/)
    expect(transformDump).toMatch(/"packId":"pipeline"/)
  })

  it("pipeline source does not write files", () => {
    const src = readFileSync("src/core/pipeline.ts", "utf8")
    expect(src).not.toMatch(/writeFile/)
    expect(src).not.toMatch(/writeFileSync/)
    expect(src).not.toMatch(/writeAtomic/)
  })

  it("Removal and Evidence instance are accepted", () => {
    const structEvidence = { kind: "contract" as const }
    const instance = new Evidence({ kind: "contract" })
    expect(
      new Removal({
        channel: "deterministic",
        markClass: "invisible-unicode",
        changedScope: "bytes",
        evidence: structEvidence,
        labels: []
      }).evidence.kind
    ).toBe("contract")
    expect(
      new Removal({
        channel: "deterministic",
        markClass: "invisible-unicode",
        changedScope: "bytes",
        evidence: instance,
        labels: []
      }).evidence.kind
    ).toBe("contract")
    expect(
      new KernelFinding({
        channel: "deterministic",
        markClass: "agent-trailer",
        status: "present",
        evidence: instance,
        packId: "a",
        packImplementationVersion: "0.4.0"
      }).evidence.kind
    ).toBe("contract")
    expect(
      new TransformResult({
        artifact: makeArtifact(new TextEncoder().encode("x"), "text"),
        removals: [],
        evidence: instance,
        residualFindings: [],
        warnings: [],
        remediation: "unchanged"
      }).evidence.kind
    ).toBe("contract")
  })
})
