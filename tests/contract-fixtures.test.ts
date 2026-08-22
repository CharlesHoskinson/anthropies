import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { readFileSync } from "node:fs"
import { builtinRegistry } from "../src/core/builtin-registry.js"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../src/core/capability.js"
import { CONTRACT_CASES } from "../src/core/contract-cases.js"
import {
  Availability,
  CapabilityFailure,
  makeArtifact,
  TransformResult
} from "../src/core/domain.js"
import { inspectArtifact, transformArtifact } from "../src/core/pipeline.js"
import { createRegistry } from "../src/core/registry.js"
import { inspectPdfBytes, PdfTools } from "../src/formats/pdf.js"
import { layerAPack } from "../src/packs/layer-a.js"
import { residualDrivesExit } from "../src/report.js"
import { Cleaner } from "../src/services/cleaner.js"
import { sidecarInspect } from "../src/sidecars/client.js"

const inspectCtx: RunContext = {
  operation: "inspect",
  forceText: false,
  json: true,
  requireCapability: [],
  kernelApiVersion: "1.0.0"
}

const removeCtx: RunContext = { ...inspectCtx, operation: "remove" }

const baseManifestInput = {
  displayName: "Contract fixture pack",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text"] as const,
  markClasses: ["keyed-text"] as const,
  operations: ["inspect"] as const,
  channel: "statistical" as const,
  priority: 10,
  ordering: {},
  runtime: "native-ts" as const,
  network: "none" as const,
  privacy: "local-only" as const,
  limits: defaultNativeLimits,
  license: "apache-2.0" as const,
  distribution: "optional" as const
}

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const optionalAbsentPack = (): CapabilityPack => ({
  manifest: decodeManifest({
    ...baseManifestInput,
    id: "anthropies.optional-absent"
  }),
  probe: () =>
    Effect.succeed(new Availability({ status: "unavailable", reason: "optional-absent" })),
  inspect: () => Effect.succeed([])
})

const sidecarArtifact = {
  bytes: "b3duZWQgb3V0cHV0",
  kind: "text" as const,
  digest: "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
}

const inspectOk = JSON.parse(
  readFileSync("fixtures/sidecars/v1/inspect-ok.json", "utf8")
) as unknown

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })

const failureOf = async (
  effect: ReturnType<typeof sidecarInspect>
): Promise<{ code: string; reason: string; packId: string }> => {
  const exit = await Effect.runPromiseExit(effect)
  if (exit._tag !== "Failure") {
    throw new Error("expected failure")
  }
  const err = exit.cause
  const dump = JSON.stringify(err)
  const match = dump.match(/"code":"([^"]+)".*"reason":"([^"]+)".*"packId":"([^"]+)"/s)
  if (match) {
    return { code: match[1]!, reason: match[2]!, packId: match[3]! }
  }
  const schemaOrder = dump.match(/"code":"([^"]+)".*"packId":"([^"]+)".*"reason":"([^"]+)"/s)
  if (schemaOrder) {
    return { code: schemaOrder[1]!, packId: schemaOrder[2]!, reason: schemaOrder[3]! }
  }
  const fail = (
    err as { failures?: ReadonlyArray<{ error?: { code: string; reason: string; packId: string } }> }
  ).failures?.[0]?.error
  if (fail?.code !== undefined) {
    return fail
  }
  throw new Error(`unrecognized failure ${dump.slice(0, 400)}`)
}

const MIN_PDF = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
)

const missingTools = Layer.succeed(
  PdfTools,
  PdfTools.of({
    inspect: (bytes: Uint8Array) =>
      Effect.succeed({
        present: inspectPdfBytes(bytes).present,
        labels: ["missing:exiftool", "missing:qpdf"],
        degraded: true
      }),
    strip: (bytes: Uint8Array) =>
      Effect.succeed({
        bytes,
        removed: false,
        labels: ["missing:exiftool", "missing:qpdf"],
        degraded: true
      })
  })
)

const cleanerLayers = Effect.provide(
  Layer.mergeAll(Cleaner.Default.pipe(Layer.provide(missingTools)), NodeContext.layer)
)

