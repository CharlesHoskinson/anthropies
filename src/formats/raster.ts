import { rasterCodec } from "../kind.js"

export interface RasterInspectOk {
  readonly ok: true
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
  readonly applicable: boolean
}

export interface RasterStripOk {
  readonly ok: true
  readonly bytes: Uint8Array
  readonly removed: boolean
  readonly labels: ReadonlyArray<string>
  readonly applicable: boolean
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
  return { ok: true, present: labels.length > 0, labels, applicable: true }
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
    return { ok: true, bytes, removed: false, labels, applicable: true }
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
  return { ok: true, bytes: out, removed: true, labels, applicable: true }
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
  return { ok: true, present: labels.length > 0, labels, applicable: true }
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
    return { ok: true, bytes, removed: false, labels, applicable: true }
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
  return { ok: true, bytes: out, removed: true, labels, applicable: true }
}

const u32le = (bytes: Uint8Array, offset: number): number =>
  (((bytes[offset + 3] ?? 0) << 24) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 1] ?? 0) << 8) |
    (bytes[offset] ?? 0)) >>>
  0

const writeU32le = (out: Uint8Array, offset: number, value: number): void => {
  out[offset] = value & 0xff
  out[offset + 1] = (value >>> 8) & 0xff
  out[offset + 2] = (value >>> 16) & 0xff
  out[offset + 3] = (value >>> 24) & 0xff
}

const writeU32be = (out: Uint8Array, offset: number, value: number): void => {
  out[offset] = (value >>> 24) & 0xff
  out[offset + 1] = (value >>> 16) & 0xff
  out[offset + 2] = (value >>> 8) & 0xff
  out[offset + 3] = value & 0xff
}

const latin1 = (data: Uint8Array): string => new TextDecoder("latin1").decode(data)

const payloadHasProvenance = (data: Uint8Array): boolean => {
  const text = latin1(data)
  return (
    text.includes("c2pa") ||
    text.includes("digitalSourceType") ||
    text.includes("<?xpacket")
  )
}

interface WebpChunk {
  readonly type: string
  readonly data: Uint8Array
  readonly raw: Uint8Array
}

const dropWebpChunk = (type: string, data: Uint8Array): string | undefined => {
  if (type !== "XMP " && type !== "EXIF") {
    return undefined
  }
  if (!payloadHasProvenance(data)) {
    return undefined
  }
  return `${type.trimEnd()}:provenance`
}

const parseWebp = (
  bytes: Uint8Array
): { readonly ok: true; readonly chunks: ReadonlyArray<WebpChunk> } | RasterFail => {
  if (bytes.length < 12) {
    return { ok: false, reason: "truncated webp" }
  }
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") {
    return { ok: false, reason: "not a webp" }
  }
  const chunks: Array<WebpChunk> = []
  let off = 12
  while (off < bytes.length) {
    if (off + 8 > bytes.length) {
      return { ok: false, reason: "truncated webp chunk header" }
    }
    const type = ascii(bytes, off, off + 4)
    const size = u32le(bytes, off + 4)
    const dataStart = off + 8
    const dataEnd = dataStart + size
    if (dataEnd > bytes.length) {
      return { ok: false, reason: "truncated webp chunk data" }
    }
    const padded = dataEnd + (size % 2)
    if (padded > bytes.length) {
      return { ok: false, reason: "truncated webp chunk pad" }
    }
    chunks.push({
      type,
      data: bytes.subarray(dataStart, dataEnd),
      raw: bytes.subarray(off, padded)
    })
    off = padded
  }
  if (chunks.length === 0) {
    return { ok: false, reason: "webp has no chunks" }
  }
  return { ok: true, chunks }
}

const inspectWebp = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const parsed = parseWebp(bytes)
  if (!parsed.ok) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  for (const chunk of parsed.chunks) {
    const hit = dropWebpChunk(chunk.type, chunk.data)
    if (hit !== undefined) {
      labels.push(hit)
    }
  }
  return { ok: true, present: labels.length > 0, labels, applicable: true }
}

