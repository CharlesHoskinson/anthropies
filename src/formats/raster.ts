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

const u16le = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)

const GIF_XMP_ID = "XMP DataXMP"

interface GifBlock {
  readonly kind: "xmp" | "other"
  readonly raw: Uint8Array
  readonly payload: Uint8Array
}

const readGifSubBlocks = (
  bytes: Uint8Array,
  start: number
): { readonly end: number; readonly payload: Uint8Array } | undefined => {
  let off = start
  const parts: Array<Uint8Array> = []
  let size = 0
  while (off < bytes.length) {
    const len = bytes[off] ?? 0
    off += 1
    if (len === 0) {
      const out = new Uint8Array(size)
      let p = 0
      for (const part of parts) {
        out.set(part, p)
        p += part.length
      }
      return { end: off, payload: out }
    }
    if (off + len > bytes.length) {
      return undefined
    }
    parts.push(bytes.subarray(off, off + len))
    size += len
    off += len
  }
  return undefined
}

const parseGif = (
  bytes: Uint8Array
): { readonly ok: true; readonly blocks: ReadonlyArray<GifBlock> } | RasterFail => {
  if (bytes.length < 13) {
    return { ok: false, reason: "truncated gif" }
  }
  if (ascii(bytes, 0, 3) !== "GIF" || (ascii(bytes, 3, 6) !== "87a" && ascii(bytes, 3, 6) !== "89a")) {
    return { ok: false, reason: "not a gif" }
  }
  const packed = bytes[10] ?? 0
  let off = 13
  if ((packed & 0x80) !== 0) {
    const gctEntries = 2 << (packed & 0x07)
    const gctSize = 3 * gctEntries
    if (off + gctSize > bytes.length) {
      return { ok: false, reason: "truncated gif gct" }
    }
    off += gctSize
  }
  const blocks: Array<GifBlock> = []
  const prefix = bytes.subarray(0, off)
  blocks.push({ kind: "other", raw: prefix, payload: new Uint8Array(0) })
  let sawTrailer = false
  while (off < bytes.length) {
    const introducer = bytes[off] ?? 0
    if (introducer === 0x3b) {
      blocks.push({ kind: "other", raw: bytes.subarray(off, off + 1), payload: new Uint8Array(0) })
      sawTrailer = true
      off += 1
      break
    }
    if (introducer === 0x21) {
      if (off + 2 > bytes.length) {
        return { ok: false, reason: "truncated gif extension" }
      }
      const label = bytes[off + 1] ?? 0
      if (label === 0xff) {
        if (off + 14 > bytes.length) {
          return { ok: false, reason: "truncated gif application extension" }
        }
        const blockSize = bytes[off + 2] ?? 0
        if (blockSize !== 11) {
          return { ok: false, reason: "gif application block size" }
        }
        const id = ascii(bytes, off + 3, off + 14)
        const sub = readGifSubBlocks(bytes, off + 14)
        if (sub === undefined) {
          return { ok: false, reason: "truncated gif application data" }
        }
        const raw = bytes.subarray(off, sub.end)
        const kind = id === GIF_XMP_ID && payloadHasProvenance(sub.payload) ? "xmp" : "other"
        blocks.push({ kind, raw, payload: sub.payload })
        off = sub.end
        continue
      }
      const sub = readGifSubBlocks(bytes, off + 2)
      if (sub === undefined) {
        return { ok: false, reason: "truncated gif extension data" }
      }
      blocks.push({
        kind: "other",
        raw: bytes.subarray(off, sub.end),
        payload: sub.payload
      })
      off = sub.end
      continue
    }
    if (introducer === 0x2c) {
      if (off + 10 > bytes.length) {
        return { ok: false, reason: "truncated gif image descriptor" }
      }
      const imgPacked = bytes[off + 9] ?? 0
      let imgOff = off + 10
      if ((imgPacked & 0x80) !== 0) {
        const lctEntries = 2 << (imgPacked & 0x07)
        const lctSize = 3 * lctEntries
        if (imgOff + lctSize > bytes.length) {
          return { ok: false, reason: "truncated gif lct" }
        }
        imgOff += lctSize
      }
      if (imgOff >= bytes.length) {
        return { ok: false, reason: "truncated gif lzw min code" }
      }
      imgOff += 1
      const sub = readGifSubBlocks(bytes, imgOff)
      if (sub === undefined) {
        return { ok: false, reason: "truncated gif image data" }
      }
      blocks.push({
        kind: "other",
        raw: bytes.subarray(off, sub.end),
        payload: new Uint8Array(0)
      })
      off = sub.end
      continue
    }
    return { ok: false, reason: "gif block desync" }
  }
  if (!sawTrailer) {
    return { ok: false, reason: "gif missing trailer" }
  }
  return { ok: true, blocks }
}

