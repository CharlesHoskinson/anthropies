import { applyLayerA, type LayerARemoved } from "../layer-a.js"

export interface SvgInspect {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
}

export interface SvgClean {
  readonly text: string
  readonly bytes: Uint8Array
  readonly removed: LayerARemoved
  readonly labels: ReadonlyArray<string>
}

const META_RE = /<metadata\b[^>]*>.*?<\/metadata\s*>/gius
const XMP_RE = /<x:xmpmeta\b[^>]*>.*?<\/x:xmpmeta\s*>/gius
const RDF_RE = /<rdf:RDF\b[^>]*>.*?<\/rdf:RDF\s*>/gius

/** Inspect planted SVG metadata / XMP / C2PA markers. */
export const inspectSvgText = (text: string): SvgInspect => {
  const labels: Array<string> = []
  if (/<metadata[\s>]/iu.test(text)) {
    labels.push("svg-metadata")
  }
  if (/xmpmeta|rdf:RDF|contentcredentials/iu.test(text)) {
    labels.push("svg-xmp")
  }
  if (/c2pa|jumbf/iu.test(text)) {
    labels.push("c2pa")
  }
  return { present: labels.length > 0, labels }
}

/** Drop `<metadata>` and XMP packets. */
export const stripSvgMeta = (text: string): { readonly text: string; readonly labels: ReadonlyArray<string> } => {
  const labels: Array<string> = []
  let out = text
  const meta = out.replace(META_RE, "")
  if (meta !== out) {
    labels.push("svg-metadata")
    out = meta
  }
  const xmp = out.replace(XMP_RE, "")
  if (xmp !== out) {
    labels.push("svg-xmp")
    out = xmp
  }
  const rdf = out.replace(RDF_RE, "")
  if (rdf !== out) {
    labels.push("svg-xmp")
    out = rdf
  }
  return { text: out, labels }
}

/** Strip `<metadata>` / XMP, then Layer A on remaining text. */
export const cleanSvgText = (text: string): SvgClean => {
  const stripped = stripSvgMeta(text)
  const layered = applyLayerA(stripped.text)
  return {
    text: layered.text,
    bytes: new TextEncoder().encode(layered.text),
    removed: layered.removed,
    labels: stripped.labels
  }
}