const stripWebp = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const parsed = parseWebp(bytes)
  if (!parsed.ok) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  const kept: Array<Uint8Array> = []
  for (const chunk of parsed.chunks) {
    const hit = dropWebpChunk(chunk.type, chunk.data)
    if (hit !== undefined) {
      labels.push(hit)
      continue
    }
    kept.push(chunk.raw)
  }
  if (labels.length === 0) {
    return { ok: true, bytes, removed: false, labels, applicable: true }
  }
  let body = 0
  for (const raw of kept) {
    body += raw.length
  }
  const out = new Uint8Array(12 + body)
  out.set(bytes.subarray(0, 12), 0)
  writeU32le(out, 4, 4 + body)
  let off = 12
  for (const raw of kept) {
    out.set(raw, off)
    off += raw.length
  }
  return { ok: true, bytes: out, removed: true, labels, applicable: true }
}

interface BmffBox {
  readonly type: string
  readonly data: Uint8Array
  readonly raw: Uint8Array
}

const CONTAINER_BOXES = new Set([
  "moov",
  "moof",
  "traf",
  "mfra",
  "meta",
  "dinf",
  "iprp",
  "ipco",
  "meco",
  "mere",
  "udta"
])

const parseBmffBoxes = (
  bytes: Uint8Array
): { readonly ok: true; readonly boxes: ReadonlyArray<BmffBox> } | RasterFail => {
  const boxes: Array<BmffBox> = []
  let off = 0
  while (off < bytes.length) {
    if (off + 8 > bytes.length) {
      return { ok: false, reason: "truncated bmff box header" }
    }
    let size = u32be(bytes, off)
    const type = ascii(bytes, off + 4, off + 8)
    let header = 8
    if (size === 1) {
      if (off + 16 > bytes.length) {
        return { ok: false, reason: "truncated bmff largesize" }
      }
      const high = u32be(bytes, off + 8)
      const low = u32be(bytes, off + 12)
      if (high !== 0 || low > 0x7fffffff) {
        return { ok: false, reason: "bmff box too large" }
      }
      size = low
      header = 16
    } else if (size === 0) {
      size = bytes.length - off
    }
    if (size < header || off + size > bytes.length) {
      return { ok: false, reason: "truncated bmff box" }
    }
    boxes.push({
      type,
      data: bytes.subarray(off + header, off + size),
      raw: bytes.subarray(off, off + size)
    })
    off += size
  }
  if (boxes.length === 0) {
    return { ok: false, reason: "bmff has no boxes" }
  }
  return { ok: true, boxes }
}

const nestedBoxPayload = (box: BmffBox): Uint8Array => {
  if (box.type === "meta" || box.type === "udta") {
    if (box.data.length >= 4) {
      return box.data.subarray(4)
    }
  }
  return box.data
}

const collectBmffLabels = (boxes: ReadonlyArray<BmffBox>, labels: Array<string>): void => {
  for (const box of boxes) {
    if (box.type === "xml " || box.type === "Exif") {
      if (box.type === "xml " || payloadHasProvenance(box.data)) {
        labels.push(`${box.type.trimEnd()}:provenance`)
        continue
      }
    }
    if (payloadHasProvenance(box.data)) {
      labels.push(`${box.type.trimEnd()}:provenance`)
      continue
    }
    if (CONTAINER_BOXES.has(box.type)) {
      const inner = parseBmffBoxes(nestedBoxPayload(box))
      if (inner.ok) {
        collectBmffLabels(inner.boxes, labels)
      }
    }
  }
}

