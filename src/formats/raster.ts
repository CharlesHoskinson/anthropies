import { rasterCodec } from "../kind.js"

export interface RasterInspectOk {
  readonly ok: true
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
}

export interface RasterStripOk {
  readonly ok: true
  readonly bytes: Uint8Array
  readonly removed: boolean
  readonly labels: ReadonlyArray<string>
}

export interface RasterFail {
  readonly ok: false
  readonly reason: string
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const KEEP_PNG = new Set(["IHDR", "IDAT", "IEND"])
const TEXT_PNG = new Set(["tEXt", "iTXt", "zTXt"])
const XMP_APP1 = "http://ns.adobe.com/xap/1.0/"

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end))

const startsWithAscii = (bytes: Uint8Array, needle: string): boolean => {
  if (bytes.length < needle.length) {
    return false
  }
  return ascii(bytes, 0, needle.length) === needle
}

const u32be = (bytes: Uint8Array, offset: number): number =>
  (((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)) >>>
  0

const u16be = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)

const pngKeyword = (data: Uint8Array): string => {
  let end = 0
  while (end < data.length && data[end] !== 0) {
    end += 1
  }
  return ascii(data, 0, end)
}

const isXmpOrC2paKey = (key: string): boolean => {
  const k = key.toLowerCase()
  return k.includes("c2pa") || k.includes("xmp") || k === "xml:com.adobe.xmp"
}

const payloadC2pa = (data: Uint8Array): boolean =>
  startsWithAscii(data, "c2pa") || startsWithAscii(data, "jumb")

const dropPngChunk = (type: string, data: Uint8Array): string | undefined => {
  if (KEEP_PNG.has(type)) {
    return undefined
  }
  if (type === "caBX") {
    return "caBX"
  }
  if (payloadC2pa(data)) {
    return `${type}:c2pa`
  }
  if (TEXT_PNG.has(type) && isXmpOrC2paKey(pngKeyword(data))) {
    return `${type}:${pngKeyword(data)}`
  }
  return undefined
}

interface PngChunk {
  readonly type: string
  readonly data: Uint8Array
  readonly raw: Uint8Array
}

const parsePng = (
  bytes: Uint8Array
): { readonly ok: true; readonly chunks: ReadonlyArray<PngChunk> } | RasterFail => {
  if (bytes.length < 8) {
    return { ok: false, reason: "truncated png signature" }
  }
  if (!PNG_SIG.every((b, i) => bytes[i] === b)) {
    return { ok: false, reason: "not a png" }
  }
  const chunks: Array<PngChunk> = []
  let off = 8
  let sawIend = false
  let sawIhdr = false
  while (off < bytes.length) {
    if (off + 12 > bytes.length) {
      return { ok: false, reason: "truncated png chunk header" }
    }
    const len = u32be(bytes, off)
    const type = ascii(bytes, off + 4, off + 8)
    if (off + 12 + len > bytes.length) {
      return { ok: false, reason: "truncated png chunk data" }
    }
    const data = bytes.subarray(off + 8, off + 8 + len)
    const raw = bytes.subarray(off, off + 12 + len)
    chunks.push({ type, data, raw })
    off += 12 + len
    if (type === "IHDR") {
      sawIhdr = true
    }
    if (type === "IEND") {
      sawIend = true
      break
    }
  }
  if (!sawIhdr) {
    return { ok: false, reason: "png missing IHDR" }
  }
  if (!sawIend) {
    return { ok: false, reason: "png missing IEND" }
  }
  return { ok: true, chunks }
}

const inspectPng = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const parsed = parsePng(bytes)
  if (!parsed.ok) {
    return parsed
  }
  const labels: Array<string> = []
  for (const chunk of parsed.chunks) {
    const hit = dropPngChunk(chunk.type, chunk.data)
    if (hit !== undefined) {
      labels.push(hit)
    }
  }
  return { ok: true, present: labels.length > 0, labels }
}

const stripPng = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const parsed = parsePng(bytes)
  if (!parsed.ok) {
    return parsed
  }
  const labels: Array<string> = []
  const kept: Array<Uint8Array> = []
  for (const chunk of parsed.chunks) {
    const hit = dropPngChunk(chunk.type, chunk.data)
    if (hit !== undefined) {
      labels.push(hit)
      continue
    }
    kept.push(chunk.raw)
  }
  if (labels.length === 0) {
    return { ok: true, bytes, removed: false, labels }
  }
  let size = 8
  for (const raw of kept) {
    size += raw.length
  }
  const out = new Uint8Array(size)
  out.set(bytes.subarray(0, 8), 0)
  let off = 8
  for (const raw of kept) {
    out.set(raw, off)
    off += raw.length
  }
  return { ok: true, bytes: out, removed: true, labels }
}

const isXmpApp1 = (data: Uint8Array): boolean =>
  startsWithAscii(data, XMP_APP1) || startsWithAscii(data, "http://ns.adobe.com/xmp/")

