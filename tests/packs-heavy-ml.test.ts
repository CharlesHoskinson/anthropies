import { HttpClient } from "@effect/platform"
import { NodeContext, NodeHttpServer } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer } from "effect"
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { makeArtifact } from "../src/core/domain.js"
import { inspectArtifact, transformArtifact } from "../src/core/pipeline.js"
import { createRegistry } from "../src/core/registry.js"
import { HttpApp } from "../src/http/server.js"
import { ctrlRegenPack } from "../src/packs/ctrlregen.js"
import { layerAPack } from "../src/packs/layer-a.js"
import { markDiffusionPack } from "../src/packs/markdiffusion.js"
import { markllmPack } from "../src/packs/markllm.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

const srcRoot = fileURLToPath(new URL("../src", import.meta.url))
const dockerPath = fileURLToPath(new URL("../Dockerfile", import.meta.url))

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

const HealthLive = HttpApp.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(Layer.setConfigProvider(ConfigProvider.fromMap(new Map())))
)

const writeMarkllmFixture = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "markllm-"))
  writeFileSync(
    join(dir, "watermark_detect.mjs"),
    [
      "let input = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => { input += chunk; });",
      "process.stdin.on('end', () => {",
      "  const pin = process.argv.includes('--pin')",
      "    ? process.argv[process.argv.indexOf('--pin') + 1]",
      "    : '';",
      "  if (!pin) { process.stderr.write('missing pin'); process.exit(2); }",
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

describe("packs_heavy_ml", () => {
  it("MarkLLM source names the Apache pin", () => {
    const src = readFileSync(new URL("../src/packs/markllm.ts", import.meta.url), "utf8")
    expect(src).toMatch(/THU-BPM\/MarkLLM/)
    expect(src).toMatch(/Apache-2\.0/)
    expect(src).toMatch(/c45ddc40f7b761beabe55a1b8dc4690e531d1c6d/)
    expect(src).toMatch(/APACHE_NOTICE/)
    expect(src).toMatch(/ProcCommand\.make/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("MarkDiffusion source names the Apache pin", () => {
    const src = readFileSync(new URL("../src/packs/markdiffusion.ts", import.meta.url), "utf8")
    expect(src).toMatch(/THU-BPM\/MarkDiffusion/)
    expect(src).toMatch(/Apache-2\.0/)
    expect(src).toMatch(/9d81656d1a5f9e5194fc2f727bb795ef29e53809/)
    expect(src).toMatch(/APACHE_NOTICE/)
    expect(src).toMatch(/ProcCommand\.make/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("CtrlRegen-method source excludes unlicensed trees", () => {
    const rels = walkRel(srcRoot)
    for (const rel of rels) {
      expect(rel).not.toMatch(/yepengliu\/CtrlRegen/)
      expect(rel).not.toMatch(/mertizci\/noai-watermark/)
      const src = readFileSync(join(srcRoot, rel), "utf8")
      expect(src).not.toMatch(/from ["'].*yepengliu\/CtrlRegen/)
      expect(src).not.toMatch(/from ["'].*mertizci\/noai-watermark/)
    }
  })

  it("core image inventory excludes unlicensed CtrlRegen trees", () => {
    const rels = walkRel(srcRoot)
    for (const rel of rels) {
      expect(rel).not.toMatch(/\.py$/)
      expect(rel).not.toMatch(/yepengliu\/CtrlRegen/)
      expect(rel).not.toMatch(/mertizci\/noai-watermark/)
    }
    const docker = readFileSync(dockerPath, "utf8")
    expect(docker).toMatch(/COPY src \.\/src/)
    const copyLines = docker.split("\n").filter((line) => /^\s*COPY\b/.test(line))
    expect(copyLines.some((line) => /COPY src \.\/src/.test(line))).toBe(true)
    for (const line of copyLines) {
      expect(line).not.toMatch(/yepengliu\/CtrlRegen/)
      expect(line).not.toMatch(/mertizci\/noai-watermark/)
    }
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
    expect(findings[0]?.evidence.versionFingerprint).toBe("kgw:config=test")
    expect(JSON.stringify(findings)).not.toMatch(/Anthropic|Gemini/)
  })

  it("optional MarkLLM absent does not fail layer-a inspect", async () => {
    const registry = createRegistry()
    expect(registry.register(layerAPack)).toEqual({ ok: true })
    expect(registry.register(markllmPack)).toEqual({ ok: true })
    expect(registry.register(ctrlRegenPack)).toEqual({ ok: true })
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(
      inspectArtifact(registry, artifact, inspectCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(findings.some((f) => f.packId === "anthropies.layer-a")).toBe(true)
    expect(findings.some((f) => f.packId === "anthropies.markllm")).toBe(false)
    const transformed = await Effect.runPromise(
      transformArtifact(registry, artifact, removeCtx).pipe(
        Effect.provide(NodeContext.layer),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    )
    expect(transformed).toBeDefined()
    expect(
      transformed.residualFindings.some((f) => f.packId === "anthropies.ctrlregen")
    ).toBe(false)
  })

  it("Sprint 6 pack tests reject score", () => {
    for (const file of ["markllm.ts", "markdiffusion.ts", "ctrlregen.ts"]) {
      const src = readFileSync(new URL(`../src/packs/${file}`, import.meta.url), "utf8")
      expect(src).not.toMatch(/score|watermarkScore/)
    }
  })

  it.scoped("health stays 0.3.0 after Sprint 6", () =>
    Effect.gen(function* () {
      const res = yield* HttpClient.get("/health")
      expect(res.status).toBe(200)
      expect(yield* res.json).toEqual({ ok: true, version: "0.3.0" })
      expect(markllmPack.manifest.distribution).toBe("optional")
      expect(markDiffusionPack.manifest.distribution).toBe("optional")
      expect(ctrlRegenPack.manifest.distribution).toBe("optional")
    }).pipe(Effect.provide(HealthLive))
  )

  it("CtrlRegen-method inspect reads artifact bytes", async () => {
    const a = makeArtifact(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), "raster")
    const b = makeArtifact(new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]), "raster")
    const provider = ConfigProvider.fromMap(new Map([["CTRLREGEN_WEIGHTS", "dummy"]]))
    const fa = await Effect.runPromise(
      ctrlRegenPack.inspect(a, inspectCtx).pipe(Effect.withConfigProvider(provider))
    )
    const fb = await Effect.runPromise(
      ctrlRegenPack.inspect(b, inspectCtx).pipe(Effect.withConfigProvider(provider))
    )
    expect(fa[0]?.evidence.versionFingerprint).toBe("ctrlregen-method:config=residual-v1")
    expect(fb[0]?.evidence.versionFingerprint).toBe("ctrlregen-method:config=residual-v1")
    expect(fa[0]?.evidence.rawReference).toBe(a.digest)
    expect(fb[0]?.evidence.rawReference).toBe(b.digest)
    expect(fa[0]?.evidence.rawReference).not.toBe(fb[0]?.evidence.rawReference)
  })

  it("MarkDiffusion inspect feeds base64 raster", async () => {
    const dir = mkdtempSync(join(tmpdir(), "markdiffusion-"))
    writeFileSync(
      join(dir, "watermark_detect.mjs"),
      [
        "let input = '';",
        "process.stdin.setEncoding('utf8');",
        "process.stdin.on('data', (chunk) => { input += chunk; });",
        "process.stdin.on('end', () => {",
        "  const pin = process.argv.includes('--pin')",
        "    ? process.argv[process.argv.indexOf('--pin') + 1]",
        "    : '';",
        "  if (!pin) { process.stderr.write('missing pin'); process.exit(2); }",
        "  process.stdout.write(JSON.stringify({",
        "    algorithm: 'kgw',",
        "    configuration: input.length === 4 ? 'test' : `len=${input.length}`,",
        "    status: 'indeterminate'",
        "  }));",
        "});"
      ].join("\n"),
      "utf8"
    )
    const findings = await Effect.runPromise(
      markDiffusionPack
        .inspect(makeArtifact(new Uint8Array([0xff, 0x00, 0x89]), "raster"), inspectCtx)
        .pipe(
          Effect.provide(NodeContext.layer),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ["MARKDIFFUSION_DIR", dir],
                ["MARKDIFFUSION_RUNNER", process.execPath]
              ])
            )
          )
        )
    )
    expect(findings[0]?.evidence.versionFingerprint).toBe("kgw:config=test")
  })
})
