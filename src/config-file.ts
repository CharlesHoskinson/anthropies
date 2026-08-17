import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { Option, Schema } from "effect"

export interface RewriteConfig {
  readonly backend?: "print-prompt" | "ollama" | "openai-compatible"
  readonly model?: string
  readonly baseUrl?: string
  readonly apiKey?: string
  readonly allowRemote?: boolean
}

export interface AnthropiesConfig {
  readonly rewrite?: RewriteConfig
}

export interface RewriteSetup {
  readonly backend: "print-prompt" | "ollama" | "openai-compatible"
  readonly model: string
  readonly baseUrl: string
  readonly apiKey: string
  readonly allowRemote: boolean
}

const RewriteConfigSchema = Schema.Struct({
  backend: Schema.optional(Schema.Literal("print-prompt", "ollama", "openai-compatible")),
  model: Schema.optional(Schema.String),
  baseUrl: Schema.optional(Schema.String),
  apiKey: Schema.optional(Schema.String),
  allowRemote: Schema.optional(Schema.Boolean)
})

const ConfigSchema = Schema.Struct({
  rewrite: Schema.optional(RewriteConfigSchema)
})

export const configDir = (): string => join(homedir(), ".anthropies")
export const configPath = (): string => join(configDir(), "config.json")

export const validateRewriteSetup = (setup: RewriteSetup): string | undefined =>
  setup.backend !== "print-prompt" && setup.model.trim() === ""
    ? "model is required for ollama and openai-compatible rewrite backends"
    : undefined

/** Apply the answers from one setup run. Blank and false answers clear old values. */
export const applyRewriteSetup = (
  existing: AnthropiesConfig,
  setup: RewriteSetup
): AnthropiesConfig => {
  if (setup.backend === "print-prompt") {
    return {
      ...existing,
      rewrite: { backend: "print-prompt", allowRemote: false }
    }
  }
  const model = setup.model.trim()
  const baseUrl = setup.baseUrl.trim()
  return {
    ...existing,
    rewrite: {
      backend: setup.backend,
      model,
      baseUrl,
      ...(setup.apiKey !== "" ? { apiKey: setup.apiKey } : {}),
      allowRemote: setup.allowRemote
    }
  }
}

/** Read ~/.anthropies/config.json. Returns empty object if missing or invalid. */
export const loadConfigFile = (path: string = configPath()): AnthropiesConfig => {
  if (!existsSync(path)) {
    return {}
  }
  try {
    const raw = readFileSync(path, "utf-8")
    const parsed: unknown = JSON.parse(raw)
    const decoded = Schema.decodeUnknownOption(ConfigSchema)(parsed)
    if (Option.isNone(decoded)) {
      return {}
    }
    const value = decoded.value as AnthropiesConfig
    return value.rewrite !== undefined ? { rewrite: value.rewrite } : {}
  } catch {
    return {}
  }
}

/** Write ~/.anthropies/config.json with 0600 permissions. Creates the directory if needed. */
export const saveConfigFile = (config: AnthropiesConfig, path: string = configPath()): string => {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", { encoding: "utf-8" })
  chmodSync(path, 0o600)
  return path
}