describe("contract_fixtures", () => {
  it("covers every inventory case id", () => {
    expect(CONTRACT_CASES).toEqual([
      "available",
      "unavailable",
      "degraded",
      "incompatible",
      "timeout",
      "malformed-output",
      "conflicting-owner"
    ])
    expect(CONTRACT_CASES.length).toBeGreaterThan(0)
  })

  it("available pack probes ready", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    const availability = await Effect.runPromise(layerAPack.probe(inspectCtx))
    expect(availability.status).toBe("available")
    expect(availability.reason).toBe("ready")
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(inspectArtifact(registry, artifact, inspectCtx))
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => f.packId === "anthropies.layer-a")).toBe(true)
  })

  it("available pack does not report unavailable", async () => {
    const availability = await Effect.runPromise(layerAPack.probe(inspectCtx))
    expect(availability.status).not.toBe("unavailable")
    expect(availability.reason).not.toBe("optional-absent")
    const builtins = builtinRegistry()
    const packed = builtins.list().find((p) => p.manifest.id === "anthropies.layer-a")
    expect(packed).toBeDefined()
    const probe = await Effect.runPromise(packed!.probe(inspectCtx))
    expect(probe.status).toBe("available")
  })

  it("unavailable optional pack is fail-soft", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.register(optionalAbsentPack())).toEqual({ ok: true })
    const optional = registry.list().find((p) => p.manifest.id === "anthropies.optional-absent")
    expect(optional).toBeDefined()
    const probe = await Effect.runPromise(optional!.probe(inspectCtx))
    expect(probe.status).toBe("unavailable")
    expect(probe.reason).toBe("optional-absent")
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(inspectArtifact(registry, artifact, inspectCtx))
    expect(findings.map((f) => f.packId)).toContain("anthropies.layer-a")
    expect(findings.every((f) => f.status === "absent" || f.status === "present")).toBe(true)
  })

  it("unavailable optional pack does not block layer-a success", async () => {
    const registry = createRegistry()
    expect(registry.register(optionalAbsentPack())).toEqual({ ok: true })
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    const trailer = "hello\nCo-Authored-By: Claude <noreply@anthropic.com>\n"
    const artifact = makeArtifact(new TextEncoder().encode(trailer), "text")
    const findings = await Effect.runPromise(inspectArtifact(registry, artifact, inspectCtx))
    expect(findings.some((f) => f.markClass === "agent-trailer" && f.status === "present")).toBe(
      true
    )
  })

  it("incompatible kernel range is rejected", () => {
    const registry = createRegistry()
    const incompatible = {
      manifest: decodeManifest({
        ...baseManifestInput,
        id: "anthropies.too-old",
        kernelApiMin: "0.0.1",
        kernelApiMax: "0.0.1",
        distribution: "core",
        channel: "deterministic",
        markClasses: ["invisible-unicode"],
        operations: ["inspect", "remove"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    } satisfies CapabilityPack
    expect(registry.register(incompatible)).toEqual({ ok: false, code: "incompatible" })
    expect(registry.list()).toEqual([])
  })

  it("incompatible pack does not register as available", () => {
    const registry = createRegistry()
    const incompatible = {
      manifest: decodeManifest({
        ...baseManifestInput,
        id: "anthropies.too-old",
        kernelApiMin: "0.0.1",
        kernelApiMax: "0.0.1"
      }),
      probe: () =>
        Effect.succeed(new Availability({ status: "incompatible", reason: "kernel-mismatch" })),
      inspect: () => Effect.succeed([])
    } satisfies CapabilityPack
    expect(registry.register(incompatible).ok).toBe(false)
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.list().map((p) => p.manifest.id)).toEqual(["anthropies.layer-a"])
  })

  it("conflicting owner is rejected", () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    const duplicate = {
      manifest: decodeManifest({
        ...layerAPack.manifest,
        id: "anthropies.layer-a-dup",
        displayName: "Layer A dup"
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    } satisfies CapabilityPack
    expect(registry.register(duplicate)).toEqual({ ok: false, code: "conflict" })
    expect(registry.list().map((p) => p.manifest.id)).toEqual(["anthropies.layer-a"])
  })

  it("conflicting owner does not displace the first pack", () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    const duplicate = {
      manifest: decodeManifest({
        id: "anthropies.layer-a-dup",
        displayName: "Layer A dup",
        kernelApiMin: "1.0.0",
        kernelApiMax: "1.0.0",
        apiVersion: "1.0.0",
        implementationVersion: "0.4.0",
        artifactKinds: ["text"],
        markClasses: ["invisible-unicode"],
        operations: ["remove"],
        channel: "deterministic",
        priority: 50,
        ordering: {},
        runtime: "native-ts",
        network: "none",
        privacy: "local-only",
        limits: defaultNativeLimits,
        license: "apache-2.0",
        distribution: "core"
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([])
    } satisfies CapabilityPack
    expect(registry.register(duplicate)).toEqual({ ok: false, code: "conflict" })
    expect(
      registry.ownerFor({
        artifactKind: "text",
        markClass: "invisible-unicode",
        operation: "remove"
      })
    ).toEqual({ ok: true, owner: layerAPack.manifest })
  })

  it("timeout preserves original", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned-output"), "text")
    const pack = {
      manifest: decodeManifest({
        ...baseManifestInput,
        id: "anthropies.timeout-pack",
        distribution: "core",
        channel: "deterministic",
        markClasses: ["invisible-unicode"],
        operations: ["inspect", "remove"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () =>
        Effect.fail(
          new CapabilityFailure({
            code: "timeout",
            packId: "anthropies.timeout-pack",
            reason: "timeout"
          })
        )
    } satisfies CapabilityPack
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.artifact.digest).toBe(original.digest)
    expect(result.remediation).toBe("unchanged")
  })

  it("timeout does not return a transformed digest", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned-output"), "text")
    const dirty = makeArtifact(new TextEncoder().encode("dirty"), "text")
    expect(dirty.digest).not.toBe(original.digest)
    const pack = {
      manifest: decodeManifest({
        ...baseManifestInput,
        id: "anthropies.timeout-pack",
        distribution: "core",
        channel: "deterministic",
        markClasses: ["invisible-unicode"],
        operations: ["inspect", "remove"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () =>
        Effect.fail(
          new CapabilityFailure({
            code: "timeout",
            packId: "anthropies.timeout-pack",
            reason: "timeout"
          })
        )
    } satisfies CapabilityPack
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.artifact.digest).not.toBe(dirty.digest)
    expect(Array.from(result.artifact.bytes)).toEqual(Array.from(original.bytes))
  })

  it("malformed sidecar output is not certified", async () => {
    const fetch = async (): Promise<Response> =>
      new Response("not-json", { status: 200, headers: { "content-type": "application/json" } })
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, sidecarArtifact)
    )
    expect(fail.code).toBe("malformed-output")
    expect(fail.reason).toBe("malformed-output")
  })

  it("malformed sidecar output does not certify success", async () => {
    const fetch = async (): Promise<Response> =>
      new Response("{", { status: 200, headers: { "content-type": "application/json" } })
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, sidecarArtifact)
    )
    expect(fail.code).not.toBe("unavailable")
    expect(fail.code).toBe("malformed-output")
    const okFetch = async (): Promise<Response> => jsonResponse(inspectOk)
    const ok = await Effect.runPromise(
      sidecarInspect(
        { baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch: okFetch },
        sidecarArtifact
      )
    )
    expect(ok.ok).toBe(true)
  })

  it.scoped("degraded PDF cannot certify absence", () =>
    cleanerLayers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/plain.pdf`
        const dest = `${dir}/out.pdf`
        yield* fs.writeFile(src, MIN_PDF)
        const { report } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        expect(report.degraded).toBe(true)
        expect(report.findings.some((f) => f.channel === "c2pa" && f.status === "degraded")).toBe(
          true
        )
        expect(residualDrivesExit(report)).toBe(false)
        const honesty = report.honesty.join("\n")
        expect(honesty).not.toMatch(/^c2pa: degraded$/m)
      })
    )
  )

  it.scoped("degraded PDF does not treat missing tools as certified absent", () =>
    cleanerLayers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/plain.pdf`
        const dest = `${dir}/out.pdf`
        yield* fs.writeFile(src, MIN_PDF)
        const { report } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        expect(report.degraded).toBe(true)
        const c2pa = report.findings.find((f) => f.channel === "c2pa")
        expect(c2pa?.status).not.toBe("absent")
        expect(c2pa?.status).toBe("degraded")
      })
    )
  )

  it("available negative control is rejected", async () => {
    const optional = optionalAbsentPack()
    const probe = await Effect.runPromise(optional.probe(inspectCtx))
    expect(probe.status).toBe("unavailable")
    expect(probe.status).not.toBe("available")
  })

  it("timeout positive control transform is changed", async () => {
    const registry = createRegistry()
    const original = makeArtifact(new TextEncoder().encode("owned-output"), "text")
    const next = makeArtifact(new TextEncoder().encode("clean-output"), "text")
    const pack = {
      manifest: decodeManifest({
        ...baseManifestInput,
        id: "anthropies.timeout-success",
        distribution: "core",
        channel: "deterministic",
        markClasses: ["invisible-unicode"],
        operations: ["inspect", "remove"]
      }),
      probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
      inspect: () => Effect.succeed([]),
      transform: () =>
        Effect.succeed(
          new TransformResult({
            artifact: next,
            removals: [],
            evidence: { kind: "contract" },
            residualFindings: [],
            warnings: [],
            remediation: "changed"
          })
        )
    } satisfies CapabilityPack
    expect(registry.register(pack)).toEqual({ ok: true })
    const result = await Effect.runPromise(transformArtifact(registry, original, removeCtx))
    expect(result.remediation).toBe("changed")
    expect(result.artifact.digest).toBe(next.digest)
    expect(result.artifact.digest).not.toBe(original.digest)
  })

  it("degraded positive control layer-a is not degraded", async () => {
    const availability = await Effect.runPromise(layerAPack.probe(inspectCtx))
    expect(availability.status).toBe("available")
    expect(availability.status).not.toBe("degraded")
  })
})
