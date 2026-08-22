import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { zipMembers } from "../src/formats/zip.js"
import { xlsxPack } from "../src/packs/xlsx.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

const sampleXlsx = (): Uint8Array =>
  zipMembers([
    { name: "[Content_Types].xml", data: enc(`<Types></Types>`) },
    { name: "xl/workbook.xml", data: enc(`<workbook></workbook>`) },
    {
      name: "docProps/core.xml",
      data: enc(`<cp:coreProperties><dc:creator>Claude</dc:creator></cp:coreProperties>`)
    },
    {
      name: "docProps/app.xml",
      data: enc(`<Properties><Application>Microsoft Excel</Application></Properties>`)
    }
  ])

describe("packs_xlsx", () => {
  it("xlsx source imports ooxml helpers", () => {
    const src = readFileSync(new URL("../src/packs/xlsx.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/(xlsx|ooxml)\.js"/)
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
  })

  it("xlsx generator metadata is present", async () => {
    const findings = await Effect.runPromise(
      xlsxPack.inspect(makeArtifact(sampleXlsx(), "xlsx", { name: "owned.xlsx" }), inspectCtx)
    )
    expect(xlsxPack.manifest.id).toBe("anthropies.xlsx")
    expect(xlsxPack.manifest.artifactKinds).toEqual(["xlsx"])
    expect(xlsxPack.manifest.markClasses).toEqual(["provenance-metadata"])
    expect(xlsxPack.manifest.channel).toBe("c2pa")
    expect(xlsxPack.manifest.operations).toEqual(["inspect", "remove"])
    expect(xlsxPack.manifest.distribution).toBe("core")
    expect(xlsxPack.manifest.license).toBe("apache-2.0")
    expect(xlsxPack.manifest.runtime).toBe("native-ts")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )
  })

  it("Phase B pack tests reject score", () => {
    for (const file of ["xlsx.ts"]) {
      const packSrc = readFileSync(new URL(`../src/packs/${file}`, import.meta.url), "utf8")
      expect(packSrc).not.toMatch(/score|watermarkScore/)
    }
    for (const file of ["ooxml.ts", "xlsx.ts"]) {
      const formatSrc = readFileSync(new URL(`../src/formats/${file}`, import.meta.url), "utf8")
      expect(formatSrc).not.toMatch(/score|watermarkScore/)
    }
  })
})
