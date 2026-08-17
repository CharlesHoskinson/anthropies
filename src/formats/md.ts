import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { AI_FRONTMATTER_KEYS, isAiMetaToken } from "./meta-keys.js"

export interface MdInspect {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
}

export interface MdClean {
  readonly text: string
  readonly bytes: Uint8Array
  readonly removed: LayerARemoved
  readonly labels: ReadonlyArray<string>
}

const FM_RE = /^---\r?\n(.*?)\r?\n---\r?\n?/su
const KEY_RE = /^([A-Za-z0-9_.-]+)\s*:/

const isAiKeyLine = (key: string, line: string): boolean => {
  const val = line.includes(":") ? line.slice(line.indexOf(":") + 1) : ""
  return AI_FRONTMATTER_KEYS.has(key.toLowerCase()) || isAiMetaToken(key) || isAiMetaToken(val)
}

const parseFrontmatter = (
  text: string
): { readonly block: string; readonly body: string; readonly end: number } | undefined => {
  const m = FM_RE.exec(text)
  if (m === null || m[1] === undefined) {
    return undefined
  }
  return { block: m[1], body: text.slice(m[0].length), end: m[0].length }
}

/** Inspect YAML frontmatter AI keys. */
export const inspectMdText = (text: string): MdInspect => {
  const fm = parseFrontmatter(text)
  if (fm === undefined) {
    return { present: false, labels: [] }
  }
  const labels: Array<string> = []
  for (const line of fm.block.split(/\r?\n/)) {
    const km = KEY_RE.exec(line)
    if (km === null || km[1] === undefined) {
      continue
    }
    if (isAiKeyLine(km[1], line)) {
      labels.push(`frontmatter:${km[1]}`)
    }
  }
  return { present: labels.length > 0, labels }
}

const stripFrontmatter = (text: string): { readonly text: string; readonly labels: ReadonlyArray<string> } => {
  const fm = parseFrontmatter(text)
  if (fm === undefined) {
    return { text, labels: [] }
  }
  const labels: Array<string> = []
  const kept: Array<string> = []
  let dropping = false
  for (const line of fm.block.split(/\r?\n/)) {
    const stripped = line.trim()
    if (stripped.length === 0 || stripped.startsWith("#")) {
      if (!dropping) {
        kept.push(line)
      }
      continue
    }
    if (line.startsWith(" ") || line.startsWith("\t") || line.startsWith("-")) {
      if (!dropping) {
        kept.push(line)
      }
      continue
    }
    const km = KEY_RE.exec(line)
    if (km === null || km[1] === undefined) {
      dropping = false
      kept.push(line)
      continue
    }
    if (isAiKeyLine(km[1], line)) {
      labels.push(`frontmatter:${km[1]}`)
      dropping = true
      continue
    }
    dropping = false
    kept.push(line)
  }
  if (labels.length === 0) {
    return { text, labels }
  }
  const newBlock = kept.join("\n").replace(/^\n+|\n+$/g, "")
  if (newBlock.length === 0) {
    return { text: fm.body.replace(/^\n+/, ""), labels }
  }
  return { text: `---\n${newBlock}\n---\n${fm.body}`, labels }
}

/** Drop YAML frontmatter AI keys, then Layer A on the body. */
export const cleanMdText = (text: string): MdClean => {
  const stripped = stripFrontmatter(text)
  const layered = applyLayerA(stripped.text)
  return {
    text: layered.text,
    bytes: new TextEncoder().encode(layered.text),
    removed: layered.removed,
    labels: stripped.labels
  }
}
