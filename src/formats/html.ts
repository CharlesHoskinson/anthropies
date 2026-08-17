import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { isAiMetaToken } from "./meta-keys.js"

export interface HtmlInspect {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
}

export interface HtmlClean {
  readonly text: string
  readonly bytes: Uint8Array
  readonly removed: LayerARemoved
  readonly labels: ReadonlyArray<string>
}

const META_TAG_RE = /<meta\b[^>]*>/giu
const JSONLD_RE = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>.*?<\/script>/gius
const DATA_AI_RE = /\sdata-ai[\w-]*\s*=\s*["'][^"']*["']/giu
const JSONLD_AI_RE = /DigitalSourceType|trainedAlgorithmicMedia|SoftwareAgent|c2pa|contentcredential/iu

const generatorish = (tag: string): boolean =>
  /generator/iu.test(tag) || isAiMetaToken(tag) || /c2pa|content.?credential/iu.test(tag)

/** Inspect HTML generator / data-ai* / JSON-LD AI keys. */
export const inspectHtmlText = (text: string): HtmlInspect => {
  const labels: Array<string> = []
  for (const tag of text.match(META_TAG_RE) ?? []) {
    if (generatorish(tag)) {
      labels.push("html-generator")
    }
  }
  if (JSONLD_RE.test(text) && JSONLD_AI_RE.test(text)) {
    labels.push("html-jsonld")
  }
  JSONLD_RE.lastIndex = 0
  if (DATA_AI_RE.test(text)) {
    labels.push("html-data-ai")
  }
  DATA_AI_RE.lastIndex = 0
  return { present: labels.length > 0, labels }
}

const stripHtmlMeta = (text: string): { readonly text: string; readonly labels: ReadonlyArray<string> } => {
  const labels: Array<string> = []
  let out = text.replace(META_TAG_RE, (tag) => {
    if (generatorish(tag)) {
      labels.push("html-generator")
      return ""
    }
    return tag
  })
  out = out.replace(JSONLD_RE, (blob) => {
    if (JSONLD_AI_RE.test(blob) || isAiMetaToken(blob)) {
      labels.push("html-jsonld")
      return ""
    }
    return blob
  })
  const withoutAi = out.replace(DATA_AI_RE, "")
  if (withoutAi !== out) {
    labels.push("html-data-ai")
    out = withoutAi
  }
  return { text: out, labels }
}

/** Strip generator / data-ai* / JSON-LD AI keys, then Layer A on the body. */
export const cleanHtmlText = (text: string): HtmlClean => {
  const stripped = stripHtmlMeta(text)
  const layered = applyLayerA(stripped.text)
  return {
    text: layered.text,
    bytes: new TextEncoder().encode(layered.text),
    removed: layered.removed,
    labels: stripped.labels
  }
}
