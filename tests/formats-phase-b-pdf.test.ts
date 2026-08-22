import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { makeArtifact } from "../src/core/domain.js"
import { inspectPdfBytes, PdfTools } from "../src/formats/pdf.js"
import { pdfPack } from "../src/packs/pdf.js"
import { pdfToolsPack } from "../src/packs/pdf-tools.js"

const enc = new TextEncoder()

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const removeCtx = { ...inspectCtx, operation: "remove" as const }

/** Document-level XMP inside a /Metadata stream (not page content). */
const pdfWithMetadataXmp = (): Uint8Array => {
  const xmp =
    '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\">" +
    "<digitalSourceType>trainedAlgorithmicMedia</digitalSourceType>" +
    "</x:xmpmeta>" +
    '<?xpacket end="w"?>'
  return enc.encode(
    "%PDF-1.4\n" +
      "1 0 obj\n<< /Type /Catalog /Metadata 2 0 R >>\nendobj\n" +
      `2 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${xmp.length} >>\nstream\n` +
      `${xmp}\nendstream\nendobj\n` +
      "trailer\n<< /Root 1 0 R >>\n%%EOF\n"
  )
}

/** `c2pa` only inside a content stream body; no document XMP or dictionary marker. */
const pdfStreamNoiseOnly = (): Uint8Array =>
  enc.encode(
    "%PDF-1.4\n" +
      "1 0 obj\n<< /Type /Catalog >>\nendobj\n" +
      "2 0 obj\n<< /Length 24 >>\nstream\n" +
      "BT /F1 12 Tf (c2pa) Tj ET\n" +
      "endstream\nendobj\n" +
      "trailer\n<< /Root 1 0 R >>\n%%EOF\n"
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

const presentTools = Layer.succeed(
  PdfTools,
  PdfTools.of({
    inspect: (bytes: Uint8Array) =>
      Effect.succeed({
        present: inspectPdfBytes(bytes).present,
        labels: [...inspectPdfBytes(bytes).labels],
        degraded: false
      }),
    strip: (_bytes: Uint8Array, _path: string) =>
      Effect.succeed({
        bytes: enc.encode(
          "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
        ),
        removed: true,
        labels: ["exiftool", "qpdf"],
        degraded: false
      })
  })
)

describe("formats_phase_b_pdf", () => {
  it("PDF XMP packet is present", async () => {
    const bytes = pdfWithMetadataXmp()
    const scanned = inspectPdfBytes(bytes)
    expect(scanned.present).toBe(true)
    expect(scanned.labels.some((l) => /xmp|marker/i.test(l))).toBe(true)

    const findings = await Effect.runPromise(
      pdfPack.inspect(makeArtifact(bytes, "pdf"), inspectCtx)
    )
    expect(
      findings.some(
        (f) => f.markClass === "provenance-metadata" && f.status === "present"
      )
    ).toBe(true)
  })

  it("stream payload false positive is avoided", async () => {
    const bytes = pdfStreamNoiseOnly()
    const scanned = inspectPdfBytes(bytes)
    expect(scanned.present).toBe(false)

    const findings = await Effect.runPromise(
      pdfPack.inspect(makeArtifact(bytes, "pdf"), inspectCtx)
    )
    expect(
      findings.some(
        (f) => f.markClass === "provenance-metadata" && f.status === "present"
      )
    ).toBe(false)
  })

  it("missing tools are degraded", async () => {
    const availability = await Effect.runPromise(
      pdfToolsPack.probe(inspectCtx).pipe(Effect.provide(missingTools))
    )
    expect(availability.status).toBe("degraded")
    expect(availability.reason).toBe("tool-missing")

    const transform = pdfToolsPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(pdfWithMetadataXmp(), "pdf", { name: "owned.pdf" })
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

  it("tools present can strip metadata", async () => {
    const transform = pdfToolsPack.transform
    expect(transform).toBeDefined()
    const artifact = makeArtifact(pdfWithMetadataXmp(), "pdf", { name: "owned.pdf" })
    const result = await Effect.runPromise(
      transform!(artifact, removeCtx).pipe(Effect.provide(presentTools))
    )
    expect(result.removals.length).toBeGreaterThan(0)
    const labels = result.removals.flatMap((r) => [...r.labels])
    expect(labels).toEqual(expect.arrayContaining(["exiftool", "qpdf"]))
    expect(result.warnings).not.toEqual(
      expect.arrayContaining(["missing:exiftool", "missing:qpdf"])
    )

    const stripped = await Effect.runPromise(
      Effect.gen(function* () {
        const pdf = yield* PdfTools
        return yield* pdf.strip(artifact.bytes, "owned.pdf")
      }).pipe(Effect.provide(presentTools))
    )
    expect(stripped.removed).toBe(true)
    expect(stripped.degraded).toBe(false)
    expect(stripped.labels).toEqual(expect.arrayContaining(["exiftool", "qpdf"]))
  })
})
