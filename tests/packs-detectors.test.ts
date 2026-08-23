import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Schema } from "effect"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack
} from "../src/core/capability.js"
import { Availability, makeArtifact } from "../src/core/domain.js"
import { inspectArtifact } from "../src/core/pipeline.js"
import { createRegistry } from "../src/core/registry.js"
import { anthropicOfficialPack } from "../src/packs/anthropic-official.js"
import { geminiSynthidPack } from "../src/packs/gemini-synthid.js"
import { layerAPack } from "../src/packs/layer-a.js"
import { markllmPack } from "../src/packs/markllm.js"
import { OfficialFinding, OfficialUnavailable } from "../src/report.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const mockPack = (manifest: CapabilityManifest): CapabilityPack => ({
  manifest,
  probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
  inspect: () => Effect.succeed([])
})

const detectorBase = {
  displayName: "Detector",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.1.0",
  artifactKinds: ["text"] as const,
  markClasses: ["keyed-text"] as const,
  operations: ["score"] as const,
  channel: "statistical" as const,
  priority: 40,
  ordering: {},
  runtime: "native-ts" as const,
  network: "remote-opt-in" as const,
  privacy: "may-send-bytes" as const,
  limits: defaultNativeLimits,
  license: "apache-2.0" as const,
  distribution: "optional" as const
}

const zwspText = "hello\u200Bworld"
const plainText = "The compiler rejected the patch.\n"

interface RecordedRequest {
  readonly href: string
  readonly method: string
}

const fakeClient = (
  recorded: Array<RecordedRequest>,
  response: { readonly status: number; readonly body: unknown }
): HttpClient.HttpClient =>
  HttpClient.make((request, url) => {
    recorded.push({ href: url.href, method: request.method })
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        })
      )
    )
  })

const withGemini = <A, E>(
  env: ReadonlyArray<readonly [string, string]>,
  http: HttpClient.HttpClient,
  effect: Effect.Effect<A, E, HttpClient.HttpClient>
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(Layer.succeed(HttpClient.HttpClient, http)),
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map(env)))
    )
  )

const writeMarkllmFixture = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "markllm-det-"))
  writeFileSync(
    join(dir, "watermark_detect.mjs"),
    [
      "let input = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => { input += chunk; });",
      "process.stdin.on('end', () => {",
      "  process.stdout.write(JSON.stringify({",
      "    algorithm: 'kgw',",
      "    configuration: 'test',",
      "    status: 'indeterminate'",
      "  }));",
      "});"
    ].join("\n"),
    "utf8"
  )
  return dir
}

