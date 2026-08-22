import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { builtinRegistry } from "../src/core/builtin-registry.js"
import { makeArtifact } from "../src/core/domain.js"
import { c2paPack } from "../src/packs/c2pa.js"
import { svgStripPack } from "../src/packs/svg-strip.js"

const removeCtx = {
  operation: "remove" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const inspectCtx = { ...removeCtx, operation: "inspect" as const }

const plantedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <metadata>c2pa planted</metadata>
  <text x="1" y="8">ok</text>
</svg>
`

describe("packs_svg_strip", () => {
  it("svg strip source imports cleanSvgText", () => {
    const src = readFileSync(new URL("../src/packs/svg-strip.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/svg\.js"/)
    expect(src).toMatch(/cleanSvgText/)
    expect(src).not.toMatch(/inspectSvgText/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("svg strip operations are remove only", () => {
    expect(svgStripPack.manifest.id).toBe("anthropies.svg-strip")
    expect(svgStripPack.manifest.operations).toEqual(["remove"])
    expect(svgStripPack.manifest.artifactKinds).toEqual(["svg"])
    expect(svgStripPack.manifest.markClasses).toEqual(["provenance-metadata"])
  })

  it("transform strips planted svg metadata via cleanSvgText", async () => {
    const transform = svgStripPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(new TextEncoder().encode(plantedSvg), "svg", {
      name: "owned.svg"
    })
    const result = await Effect.runPromise(transform!(artifact, removeCtx))
    const text = new TextDecoder("utf-8").decode(result.artifact.bytes)
    expect(text).toMatch(/<svg/)
    expect(text).not.toMatch(/<metadata/i)
    expect(result.remediation).toBe("changed")
    expect(result.removals.some((r) => r.markClass === "provenance-metadata")).toBe(true)
    expect(result.removals.some((r) => "score" in r || "watermarkScore" in r)).toBe(false)
    expect(result.residualFindings).toEqual([])
  })

  it("inspect returns empty and does not claim svg provenance-metadata", async () => {
    const findings = await Effect.runPromise(
      svgStripPack.inspect(makeArtifact(new TextEncoder().encode(plantedSvg), "svg"), inspectCtx)
    )
    expect(findings).toEqual([])
  })

  it("builtin registry registers svg-strip without conflicting with c2pa inspect", () => {
    const registry = builtinRegistry()
    const ids = registry.list().map((p) => p.manifest.id)
    expect(ids).toContain("anthropies.svg-strip")
    expect(ids).toContain("anthropies.c2pa")
    const inspectOwner = registry.ownerFor({
      artifactKind: "svg",
      markClass: "provenance-metadata",
      operation: "inspect"
    })
    expect(inspectOwner).toEqual({ ok: true, owner: c2paPack.manifest })
    const removeOwner = registry.ownerFor({
      artifactKind: "svg",
      markClass: "provenance-metadata",
      operation: "remove"
    })
    expect(removeOwner).toEqual({ ok: true, owner: svgStripPack.manifest })
  })
})
