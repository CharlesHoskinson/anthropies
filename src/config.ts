import { Config } from "effect"
import { configPath } from "./config-file.js"

export const rewriteBackends = ["print-prompt", "ollama", "openai-compatible"] as const
export type RewriteBackend = (typeof rewriteBackends)[number]

const rewriteBackendConfig = Config.literal(...rewriteBackends)("ANTHROPIES_REWRITE_BACKEND")

/** Required at capture / demo / test:live time. Unset is a value, not a throw. */
export const anthropicApiKey = Config.option(Config.redacted("ANTHROPIC_API_KEY"))

/** Unset yields OfficialFinding Unavailable. No default URL. */
export const anthropicDetectUrl = Config.option(Config.string("ANTHROPIC_DETECT_URL"))

/** Unset means the HTTP service does not require Authorization. */
export const serverApiKey = Config.option(Config.redacted("ANTHROPIES_SERVER_API_KEY"))

/** print-prompt by default. ollama and openai-compatible POST to the rewrite URL. */
export const rewriteBackend = rewriteBackendConfig.pipe(Config.withDefault("print-prompt"))

/** Optional env override. Absent means "use config file or default". */
export const rewriteBackendEnv = Config.option(rewriteBackendConfig)

/** Model name for a rewrite backend. */
export const rewriteModel = Config.option(Config.string("ANTHROPIES_REWRITE_MODEL"))

/** Loopback default for local rewrite backends. */
export const rewriteBaseUrl = Config.string("ANTHROPIES_REWRITE_BASE_URL").pipe(
  Config.withDefault("http://127.0.0.1:11434")
)

/** Optional env override. Absent means "use config file or default". */
export const rewriteBaseUrlEnv = Config.option(Config.string("ANTHROPIES_REWRITE_BASE_URL"))

/** Rewrite backend credential. Env only, never flags. */
export const rewriteApiKey = Config.option(Config.redacted("ANTHROPIES_REWRITE_API_KEY"))

/** Set to 1 to allow a non-loopback rewrite URL. */
export const rewriteAllowRemote = Config.string("ANTHROPIES_REWRITE_ALLOW_REMOTE").pipe(
  Config.withDefault("0")
)

/** Optional env override. Absent means "use config file or default". */
export const rewriteAllowRemoteEnv = Config.option(Config.string("ANTHROPIES_REWRITE_ALLOW_REMOTE"))

/** Config file location. Override in isolated environments such as tests. */
export const rewriteConfigPath = Config.string("ANTHROPIES_CONFIG_PATH").pipe(
  Config.withDefault(configPath())
)

/** All env knobs as Config. Never read process.env in library code. */
export const appConfig = Config.all({
  anthropicApiKey,
  anthropicDetectUrl,
  serverApiKey,
  rewriteBackend,
  rewriteModel,
  rewriteBaseUrl,
  rewriteApiKey,
  rewriteAllowRemote
})
