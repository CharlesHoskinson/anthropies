import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { unzipCapped, zipExpansionCapBytes, zipMembers, type ZipMember } from "./zip.js"

export interface OfficeInspect {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
  readonly layer: LayerARemoved
}

export interface OfficeClean {
  readonly bytes: Uint8Array
  readonly removed: LayerARemoved
  readonly labels: ReadonlyArray<string>
}

export type OfficeFail = { readonly ok: false; readonly reason: string }

const emptyLayer = (): LayerARemoved => ({ unicode: 0, trailer: 0, banner: 0 })

const addLayer = (a: LayerARemoved, b: LayerARemoved): LayerARemoved => ({
  unicode: a.unicode + b.unicode,
  trailer: a.trailer + b.trailer,
  banner: a.banner + b.banner
})

const isMetaPart = (name: string): boolean =>
  name.startsWith("docProps/") || name.startsWith("customXml/")

const WT_RE = /(<w:t\b[^>]*>)(.*?)(<\/w:t>)/gsu

const SCRUB_FIELDS = [
  "dc:creator",
  "cp:lastModifiedBy",
  "dc:description",
  "cp:keywords",
  "dc:subject",
  "cp:category",
  "Application",
  "AppVersion",
  "Company",
  "Manager"
] as const

const decode = (data: Uint8Array): string => new TextDecoder("utf-8", { fatal: false }).decode(data)
const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

const scrubFields = (xml: string, name: string, labels: Array<string>): string => {
  let out = xml
  for (const tag of SCRUB_FIELDS) {
    const re = new RegExp(`(<${tag}\\b[^>]*>)(.*?)(</${tag}>)`, "gius")
    out = out.replace(re, (_m, open: string, inner: string, close: string) => {
      if (inner.length > 0) {
        labels.push(`${name}:${tag}`)
      }
      return `${open}${close}`
    })
  }
  return out
}

const layerWt = (xml: string): { readonly text: string; readonly removed: LayerARemoved } => {
  let removed = emptyLayer()
  const text = xml.replace(WT_RE, (_m, open: string, inner: string, close: string) => {
    const layered = applyLayerA(inner)
    removed = addLayer(removed, layered.removed)
    return `${open}${layered.text}${close}`
  })
  return { text, removed }
}

const posixJoin = (base: string, target: string): string => {
  const joined = base.length === 0 ? target : `${base}/${target}`
  const parts: Array<string> = []
  for (const part of joined.split("/")) {
    if (part === "" || part === ".") {
      continue
    }
    if (part === "..") {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.join("/")
}

const relsDir = (relsName: string): string => {
  const cut = relsName.lastIndexOf("/")
  const parent = cut === -1 ? "" : relsName.slice(0, cut)
  const cut2 = parent.lastIndexOf("/")
  return cut2 === -1 ? "" : parent.slice(0, cut2)
}

const pruneRels = (
  relsName: string,
  raw: Uint8Array,
  kept: ReadonlySet<string>,
  labels: Array<string>
): Uint8Array => {
  const base = relsDir(relsName)
  let n = 0
  const text = decode(raw).replace(/<Relationship\b[^>]*\/>/giu, (tag) => {
    if (/\bTargetMode\s*=/iu.test(tag)) {
      return tag
    }
    const tm = /\bTarget\s*=\s*"([^"]*)"/iu.exec(tag)
    const target = tm?.[1]
    if (target === undefined || target === "/" || target.length === 0) {
      return tag
    }
    const resolved = target.startsWith("/") ? posixJoin("", target.slice(1)) : posixJoin(base, target)
    if (resolved.length === 0 || kept.has(resolved)) {
      return tag
    }
    n += 1
    return ""
  })
  if (n > 0) {
    labels.push(`rels:${relsName}`)
  }
  return encode(text)
}

const dropContentTypes = (xml: string, labels: Array<string>): string => {
  let out = xml
  const custom = out.replace(/<Override\b[^>]*PartName="\/customXml\/[^"]*"[^>]*\/>/gu, "")
  if (custom !== out) {
    labels.push("content-types:customXml")
    out = custom
  }
  const props = out.replace(/<Override\b[^>]*PartName="\/docProps\/custom\.xml"[^>]*\/>/gu, "")
  if (props !== out) {
    labels.push("content-types:custom.xml")
    out = props
  }
  return out
}

const inspectMembers = (members: ReadonlyArray<ZipMember>): OfficeInspect => {
  const labels: Array<string> = []
  let layer = emptyLayer()
  for (const member of members) {
    if (isMetaPart(member.name)) {
      const text = decode(member.data)
      if (/c2pa|jumbf|contentcredential/iu.test(text) || /claude|anthropic|openai|gemini|generator/iu.test(text)) {
        labels.push(member.name)
      }
      if (member.name.startsWith("customXml/")) {
        labels.push(member.name)
      }
    }
    if (member.name.startsWith("word/") && member.name.endsWith(".xml")) {
      const text = decode(member.data)
      const hits = layerWt(text)
      layer = addLayer(layer, hits.removed)
    }
  }
  return { present: labels.length > 0, labels, layer }
}

/** Inspect DOCX docProps / customXml and Layer A on `w:t`. */
export const inspectDocx = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): { readonly ok: true } & OfficeInspect | OfficeFail => {
  const unzipped = unzipCapped(bytes, path, cap)
  if (!unzipped.ok) {
    return unzipped
  }
  return { ok: true, ...inspectMembers(unzipped.members) }
}

/** Scrub DOCX props, prune dangling rels, Layer A on `w:t`. */
export const cleanDocx = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): { readonly ok: true } & OfficeClean | OfficeFail => {
  const unzipped = unzipCapped(bytes, path, cap)
  if (!unzipped.ok) {
    return unzipped
  }
  const labels: Array<string> = []
  let removed = emptyLayer()
  const kept: Array<ZipMember> = []
  for (const member of unzipped.members) {
    if (member.name.startsWith("customXml/") || member.name === "docProps/custom.xml") {
      labels.push(`drop:${member.name}`)
      continue
    }
    let data = member.data
    if (member.name.startsWith("docProps/")) {
      data = encode(scrubFields(decode(data), member.name, labels))
    }
    if (member.name === "[Content_Types].xml") {
      data = encode(dropContentTypes(decode(data), labels))
    }
    if (member.name.startsWith("word/") && member.name.endsWith(".xml")) {
      const layered = layerWt(decode(data))
      removed = addLayer(removed, layered.removed)
      data = encode(layered.text)
    }
    kept.push({ name: member.name, data })
  }
  const names = new Set(kept.map((m) => m.name))
  const final: Array<ZipMember> = kept.map((member) =>
    member.name.endsWith(".rels")
      ? { name: member.name, data: pruneRels(member.name, member.data, names, labels) }
      : member
  )
  return { ok: true, bytes: zipMembers(final), removed, labels }
}
