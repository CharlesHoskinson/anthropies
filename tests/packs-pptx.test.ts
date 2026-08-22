import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { decodeXml } from "../src/formats/ooxml.js"
import { unzipCapped, zipExpansionCapBytes, zipMembers } from "../src/formats/zip.js"
import { pptxPack } from "../src/packs/pptx.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const transformCtx = {
  operation: "remove" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

const samplePptx = (): Uint8Array =>
  zipMembers([
    { name: "[Content_Types].xml", data: enc(`<Types></Types>`) },
    { name: "ppt/presentation.xml", data: enc(`<p:presentation></p:presentation>`) },
    {
      name: "docProps/core.xml",
      data: enc(`<cp:coreProperties><dc:creator>Claude</dc:creator></cp:coreProperties>`)
    },
    {
      name: "docProps/app.xml",
      data: enc(`<Properties><Application>Microsoft PowerPoint</Application></Properties>`)
    }
  ])

describe("packs_pptx", () => {
  it("pptx source imports ooxml helpers", () => {
    const src = readFileSync(new URL("../src/packs/pptx.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/(pptx|ooxml)\.js"/)
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
  })

  it("pptx clean clears docProps fields", async () => {
    const input = samplePptx()
    const findings = await Effect.runPromise(
      pptxPack.inspect(makeArtifact(input, "pptx", { name: "owned.pptx" }), inspectCtx)
    )
    expect(pptxPack.manifest.id).toBe("anthropies.pptx")
    expect(pptxPack.manifest.artifactKinds).toEqual(["pptx"])
    expect(pptxPack.manifest.markClasses).toEqual(["provenance-metadata"])
    expect(pptxPack.manifest.channel).toBe("c2pa")
    expect(pptxPack.manifest.operations).toEqual(["inspect", "remove"])
    expect(pptxPack.manifest.distribution).toBe("core")
    expect(pptxPack.manifest.license).toBe("apache-2.0")
    expect(pptxPack.manifest.runtime).toBe("native-ts")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )

    const result = await Effect.runPromise(
      pptxPack.transform(makeArtifact(input, "pptx", { name: "owned.pptx" }), transformCtx)
    )
    const unzipped = unzipCapped(result.artifact.bytes, "owned.pptx", zipExpansionCapBytes)
    expect(unzipped.ok).toBe(true)
    if (!unzipped.ok) {
      return
    }
    const core = unzipped.members.find((m) => m.name === "docProps/core.xml")
    expect(core).toBeDefined()
    const coreXml = decodeXml(core!.data)
    expect(coreXml).not.toMatch(/<dc:creator\b[^>]*>.+?<\/dc:creator>/iu)
    expect(coreXml).toMatch(/<dc:creator\b[^>]*><\/dc:creator>/iu)

    expect(result.removals.some((r) => r.markClass === "provenance-metadata")).toBe(true)
  })

  it("Phase B pack tests reject score", () => {
    for (const file of ["pptx.ts"]) {
      const packSrc = readFileSync(new URL(`../src/packs/${file}`, import.meta.url), "utf8")
      expect(packSrc).not.toMatch(/score|watermarkScore/)
    }
    for (const file of ["ooxml.ts", "pptx.ts"]) {
      const formatSrc = readFileSync(new URL(`../src/formats/${file}`, import.meta.url), "utf8")
      expect(formatSrc).not.toMatch(/score|watermarkScore/)
    }
  })
})