const inspectGif = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const parsed = parseGif(bytes)
  if (!parsed.ok) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  for (const block of parsed.blocks) {
    if (block.kind === "xmp") {
      labels.push("GIF:XMP")
    }
  }
  return { ok: true, present: labels.length > 0, labels, applicable: true }
}

const stripGif = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const parsed = parseGif(bytes)
  if (!parsed.ok) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  const kept: Array<Uint8Array> = []
  for (const block of parsed.blocks) {
    if (block.kind === "xmp") {
      labels.push("GIF:XMP")
      continue
    }
    kept.push(block.raw)
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

const BITMAPINFOHEADER_SIZE = 40

const parseBmpHeader = (
  bytes: Uint8Array
):
  | {
      readonly ok: true
      readonly bfOffBits: number
      readonly dibEnd: number
      readonly metaRegion: Uint8Array
    }
  | RasterFail => {
  if (bytes.length < 14 + BITMAPINFOHEADER_SIZE) {
    return { ok: false, reason: "truncated bmp" }
  }
  if (ascii(bytes, 0, 2) !== "BM") {
    return { ok: false, reason: "not a bmp" }
  }
  const bfOffBits = u32le(bytes, 10)
  const biSize = u32le(bytes, 14)
  if (biSize < BITMAPINFOHEADER_SIZE) {
    return { ok: false, reason: "bmp missing BITMAPINFOHEADER" }
  }
  if (14 + biSize > bytes.length) {
    return { ok: false, reason: "truncated bmp dib" }
  }
  const dibEnd = 14 + biSize
  const metaEnd =
    bfOffBits > dibEnd && bfOffBits <= bytes.length ? bfOffBits : dibEnd
  return {
    ok: true,
    bfOffBits,
    dibEnd,
    metaRegion: bytes.subarray(dibEnd, metaEnd)
  }
}

const inspectBmp = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  const parsed = parseBmpHeader(bytes)
  if (!parsed.ok) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const labels: Array<string> = []
  if (payloadHasProvenance(parsed.metaRegion)) {
    labels.push("BMP:provenance")
  }
  return { ok: true, present: labels.length > 0, labels, applicable: true }
}

const stripBmp = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const inspected = inspectBmp(bytes)
  if (!inspected.ok) {
    return inspected
  }
  if (!inspected.applicable) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  if (!inspected.present) {
    return { ok: true, bytes, removed: false, labels: [], applicable: true }
  }
  const parsed = parseBmpHeader(bytes)
  if (!parsed.ok) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  const pixelStart =
    parsed.bfOffBits >= parsed.dibEnd && parsed.bfOffBits <= bytes.length
      ? parsed.bfOffBits
      : bytes.length
  const pixels = bytes.subarray(pixelStart)
  const out = new Uint8Array(parsed.dibEnd + pixels.length)
  out.set(bytes.subarray(0, parsed.dibEnd), 0)
  writeU32le(out, 2, out.length)
  writeU32le(out, 10, parsed.dibEnd)
  out.set(pixels, parsed.dibEnd)
  return { ok: true, bytes: out, removed: true, labels: ["BMP:provenance"], applicable: true }
}

const TIFF_TAG_XMP = 700
const TIFF_TAG_EXIF_IFD = 34665

const readTiffU16 = (bytes: Uint8Array, offset: number, le: boolean): number =>
  le ? u16le(bytes, offset) : u16be(bytes, offset)

const readTiffU32 = (bytes: Uint8Array, offset: number, le: boolean): number =>
  le ? u32le(bytes, offset) : u32be(bytes, offset)

const tiffTypeSize = (type: number): number | undefined => {
  switch (type) {
    case 1:
    case 2:
    case 6:
    case 7:
      return 1
    case 3:
    case 8:
      return 2
    case 4:
    case 9:
    case 11:
      return 4
    case 5:
    case 10:
    case 12:
      return 8
    default:
      return undefined
  }
}

const tiffEntryValueBytes = (
  bytes: Uint8Array,
  entryOff: number,
  le: boolean
): Uint8Array | undefined => {
  const type = readTiffU16(bytes, entryOff + 2, le)
  const count = readTiffU32(bytes, entryOff + 4, le)
  const unit = tiffTypeSize(type)
  if (unit === undefined) {
    return undefined
  }
  const byteCount = unit * count
  if (byteCount > 0x1000000) {
    return undefined
  }
  if (byteCount <= 4) {
    return bytes.subarray(entryOff + 8, entryOff + 8 + byteCount)
  }
  const valueOff = readTiffU32(bytes, entryOff + 8, le)
  if (valueOff + byteCount > bytes.length) {
    return undefined
  }
  return bytes.subarray(valueOff, valueOff + byteCount)
}

