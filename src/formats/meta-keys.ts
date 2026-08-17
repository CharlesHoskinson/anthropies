/** Frontmatter / meta keys that carry AI provenance. */
export const AI_FRONTMATTER_KEYS = new Set([
  "generator",
  "ai",
  "ai_generated",
  "ai-generated",
  "claude",
  "anthropic",
  "openai",
  "gemini",
  "synthid",
  "c2pa",
  "content_credentials",
  "contentcredentials",
  "provenance",
  "digital_source_type",
  "digitalsourcetype",
  "created_with",
  "createdwith",
  "model",
  "llm"
])

const AI_META_NAME_RE =
  /generator|ai[-_ ]?generated|claude|anthropic|openai|gemini|synthid|c2pa|content.?credential|provenance|digital.?source|aigc/iu

/** True when a key or value looks like AI / C2PA provenance. */
export const isAiMetaToken = (value: string): boolean =>
  AI_FRONTMATTER_KEYS.has(value.toLowerCase()) || AI_META_NAME_RE.test(value)