const stripBmffBoxes = (
  boxes: ReadonlyArray<BmffBox>,
  labels: Array<string>
): { readonly kept: ReadonlyArray<Uint8Array>; readonly removed: boolean } => {
  const kept: Array<Uint8Array> = []
  let removed = false
  for (const box of boxes) {
    if (box.type === "xml " || box.type === "Exif") {
      if (box.type === "xml " || payloadHasProvenance(box.data)) {
        labels.push(`${box.type.trimEnd()}:provenance`)
        removed = true
        continue
      }
    }
    if (payloadHasProvenance(box.data) && !CONTAINER_BOXES.has(box.type)) {
      labels.push(`${box.type.trimEnd()}:provenance`)
      removed = true
      continue
    }
    if (CONTAINER_BOXES.has(box.type)) {
      const headerLen = box.raw.length - box.data.length
      const fullHeader =
        box.type === "meta" || box.type === "udta"
          ? box.raw.subarray(0, headerLen + 4)
          : box.raw.subarray(0, headerLen)
      const innerBytes =
        box.type === "meta" || box.type === "udta" ? box.data.subarray(4) : box.data
      const inner = parseBmffBoxes(innerBytes)
      if (!inner.ok) {
        if (payloadHasProvenance(box.data)) {
          labels.push(`${box.type.trimEnd()}:provenance`)
          removed = true
          continue
        }
        kept.push(box.raw)
        continue
      }
      const nested = stripBmffBoxes(inner.boxes, labels)
      if (!nested.removed) {
        kept.push(box.raw)
        continue
      }
      removed = true
      let innerSize = 0
      for (const raw of nested.kept) {
        innerSize += raw.length
      }
      const outSize = fullHeader.length + innerSize
      const out = new Uint8Array(outSize)
      out.set(fullHeader, 0)
      writeU32be(out, 0, outSize)
      let off = fullHeader.length
      for (const raw of nested.kept) {
        out.set(raw, off)
        off += raw.length
      }
      kept.push(out)
      continue
    }
    kept.push(box.raw)
  }
  return { kept, removed }
}

const inspectBmff = (
  bytes: Uint8Array,
  brand: "avif" | "heic"
): RasterInspectOk | RasterFail => {
  const parsed = parseBmffBoxes(bytes)
  if (!parsed.ok) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  if (parsed.boxes.length < 2 || parsed.boxes[0]?.type !== "ftyp") {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const ftypBrand = ascii(parsed.boxes[0].data, 0, 4)
  if (brand === "avif" && ftypBrand !== "avif" && ftypBrand !== "avis") {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  if (
    brand === "heic" &&
    ftypBrand !== "heic" &&
    ftypBrand !== "heif" &&
    ftypBrand !== "mif1"
  ) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  collectBmffLabels(parsed.boxes, labels)
  return { ok: true, present: labels.length > 0, labels, applicable: true }
}

const stripBmff = (
  bytes: Uint8Array,
  brand: "avif" | "heic"
): RasterStripOk | RasterFail => {
  const inspected = inspectBmff(bytes, brand)
  if (!inspected.ok) {
    return inspected
  }
  if (!inspected.applicable) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  const parsed = parseBmffBoxes(bytes)
  if (!parsed.ok) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  const stripped = stripBmffBoxes(parsed.boxes, labels)
  if (!stripped.removed) {
    return { ok: true, bytes, removed: false, labels: [], applicable: true }
  }
  let size = 0
  for (const raw of stripped.kept) {
    size += raw.length
  }
  const out = new Uint8Array(size)
  let off = 0
  for (const raw of stripped.kept) {
    out.set(raw, off)
    off += raw.length
  }
  return { ok: true, bytes: out, removed: true, labels, applicable: true }
}

/** Inspect hard-bound C2PA/XMP on parsed rasters; undecodable codecs stay not-applicable. */
export const inspectRasterBytes = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const codec = rasterCodec(bytes)
  if (codec === "png") {
    return inspectPng(bytes)
  }
  if (codec === "jpeg") {
    return inspectJpeg(bytes)
  }
  if (codec === "webp") {
    return inspectWebp(bytes)
  }
  if (codec === "avif") {
    return inspectBmff(bytes, "avif")
  }
  if (codec === "heic") {
    return inspectBmff(bytes, "heic")
  }
  if (codec === undefined) {
    return { ok: false, reason: "not a raster image" }
  }
  return { ok: true, present: false, labels: [], applicable: false }
}

/** Drop hard-bound C2PA/XMP on parsed rasters. Undecodable codecs stay not-applicable. */
export const stripRasterBytes = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const codec = rasterCodec(bytes)
  if (codec === "png") {
    return stripPng(bytes)
  }
  if (codec === "jpeg") {
    return stripJpeg(bytes)
  }
  if (codec === "webp") {
    return stripWebp(bytes)
  }
  if (codec === "avif") {
    return stripBmff(bytes, "avif")
  }
  if (codec === "heic") {
    return stripBmff(bytes, "heic")
  }
  if (codec === undefined) {
    return { ok: false, reason: "not a raster image" }
  }
  return { ok: true, bytes, removed: false, labels: [], applicable: false }
}