const parseTiffIfdLabels = (
  bytes: Uint8Array,
  ifdOffset: number,
  le: boolean,
  labels: Array<string>,
  depth: number
): boolean => {
  if (depth > 8) {
    return false
  }
  if (ifdOffset + 2 > bytes.length) {
    return false
  }
  const count = readTiffU16(bytes, ifdOffset, le)
  const entriesEnd = ifdOffset + 2 + count * 12
  if (entriesEnd + 4 > bytes.length) {
    return false
  }
  for (let i = 0; i < count; i += 1) {
    const entryOff = ifdOffset + 2 + i * 12
    const tag = readTiffU16(bytes, entryOff, le)
    if (tag === TIFF_TAG_XMP) {
      const value = tiffEntryValueBytes(bytes, entryOff, le)
      if (value === undefined) {
        return false
      }
      if (payloadHasProvenance(value)) {
        labels.push("TIFF:XMP")
      }
      continue
    }
    if (tag === TIFF_TAG_EXIF_IFD) {
      const type = readTiffU16(bytes, entryOff + 2, le)
      const exifCount = readTiffU32(bytes, entryOff + 4, le)
      if (type !== 4 || exifCount !== 1) {
        continue
      }
      const exifOff = readTiffU32(bytes, entryOff + 8, le)
      if (!parseTiffIfdLabels(bytes, exifOff, le, labels, depth + 1)) {
        return false
      }
      continue
    }
    const value = tiffEntryValueBytes(bytes, entryOff, le)
    if (value !== undefined && payloadHasProvenance(value)) {
      labels.push(`TIFF:${String(tag)}`)
    }
  }
  const next = readTiffU32(bytes, entriesEnd, le)
  if (next !== 0) {
    return parseTiffIfdLabels(bytes, next, le, labels, depth + 1)
  }
  return true
}

const inspectTiff = (bytes: Uint8Array): RasterInspectOk | RasterFail => {
  if (bytes.length < 8) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const le = ascii(bytes, 0, 2) === "II"
  const be = ascii(bytes, 0, 2) === "MM"
  if (!le && !be) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const magic = readTiffU16(bytes, 2, le)
  if (magic !== 42) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  const ifdOffset = readTiffU32(bytes, 4, le)
  const labels: Array<string> = []
  const parsed = parseTiffIfdLabels(bytes, ifdOffset, le, labels, 0)
  if (!parsed) {
    return { ok: true, present: false, labels: [], applicable: false }
  }
  return { ok: true, present: labels.length > 0, labels, applicable: true }
}

const stripTiff = (bytes: Uint8Array): RasterStripOk | RasterFail => {
  const inspected = inspectTiff(bytes)
  if (!inspected.ok) {
    return inspected
  }
  if (!inspected.applicable) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  if (!inspected.present) {
    return { ok: true, bytes, removed: false, labels: [], applicable: true }
  }
  // Provenance payloads are hard-bound in IFD value regions; blank matching payloads in place.
  const le = ascii(bytes, 0, 2) === "II"
  const ifdOffset = readTiffU32(bytes, 4, le)
  const out = new Uint8Array(bytes)
  const blankIfd = (offset: number, depth: number): boolean => {
    if (depth > 8 || offset + 2 > out.length) {
      return false
    }
    const count = readTiffU16(out, offset, le)
    const entriesEnd = offset + 2 + count * 12
    if (entriesEnd + 4 > out.length) {
      return false
    }
    for (let i = 0; i < count; i += 1) {
      const entryOff = offset + 2 + i * 12
      const tag = readTiffU16(out, entryOff, le)
      if (tag === TIFF_TAG_EXIF_IFD) {
        const type = readTiffU16(out, entryOff + 2, le)
        const exifCount = readTiffU32(out, entryOff + 4, le)
        if (type === 4 && exifCount === 1) {
          const exifOff = readTiffU32(out, entryOff + 8, le)
          if (!blankIfd(exifOff, depth + 1)) {
            return false
          }
        }
        continue
      }
      const value = tiffEntryValueBytes(out, entryOff, le)
      if (value !== undefined && payloadHasProvenance(value)) {
        value.fill(0)
      }
    }
    const next = readTiffU32(out, entriesEnd, le)
    if (next !== 0) {
      return blankIfd(next, depth + 1)
    }
    return true
  }
  if (!blankIfd(ifdOffset, 0)) {
    return { ok: true, bytes, removed: false, labels: [], applicable: false }
  }
  return {
    ok: true,
    bytes: out,
    removed: true,
    labels: inspected.labels.slice(),
    applicable: true
  }
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
  if (codec === "gif") {
    return inspectGif(bytes)
  }
  if (codec === "bmp") {
    return inspectBmp(bytes)
  }
  if (codec === "tiff") {
    return inspectTiff(bytes)
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
  if (codec === "gif") {
    return stripGif(bytes)
  }
  if (codec === "bmp") {
    return stripBmp(bytes)
  }
  if (codec === "tiff") {
    return stripTiff(bytes)
  }
  if (codec === undefined) {
    return { ok: false, reason: "not a raster image" }
  }
  return { ok: true, bytes, removed: false, labels: [], applicable: false }
}
