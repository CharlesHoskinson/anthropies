import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { createHash } from "node:crypto"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack
} from "../src/core/capability.js"
import {
  Availability,
  CapabilityFailure,
  makeArtifact,
  TransformResult
} from "../src/core/domain.js"
import { inspectArtifact, transformArtifact } from "../src/core/pipeline.js"
import { plan } from "../src/core/planner.js"
import { createRegistry } from "../src/core/registry.js"
import { c2paPack } from "../src/packs/c2pa.js"
import { layerAPack } from "../src/packs/layer-a.js"
import {
  sidecarProtocolVersion,
  SidecarInspectRequest,
  SidecarInspectResponse,
  SidecarTransformResponse
} from "../src/sidecars/protocol.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const baseInput = {
  displayName: "Pack",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text"],
  markClasses: ["keyed-text"],
  operations: ["inspect", "remove"],
  channel: "deterministic" as const,
  priority: 1,
  ordering: {},
  runtime: "native-ts" as const,
  network: "none" as const,
  privacy: "local-only" as const,
  limits: defaultNativeLimits,
  license: "apache-2.0" as const,
  distribution: "optional" as const
}

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe("sol_blocked_hardening", () => {
  it("optional absent pack does not fail layer-a inspect", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    const optional: CapabilityPack = {
      manifest: decodeManifest({ ...baseInput, id: "anthropies.optional-absent" }),
      probe: () =>
        Effect.succeed(new Availability({ status: "unavailable", reason: "optional-absent" })),
      inspect: () =>
        Effect.fail(
          new CapabilityFailure({
            code: "unavailable",
            packId: "anthropies.optional-absent",
            reason: "optional-absent"
          })
        )
    }
    expect(registry.register(optional)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(inspectArtifact(registry, artifact, inspectCtx))
    expect(findings.every((f) => f.packId === "anthropies.layer-a")).toBe(true)
    expect(findings.length).toBeGreaterThan(0)
  })

  it("no-op transform stays unchanged", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned"), "text")
    const pack: CapabilityPack = {
      manifest: decodeManifest({ ...baseInput, id: "noop", distribution: "core" }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: (artifact) =>
        Effect.succeed(
          new TransformResult({
            artifact,
            removals: [],
            evidence: { kind: "contract" },
            residualFindings: [],
            warnings: [],
            remediation: "unchanged"
          })
        )
    }
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.remediation).toBe("unchanged")
    expect(result.artifact.digest).toBe(original.digest)
  })

  it("truncated raster is indeterminate", async () => {
    const artifact = makeArtifact(PNG_MAGIC, "raster")
    const findings = await Effect.runPromise(c2paPack.inspect(artifact, inspectCtx))
    expect(findings[0]?.status).toBe("indeterminate")
  })

  it("mismatched sidecar digest is rejected", () => {
    const bytes = new TextEncoder().encode("owned output")
    const digest = createHash("sha256").update(new TextEncoder().encode("other")).digest("hex")
    expect(() =>
      Schema.decodeUnknownSync(SidecarInspectRequest)({
        protocolVersion: "1.0.0",
        operation: "inspect",
        artifact: {
          bytes: Buffer.from(bytes).toString("base64"),
          kind: "text",
          digest
        }
      })
    ).toThrow()
  })

  it("score on a finding is rejected", () => {
    const bytes = "b3duZWQgb3V0cHV0"
    const digest = "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
    expect(() =>
      Schema.decodeUnknownSync(SidecarInspectResponse)({
        protocolVersion: "1.0.0",
        ok: true,
        packId: "anthropies.layer-a",
        artifact: { bytes, kind: "text", digest },
        findings: [{ score: 1 }]
      })
    ).toThrow()
  })

  it("after self is conflict", () => {
    const registry = createRegistry()
    const pack: CapabilityPack = {
      manifest: decodeManifest({
        ...baseInput,
        id: "loop",
        distribution: "core",
        ordering: { after: ["loop"] }
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    }
    expect(registry.register(pack)).toEqual({ ok: true })
    expect(plan(registry, { kind: "text", context: inspectCtx })).toEqual({
      ok: false,
      code: "conflict"
    })
  })

  it("before edge is honored", () => {
    const registry = createRegistry()
    const a: CapabilityPack = {
      manifest: decodeManifest({ ...baseInput, id: "a", distribution: "core", priority: 10 }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    }
    const b: CapabilityPack = {
      manifest: decodeManifest({
        ...baseInput,
        id: "b",
        distribution: "core",
        priority: 10,
        markClasses: ["pixel"],
        ordering: { before: ["a"] }
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    }
    expect(registry.register(a)).toEqual({ ok: true })
    expect(registry.register(b)).toEqual({ ok: true })
    const result = plan(registry, { kind: "text", context: inspectCtx })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.packs.map((p) => p.manifest.id)).toEqual(["b", "a"])
    }
  })

  it("equal priority orders by id", () => {
    const registry = createRegistry()
    const z: CapabilityPack = {
      manifest: decodeManifest({ ...baseInput, id: "z", distribution: "core", priority: 50 }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    }
    const m: CapabilityPack = {
      manifest: decodeManifest({
        ...baseInput,
        id: "m",
        distribution: "core",
        priority: 50,
        markClasses: ["pixel"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    }
    expect(registry.register(z)).toEqual({ ok: true })
    expect(registry.register(m)).toEqual({ ok: true })
    const result = plan(registry, { kind: "text", context: inspectCtx })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.packs.map((p) => p.manifest.id)).toEqual(["m", "z"])
    }
  })

  it("encoded inspect response has protocolVersion 1.0.0", () => {
    const encoded = Schema.encodeUnknownSync(SidecarInspectResponse)({
      protocolVersion: sidecarProtocolVersion,
      ok: true,
      packId: "anthropies.layer-a",
      artifact: {
        bytes: new TextEncoder().encode("owned output"),
        kind: "text",
        digest: "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
      },
      findings: []
    })
    expect(encoded.protocolVersion).toBe("1.0.0")
  })

  it("optional absent pack does not fail layer-a transform", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    const optional: CapabilityPack = {
      manifest: decodeManifest({ ...baseInput, id: "anthropies.optional-absent" }),
      probe: () =>
        Effect.succeed(new Availability({ status: "unavailable", reason: "optional-absent" })),
      inspect: () => Effect.succeed([]),
      transform: () =>
        Effect.fail(
          new CapabilityFailure({
            code: "unavailable",
            packId: "anthropies.optional-absent",
            reason: "optional-absent"
          })
        )
    }
    expect(registry.register(optional)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const result = await Effect.runPromise(transformArtifact(registry, artifact, removeCtx))
    expect(result.artifact.digest.length).toBe(64)
  })

  it("required unavailable pack fails inspect", async () => {
    const registry = createRegistry()
    const required: CapabilityPack = {
      manifest: decodeManifest({
        ...baseInput,
        id: "anthropies.required-absent",
        distribution: "core"
      }),
      probe: () =>
        Effect.succeed(new Availability({ status: "unavailable", reason: "optional-absent" })),
      inspect: () => Effect.succeed([])
    }
    expect(registry.register(required)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const exit = await Effect.runPromiseExit(inspectArtifact(registry, artifact, inspectCtx))
    expect(exit._tag).toBe("Failure")
  })

  it("score on a transform finding is rejected", () => {
    const bytes = "b3duZWQgb3V0cHV0"
    const digest = "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
    expect(() =>
      Schema.decodeUnknownSync(SidecarTransformResponse)({
        protocolVersion: "1.0.0",
        ok: true,
        packId: "anthropies.layer-a",
        artifact: { bytes, kind: "text", digest },
        removals: [{ score: 1 }]
      })
    ).toThrow()
  })

  it("before self is conflict", () => {
    const registry = createRegistry()
    const pack: CapabilityPack = {
      manifest: decodeManifest({
        ...baseInput,
        id: "loop",
        distribution: "core",
        ordering: { before: ["loop"] }
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    }
    expect(registry.register(pack)).toEqual({ ok: true })
    expect(plan(registry, { kind: "text", context: inspectCtx })).toEqual({
      ok: false,
      code: "conflict"
    })
  })
})
