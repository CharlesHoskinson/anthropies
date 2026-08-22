import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { inspectPdfBytes, PdfTools } from "../src/formats/pdf.js"
import { pdfToolsPack } from "../src/packs/pdf-tools.js"
import { rasterStripPack } from "../src/packs/raster-strip.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

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
    strip: (bytes: Uint8Array, _path: string) =>
      Effect.succeed({
        bytes,
        removed: false,
        labels: ["missing:exiftool", "missing:qpdf"],
        degraded: true
      })
  })
)

describe("packs_raster_pdf", () => {
  it("raster strip source imports stripRasterBytes", () => {
    const src = readFileSync(new URL("../src/packs/raster-strip.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/raster\.js"/)
    expect(src).toMatch(/stripRasterBytes/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("pdf tools source uses PdfTools", () => {
    const src = readFileSync(new URL("../src/packs/pdf-tools.ts", import.meta.url), "utf8")
    expect(src).toMatch(/PdfTools/)
    expect(src).toMatch(/from "\.\.\/formats\/pdf\.js"/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("raster strip operations are remove only", () => {
    expect(rasterStripPack.manifest.id).toBe("anthropies.raster-strip")
    expect(rasterStripPack.manifest.operations).toEqual(["remove"])
    expect(rasterStripPack.manifest.artifactKinds).toEqual(["raster"])
  })

  it("pdf tools operations are remove only", () => {
    expect(pdfToolsPack.manifest.id).toBe("anthropies.pdf-tools")
    expect(pdfToolsPack.manifest.operations).toEqual(["remove"])
    expect(pdfToolsPack.manifest.artifactKinds).toEqual(["pdf"])
  })

  it("inspect on both packs returns empty", async () => {
    const raster = makeArtifact(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "raster")
    const pdf = makeArtifact(MIN_PDF, "pdf")
    expect(await Effect.runPromise(rasterStripPack.inspect(raster, inspectCtx))).toEqual([])
    expect(await Effect.runPromise(pdfToolsPack.inspect(pdf, inspectCtx))).toEqual([])
  })

  it("pdf tools probe is degraded when tools are missing", async () => {
    const availability = await Effect.runPromise(
      pdfToolsPack.probe(inspectCtx).pipe(Effect.provide(missingTools))
    )
    expect(availability.status).toBe("degraded")
    expect(availability.reason).toBe("tool-missing")
  })

  it("pdf tools transform does not certify absence when tools are missing", async () => {
    const transform = pdfToolsPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(MIN_PDF, "pdf", { name: "owned.pdf" })
    const result = await Effect.runPromise(
      transform!(artifact, removeCtx).pipe(Effect.provide(missingTools))
    )
    expect(
      result.residualFindings.some(
        (f) => f.markClass === "provenance-metadata" && f.status === "absent"
      )
    ).toBe(false)
    expect(result.warnings).toEqual(
      expect.arrayContaining(["missing:exiftool", "missing:qpdf"])
    )
  })
})
