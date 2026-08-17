import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { isAiMetaToken } from "./meta-keys.js"
import { unzipCapped, zipExpansionCapBytes, zipMembers, type ZipMember } from "./zip.js"
import type { OfficeClean, OfficeFail, OfficeInspect } from "./docx.js"

const emptyLayer = (): LayerARemoved => ({ unicode: 0, trailer: 0, banner: 0 })

const addLayer = (a: LayerARemoved, b: LayerARemoved): LayerARemoved => ({
  unicode: a.unicode + b.unicode,
  trailer: a.trailer + b.trailer,
  banner: a.banner + b.banner
})

const decode = (data: Uint8Array): string => new TextDecoder("utf-8", { fatal: false }).decode(data)
const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

const TP_RE = /(<text:p\b[^>]*>)(.*?)(<\/text:p>)/gsu
const GEN_RE = /<meta:generator\b[^>]*>.*?<\/meta:generator\s*>/gius
const CREATOR_RE = /<dc:creator\b[^>]*>.*?<\/dc:creator\s*>/gius

const layerTextP = (xml: string): { readonly text: string; readonly removed: LayerARemoved } => {
  let removed = emptyLayer()
  const text = xml.replace(TP_RE, (_m, open: string, inner: string, close: string) => {
    const layered = applyLayerA(inner)
    removed = addLayer(removed, layered.removed)
    return `${open}${layered.text}${close}`
  })
  return { text, removed }
}

const inspectMembers = (members: ReadonlyArray<ZipMember>): OfficeInspect => {
  const labels: Array<string> = []
  let layer = emptyLayer()
  for (const member of members) {
    const text = decode(member.data)
    if (member.name === "meta.xml") {
      if (/meta:generator/iu.test(text) || isAiMetaToken(text) || /c2pa/iu.test(text)) {
        labels.push("meta.xml")
      }
    }
    if (member.name === "content.xml") {
      const hits = layerTextP(text)
      layer = addLayer(layer, hits.removed)
    }
  }
  return { present: labels.length > 0, labels, layer }
}

/** Inspect ODT meta.xml and Layer A on paragraph text. */
export const inspectOdt = (
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

/** Scrub ODT meta.xml and Layer A on `text:p` nodes. */
export const cleanOdt = (
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
    let data = member.data
    if (member.name === "meta.xml") {
      let xml = decode(data)
      const droppedGen = xml.replace(GEN_RE, "")
      if (droppedGen !== xml) {
        labels.push("meta:generator")
        xml = droppedGen
      }
      const droppedCreator = xml.replace(CREATOR_RE, (blob) => {
        if (isAiMetaToken(blob)) {
          labels.push("meta:creator")
          return ""
        }
        return blob
      })
      xml = droppedCreator
      data = encode(xml)
    }
    if (member.name === "content.xml") {
      const layered = layerTextP(decode(data))
      removed = addLayer(removed, layered.removed)
      data = encode(layered.text)
    }
    kept.push({ name: member.name, data })
  }
  return { ok: true, bytes: zipMembers(kept), removed, labels }
}
