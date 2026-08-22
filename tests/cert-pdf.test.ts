import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { inspectPdfBytes, PdfTools } from "../src/formats/pdf.js"
import { Finding, Removed, Report, residualDrivesExit } from "../src/report.js"
import { Cleaner } from "../src/services/cleaner.js"

const enc = new TextEncoder()

const MIN_PDF = enc.encode(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
)

/** Provenance XMP inside a /Metadata stream (document-level, not page content). */
const XMP_PDF = (() => {
  const xmp =
    "<?xpacket begin=''?>" +
    "<digitalSourceType>trainedAlgorithmicMedia</digitalSourceType>" +
    "<?xpacket end='w'?>"
  return enc.encode(
    "%PDF-1.4\n" +
      "1 0 obj\n<< /Type /Catalog /Metadata 2 0 R >>\nendobj\n" +
      `2 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${xmp.length} >>\nstream\n` +
      `${xmp}\nendstream\nendobj\n` +
      "trailer\n<< /Root 1 0 R >>\n%%EOF\n"
  )
})()

/** `c2pa` only as content-stream noise — must not certify present. */
const STREAM_NOISE_PDF = enc.encode(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n" +
    "2 0 obj\n<< /Length 12 >>\nstream\nxxc2payy\nendstream\nendobj\n" +
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
    strip: (bytes: Uint8Array) =>
      Effect.succeed({
        bytes,
        removed: false,
        labels: ["missing:exiftool", "missing:qpdf"],
        degraded: true
      })
  })
)

const layers = Effect.provide(
  Layer.mergeAll(Cleaner.Default.pipe(Layer.provide(missingTools)), NodeContext.layer)
)

describe("cert_pdf_degraded", () => {
  it("byte scan sees xmp c2pa markers", () => {
    expect(inspectPdfBytes(XMP_PDF).present).toBe(true)
    expect(inspectPdfBytes(MIN_PDF).present).toBe(false)
    expect(inspectPdfBytes(STREAM_NOISE_PDF).present).toBe(false)
  })

  it("missing tools are Finding degraded and do not drive exit 1", () => {
    const report = new Report({
      kind: "pdf",
      findings: [
        new Finding({ channel: "deterministic", status: "absent" }),
        new Finding({ channel: "c2pa", status: "present" }),
        new Finding({ channel: "official", status: "unavailable" }),
        new Finding({ channel: "statistical", status: "unavailable" })
      ],
      removed: new Removed({}),
      degraded: true,
      honesty: ["warning: exiftool or qpdf missing; PDF metadata not stripped"]
    })
    expect(residualDrivesExit(report)).toBe(false)
    expect(report.degraded).toBe(true)
  })

  it.scoped("ProcCommand double missing tools writes dest and degrades", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/owned.pdf`
        const dest = `${dir}/out.pdf`
        yield* fs.writeFile(src, XMP_PDF)
        const { report, bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        expect(report.kind).toBe("pdf")
        expect(report.degraded).toBe(true)
        expect(residualDrivesExit(report)).toBe(false)
        expect(bytes[0]).toBe(0x25)
        expect(yield* fs.exists(dest)).toBe(true)
        expect(report.findings.some((f) => f.channel === "c2pa" && f.status === "degraded")).toBe(true)
        const honesty = report.honesty.join("\n")
        expect(honesty).not.toMatch(/^c2pa: degraded$/m)
        expect(honesty).toMatch(/^c2pa: present$/m)
      })
    )
  )

  it.scoped("degraded clean of a marker-free pdf stanzas absent", () =>
    layers(
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
        expect(report.findings.some((f) => f.channel === "c2pa" && f.status === "degraded")).toBe(true)
        const honesty = report.honesty.join("\n")
        expect(honesty).not.toMatch(/^c2pa: degraded$/m)
        expect(honesty).toMatch(/^c2pa: absent$/m)
      })
    )
  )
})
