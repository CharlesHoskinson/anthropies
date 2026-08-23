import { Config } from "effect"

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

/** Model name for a rewrite backend. */
export const rewriteModel = Config.option(Config.string("ANTHROPIES_REWRITE_MODEL"))

/** Loopback default for local rewrite backends. */
export const rewriteBaseUrl = Config.string("ANTHROPIES_REWRITE_BASE_URL").pipe(
  Config.withDefault("http://127.0.0.1:11434")
)

/** Rewrite backend credential. Env only, never flags. */
export const rewriteApiKey = Config.option(Config.redacted("ANTHROPIES_REWRITE_API_KEY"))

/** Set to 1 to allow a non-loopback rewrite URL. */
export const rewriteAllowRemote = Config.string("ANTHROPIES_REWRITE_ALLOW_REMOTE").pipe(
  Config.withDefault("0")
)

/** Operator checkout of pinned THU-BPM/MarkLLM. Unset → optional pack unavailable. */
export const markllmDir = Config.option(Config.string("MARKLLM_DIR"))

/** Operator checkout of pinned THU-BPM/MarkDiffusion. Unset → optional pack unavailable. */
export const markDiffusionDir = Config.option(Config.string("MARKDIFFUSION_DIR"))

/** Operator-supplied CtrlRegen-method weights path. Unset → optional pack unavailable. */
export const ctrlRegenWeights = Config.option(Config.string("CTRLREGEN_WEIGHTS"))

/** Runner for MarkLLM detect entry. Defaults to python3; tests may set process.execPath. */
export const markllmRunner = Config.string("MARKLLM_RUNNER").pipe(Config.withDefault("python3"))

/** Runner for MarkDiffusion detect entry. Defaults to python3. */
export const markDiffusionRunner = Config.string("MARKDIFFUSION_RUNNER").pipe(
  Config.withDefault("python3")
)

/**
 * Loopback base URL for the optional image-scoring sidecar.
 * Unset → pack probe reports unavailable (optional-absent).
 * Default resolved URL for operators is http://127.0.0.1:18765 (see packs/image-scoring.ts).
 */
export const imageScoringBaseUrl = Config.option(Config.string("IMAGE_SCORING_BASE_URL"))

/** All env knobs as Config. Never read process.env in library code. */
export const appConfig = Config.all({
  anthropicApiKey,
  anthropicDetectUrl,
  serverApiKey,
  rewriteBackend,
  rewriteModel,
  rewriteBaseUrl,
  rewriteApiKey,
  rewriteAllowRemote,
  markllmDir,
  markDiffusionDir,
  ctrlRegenWeights,
  markllmRunner,
  markDiffusionRunner,
  imageScoringBaseUrl
})