const dropJpegSegment = (marker: number, data: Uint8Array): string | undefined => {
  if (marker === 0xeb) {
    return "APP11"
  }
  if (marker === 0xe1 && isXmpApp1(data)) {
    return "APP1:XMP"
  }
  if (payloadC2pa(data)) {
    return `APP${String(marker - 0xe0)}:c2pa`
  }
  return undefined
}

interface JpegSeg {
  readonly marker: number
  readonly data: Uint8Array
  readonly raw: Uint8Array
}

const parseJpeg = (
  bytes: Uint8Array
): { readonly ok: true; readonly segs: ReadonlyArray<JpegSeg> } | RasterFail => {
  if (bytes.length < 4) {
    return { ok: false, reason: "truncated jpeg" }
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return { ok: false, reason: "not a jpeg" }
  }
  const segs: Array<JpegSeg> = []
  let off = 2
  let sawEoi = false
  while (off < bytes.length) {
    if (bytes[off] !== 0xff) {
      return { ok: false, reason: "jpeg marker desync" }
    }
    while (off < bytes.length && bytes[off] === 0xff) {
      off += 1
    }
    if (off >= bytes.length) {
      return { ok: false, reason: "truncated jpeg marker" }
    }
    const marker = bytes[off] ?? 0
    const markerStart = off - 1
    off += 1
    if (marker === 0xd9) {
      segs.push({
        marker,
        data: new Uint8Array(0),
        raw: bytes.subarray(markerStart, off)
      })
      sawEoi = true
      break
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      segs.push({
        marker,
        data: new Uint8Array(0),
        raw: bytes.subarray(markerStart, off)
      })
      continue
    }
    if (off + 2 > bytes.length) {
      return { ok: false, reason: "truncated jpeg segment length" }
    }
    const len = u16be(bytes, off)
    if (len < 2 || off + len > bytes.length) {
      return { ok: false, reason: "truncated jpeg segment" }
    }
    const data = bytes.subarray(off + 2, off + len)
    let end = off + len
    if (marker === 0xda) {
      let i = end
      while (i < bytes.length) {
        if (bytes[i] !== 0xff) {
          i += 1
          continue
        }
        const nxt = bytes[i + 1] ?? 0
        if (nxt === 0x00 || (nxt >= 0xd0 && nxt <= 0xd7)) {
          i += 2
          continue
        }
        break
      }
      end = i
    }
    segs.push({
      marker,
      data,
      raw: bytes.subarray(markerStart, end)
    })
    off = end
  }
  if (!sawEoi) {
    return { ok: false, reason: "jpeg missing EOI" }
  }
  return { ok: true, segs }
}

const inspectJpeg = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const parsed = parseJpeg(bytes)
  if (!parsed.ok) {
    return parsed
  }
  const labels: Array<string> = []
  for (const seg of parsed.segs) {
    const hit = dropJpegSegment(seg.marker, seg.data)
    if (hit !== undefined) {
      labels.push(hit)
    }
  }
  return { ok: true, present: labels.length > 0, labels }
}

const stripJpeg = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const parsed = parseJpeg(bytes)
  if (!parsed.ok) {
    return parsed
  }
  const labels: Array<string> = []
  const kept: Array<Uint8Array> = [bytes.subarray(0, 2)]
  for (const seg of parsed.segs) {
    const hit = dropJpegSegment(seg.marker, seg.data)
    if (hit !== undefined) {
      labels.push(hit)
      continue
    }
    kept.push(seg.raw)
  }
  if (labels.length === 0) {
    return { ok: true, bytes, removed: false, labels }
  }
  let size = 0
  for (const raw of kept) {
    size += raw.length
  }
  const out = new Uint8Array(size)
  let off = 0
  for (const raw of kept) {
    out.set(raw, off)
    off += raw.length
  }
  return { ok: true, bytes: out, removed: true, labels }
}

/** Inspect hard-bound C2PA/XMP markers on a raster buffer. */
export const inspectRasterBytes = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const codec = rasterCodec(bytes)
  if (codec === "png") {
    return inspectPng(bytes)
  }
  if (codec === "jpeg") {
    return inspectJpeg(bytes)
  }
  if (codec === undefined) {
    return { ok: false, reason: "not a raster image" }
  }
  return { ok: true, present: false, labels: [] }
}

/** Drop hard-bound C2PA/XMP markers. PNG keeps IHDR/IDAT/IEND. */
export const stripRasterBytes = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const codec = rasterCodec(bytes)
  if (codec === "png") {
    return stripPng(bytes)
  }
  if (codec === "jpeg") {
    return stripJpeg(bytes)
  }
  if (codec === undefined) {
    return { ok: false, reason: "not a raster image" }
  }
  return { ok: true, bytes, removed: false, labels: [] }
}
