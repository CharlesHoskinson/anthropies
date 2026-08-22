import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { applyLayerA } from "../src/layer-a.js"
import { c2paPack } from "../src/packs/c2pa.js"
import { layerAPack } from "../src/packs/layer-a.js"
import { pdfPack } from "../src/packs/pdf.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

const trailer = "hello\nCo-Authored-By: Claude <noreply@anthropic.com>\n"
const zwsp = "hel\u200Blo"
const banner = "Generated with Claude Code\nhello\n"

describe("packs_builtin", () => {
  it("layer-a manifest is anthropies.layer-a without zip kinds", () => {
    expect(layerAPack.manifest.id).toBe("anthropies.layer-a")
    expect(layerAPack.manifest.channel).toBe("deterministic")
    expect(layerAPack.manifest.operations).toEqual(["inspect", "remove"])
    expect(layerAPack.manifest.artifactKinds).toEqual(["text", "svg", "html", "md"])
  })

  it("inspects an agent trailer as present", async () => {
    const artifact = makeArtifact(new TextEncoder().encode(trailer), "text")
    const findings = await Effect.runPromise(layerAPack.inspect(artifact, inspectCtx))
    const trailerFinding = findings.find((f) => f.markClass === "agent-trailer")
    expect(trailerFinding?.status).toBe("present")
    expect(trailerFinding?.packId).toBe("anthropies.layer-a")
  })

  it("inspects unicode and banner as present", async () => {
    const u = await Effect.runPromise(
      layerAPack.inspect(makeArtifact(new TextEncoder().encode(zwsp), "text"), inspectCtx)
    )
    expect(u.find((f) => f.markClass === "invisible-unicode")?.status).toBe("present")
    const b = await Effect.runPromise(
      layerAPack.inspect(makeArtifact(new TextEncoder().encode(banner), "text"), inspectCtx)
    )
    expect(b.find((f) => f.markClass === "generated-banner")?.status).toBe("present")
  })

  it("inspects clean text as absent", async () => {
    const artifact = makeArtifact(new TextEncoder().encode("hello"), "text")
    const findings = await Effect.runPromise(layerAPack.inspect(artifact, inspectCtx))
    expect(findings.map((f) => f.status)).toEqual(["absent", "absent", "absent"])
  })

  it("transform removes the trailer on text", async () => {
    const transform = layerAPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(new TextEncoder().encode(trailer), "text")
    const result = await Effect.runPromise(transform!(artifact, removeCtx))
    const text = new TextDecoder().decode(result.artifact.bytes)
    expect(text).not.toMatch(/Co-Authored-By/)
    expect(result.remediation).toBe("changed")
  })

  it("transform bytes match applyLayerA text", async () => {
    const transform = layerAPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(new TextEncoder().encode(trailer), "text")
    const result = await Effect.runPromise(transform!(artifact, removeCtx))
    const expected = new TextEncoder().encode(applyLayerA(trailer).text)
    expect(Array.from(result.artifact.bytes)).toEqual(Array.from(expected))
  })

  it("transform leaves non-text unchanged", async () => {
    const transform = layerAPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(new TextEncoder().encode("<svg/>"), "svg")
    const result = await Effect.runPromise(transform!(artifact, removeCtx))
    expect(result.remediation).toBe("unchanged")
    expect(result.artifact.digest).toBe(artifact.digest)
  })

  it("wrappers import existing functions", () => {
    const layerSrc = readFileSync("src/packs/layer-a.ts", "utf8")
    expect(layerSrc).toMatch(/from "\.\.\/layer-a\.js"/)
    expect(layerSrc).toMatch(/applyLayerA/)
    const c2paSrc = readFileSync("src/packs/c2pa.ts", "utf8")
    expect(c2paSrc).toMatch(/from "\.\.\/formats\/raster\.js"/)
    expect(c2paSrc).toMatch(/from "\.\.\/formats\/svg\.js"/)
    expect(c2paSrc).toMatch(/inspectRasterBytes/)
    expect(c2paSrc).toMatch(/inspectSvgText/)
    const pdfSrc = readFileSync("src/packs/pdf.ts", "utf8")
    expect(pdfSrc).toMatch(/from "\.\.\/formats\/pdf\.js"/)
    expect(pdfSrc).toMatch(/inspectPdfBytes/)
  })

  it("c2pa and pdf packs export ids", () => {
    expect(c2paPack.manifest.id).toBe("anthropies.c2pa")
    expect(pdfPack.manifest.id).toBe("anthropies.pdf")
  })
})