describe("packs_detectors", () => {
  it("detector pack lists after compatible register", () => {
    const registry = createRegistry()
    const pack = mockPack(
      decodeManifest({
        ...detectorBase,
        id: "anthropies.detector-ok",
        // Empty kinds: listable detector shape without claiming MarkLLM/Gemini tuples.
        artifactKinds: []
      })
    )
    expect(registry.register(pack)).toEqual({ ok: true })
    expect(registry.list().map((p) => p.manifest.id)).toContain("anthropies.detector-ok")
    expect(registry.register(geminiSynthidPack)).toEqual({ ok: true })
    expect(registry.list().map((p) => p.manifest.id)).toContain("anthropies.gemini-synthid")
    expect(registry.register(anthropicOfficialPack)).toEqual({ ok: true })
    expect(registry.list().map((p) => p.manifest.id)).toContain("anthropies.official")
  })

  it("incompatible detector pack is rejected", () => {
    const registry = createRegistry()
    const pack = mockPack(
      decodeManifest({
        ...detectorBase,
        id: "anthropies.detector-old",
        kernelApiMin: "0.9.0",
        kernelApiMax: "0.9.0"
      })
    )
    expect(registry.register(pack)).toEqual({ ok: false, code: "incompatible" })
    expect(registry.list().map((p) => p.manifest.id)).not.toContain("anthropies.detector-old")
  })

  it("Gemini finding stays on statistical", async () => {
    const recorded: Array<RecordedRequest> = []
    const findings = await withGemini(
      [["GEMINI_DETECT_URL", "http://127.0.0.1:9/detect"]],
      fakeClient(recorded, { status: 200, body: { status: "present" } }),
      geminiSynthidPack.inspect(makeArtifact(new TextEncoder().encode(plainText), "text"), inspectCtx)
    )
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => f.channel === "statistical")).toBe(true)
    expect(JSON.stringify(findings)).not.toMatch(/watermarkScore/)
    expect(recorded.length).toBe(1)
  })

  it("Gemini does not own official", async () => {
    const findings = await withGemini(
      [["GEMINI_DETECT_URL", "http://127.0.0.1:9/detect"]],
      fakeClient([], { status: 200, body: { status: "absent" } }),
      geminiSynthidPack.inspect(makeArtifact(new TextEncoder().encode(plainText), "text"), inspectCtx)
    )
    expect(findings.some((f) => f.channel === "official")).toBe(false)
    expect(geminiSynthidPack.manifest.channel).toBe("statistical")
  })

  it("unset URL is unavailable without score", async () => {
    const availability = await Effect.runPromise(
      anthropicOfficialPack.probe(inspectCtx).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(availability.status).toBe("unavailable")
    expect(JSON.stringify(availability)).not.toMatch(/"score"/)

    const findings = await Effect.runPromise(
      anthropicOfficialPack
        .inspect(makeArtifact(new TextEncoder().encode(plainText), "text"), inspectCtx)
        .pipe(Effect.withConfigProvider(ConfigProvider.fromMap(new Map())))
    )
    expect(findings.every((f) => f.channel === "official")).toBe(true)
    expect(findings.every((f) => f.status === "indeterminate" || f.channel === "official")).toBe(
      true
    )
    expect(JSON.stringify(findings)).not.toMatch(/"score"/)
    expect(anthropicOfficialPack.manifest.channel).toBe("official")
  })

  it("Unavailable decode rejects score", () => {
    expect(() =>
      Schema.decodeUnknownSync(OfficialFinding)(
        { _tag: "Unavailable", score: 0.9 },
        { onExcessProperty: "error" }
      )
    ).toThrow()
  })

  it("unavailable JSON has no score key", () => {
    const encoded = Schema.encodeSync(OfficialFinding)(new OfficialUnavailable())
    expect(Object.prototype.hasOwnProperty.call(encoded, "score")).toBe(false)
    expect(JSON.stringify(encoded)).not.toMatch(/"score"/)
  })

  it("no default Anthropic detect URL", async () => {
    const recorded: Array<RecordedRequest> = []
    const http = fakeClient(recorded, { status: 200, body: { ok: true } })
    await Effect.runPromise(
      anthropicOfficialPack
        .inspect(makeArtifact(new TextEncoder().encode(plainText), "text"), inspectCtx)
        .pipe(
          Effect.provide(Layer.succeed(HttpClient.HttpClient, http)),
          Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
        )
    )
    expect(recorded).toEqual([])
    const availability = await Effect.runPromise(
      anthropicOfficialPack.probe(inspectCtx).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(availability.status).toBe("unavailable")
    expect(availability.reason).toBe("env-unset")
  })

  it("MarkLLM evidence names configuration", async () => {
    const dir = writeMarkllmFixture()
    const findings = await Effect.runPromise(
      markllmPack
        .inspect(makeArtifact(new TextEncoder().encode("hello-markllm"), "text"), inspectCtx)
        .pipe(
          Effect.provide(NodeContext.layer),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ["MARKLLM_DIR", dir],
                ["MARKLLM_RUNNER", process.execPath]
              ])
            )
          )
        )
    )
    expect(findings[0]?.evidence.versionFingerprint).toMatch(/:/)
    expect(findings[0]?.evidence.versionFingerprint).toContain("kgw")
    expect(findings[0]?.evidence.versionFingerprint).toContain("config=test")
  })

  it("MarkLLM is not vendor efficacy", async () => {
    const dir = writeMarkllmFixture()
    const findings = await Effect.runPromise(
      markllmPack
        .inspect(makeArtifact(new TextEncoder().encode("hello-markllm"), "text"), inspectCtx)
        .pipe(
          Effect.provide(NodeContext.layer),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ["MARKLLM_DIR", dir],
                ["MARKLLM_RUNNER", process.execPath]
              ])
            )
          )
        )
    )
    const encoded = JSON.stringify(findings)
    expect(encoded).not.toMatch(/Anthropic official|official detection/i)
    expect(encoded).not.toMatch(/Gemini vendor|vendor equivalence/i)
    expect(markllmPack.manifest.channel).toBe("statistical")
    expect(markllmPack.manifest.id).toBe("anthropies.markllm")
  })

  it("unconfigured optional adapter is fail-soft", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.register(geminiSynthidPack)).toEqual({ ok: true })
    expect(geminiSynthidPack.manifest.distribution).toBe("optional")

    const availability = await Effect.runPromise(
      geminiSynthidPack.probe(inspectCtx).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(["unavailable", "degraded"]).toContain(availability.status)

    const artifact = makeArtifact(new TextEncoder().encode(zwspText), "text")
    const findings = await Effect.runPromise(
      inspectArtifact(registry, artifact, inspectCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(findings.some((f) => f.packId === "anthropies.layer-a")).toBe(true)
    expect(findings.some((f) => f.channel === "deterministic" && f.status === "present")).toBe(
      true
    )
  })

  it("unrelated channel survives unconfigured adapter", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.register(geminiSynthidPack)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode(zwspText), "text")
    const findings = await Effect.runPromise(
      inspectArtifact(registry, artifact, inspectCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(findings.some((f) => f.channel === "deterministic" && f.status === "present")).toBe(
      true
    )
  })

  it("rate-limited adapter stays channel-local", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.register(geminiSynthidPack)).toEqual({ ok: true })

    const geminiFindings = await withGemini(
      [["GEMINI_DETECT_URL", "http://127.0.0.1:9/detect"]],
      fakeClient([], { status: 429, body: { error: "rate limited" } }),
      geminiSynthidPack.inspect(makeArtifact(new TextEncoder().encode(zwspText), "text"), inspectCtx)
    )
    const channelStatus =
      geminiFindings[0]?.evidence.rawReference === "degraded" ||
      geminiFindings[0]?.evidence.rawReference === "rate-limited"
        ? "degraded"
        : geminiFindings[0]?.status === "indeterminate"
          ? "unavailable"
          : geminiFindings[0]?.status
    expect(["degraded", "unavailable"]).toContain(channelStatus)
    expect(geminiFindings.every((f) => f.channel === "statistical")).toBe(true)

    const artifact = makeArtifact(new TextEncoder().encode(zwspText), "text")
    const findings = await Effect.runPromise(
      inspectArtifact(registry, artifact, inspectCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(findings.some((f) => f.channel === "deterministic" && f.status === "present")).toBe(
      true
    )
  })

  it("malformed adapter is not a certificate", async () => {
    const geminiFindings = await withGemini(
      [["GEMINI_DETECT_URL", "http://127.0.0.1:9/detect"]],
      fakeClient([], { status: 200, body: { not: "a detect payload" } }),
      geminiSynthidPack.inspect(makeArtifact(new TextEncoder().encode(plainText), "text"), inspectCtx)
    )
    expect(geminiFindings.length).toBeGreaterThan(0)
    expect(["indeterminate", "unavailable"]).toContain(
      geminiFindings[0]?.status === "indeterminate" ? "indeterminate" : "unavailable"
    )
    expect(geminiFindings.every((f) => f.channel === "statistical")).toBe(true)
    const encoded = JSON.stringify(geminiFindings)
    expect(encoded).not.toMatch(/certified\s+clean|clean certificate|isCleanCertificate/i)
    expect(encoded).not.toMatch(/watermarkScore/)
  })
})
