import * as Args from "@effect/cli/Args"
import * as CliCommand from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as Prompt from "@effect/cli/Prompt"
import { NodeContext, NodeHttpClient, NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Cause, Console, Effect, Exit, Layer, Option, Redacted, Schema } from "effect"
import { createServer } from "node:http"
import {
  applyRewriteSetup,
  loadConfigFile,
  saveConfigFile,
  validateRewriteSetup
} from "./config-file.js"
import { rewriteConfigPath } from "./config.js"
import { RewriteFailed } from "./fail.js"
import { defaultServeHost, defaultServePort } from "./http/openapi.js"
import { HttpApp } from "./http/server.js"
import { residualDrivesExit } from "./report.js"
import { assertRewriteUrlAllowed } from "./rewrite-backend.js"
import { Capturer, runDemo } from "./services/capturer.js"
import { Cleaner } from "./services/cleaner.js"
import { Humanizer } from "./services/humanizer.js"
import { Inspector } from "./services/inspector.js"
import { Reporter } from "./services/reporter.js"

const pathArg = Args.file({ name: "path" }).pipe(Args.withDescription("Path to an owned file"))

const jsonOpt = Options.boolean("json").pipe(
  Options.withDescription("Write Schema.encode JSON to stdout only")
)

const forceTextOpt = Options.boolean("force-text").pipe(
  Options.withDescription("Treat bytes as text after classify")
)

const inPlaceOpt = Options.boolean("in-place").pipe(
  Options.withDescription("Overwrite the input path")
)

const outputOpt = Options.file("output", { exists: "either" }).pipe(
  Options.withAlias("o"),
  Options.optional,
  Options.withDescription("Destination path")
)

const kindOpt = Options.choice("kind", ["prose", "code"] as const).pipe(
  Options.optional,
  Options.withDescription("Rewrite domain: prose or code")
)

class ResidualHits extends Schema.TaggedError<ResidualHits>()("ResidualHits", {
  path: Schema.String
}) {}

const failTags = new Set([
  "BinaryInput",
  "OriginBlocked",
  "MissingApiKey",
  "PreMarkModel",
  "DecodeError",
  "WriteGuard",
  "InputTooLarge",
  "RewriteFailed",
  "RewriteRemoteDenied"
])



const modelOpt = Options.text("model").pipe(Options.withDescription("Pinned model ID. Unknown IDs are PreMarkModel."))

const promptOpt = Options.text("prompt").pipe(
  Options.withDescription("Prompt for a Claude Output you own. Does not watermark.")
)

const inspect = CliCommand.make(
  "inspect",
  { path: pathArg, json: jsonOpt, forceText: forceTextOpt },
  ({ path, json, forceText }) =>
    Effect.gen(function* () {
      const report = yield* Inspector.inspect(path, { forceText, json })
      yield* Reporter.print(report, json)
      if (residualDrivesExit(report)) {
        return yield* new ResidualHits({ path })
      }
    })
).pipe(CliCommand.withDescription("Report marks by channel. Never a single watermark score."))

const clean = CliCommand.make(
  "clean",
  {
    path: pathArg,
    json: jsonOpt,
    forceText: forceTextOpt,
    inPlace: inPlaceOpt,
    output: outputOpt
  },
  ({ path, json, forceText, inPlace, output }) =>
    Effect.gen(function* () {
      const { report } = yield* Cleaner.clean(path, {
        forceText,
        json,
        inPlace,
        ...(Option.isSome(output) ? { output: output.value } : {})
      })
      yield* Reporter.print(report, json)
      if (residualDrivesExit(report)) {
        return yield* new ResidualHits({ path })
      }
    })
).pipe(
  CliCommand.withDescription(
    "Strip deterministic Layer A and hard-bound C2PA/metadata. Does not remove the keyed text mark."
  )
)

const humanize = CliCommand.make(
  "humanize",
  {
    path: pathArg,
    json: jsonOpt,
    forceText: forceTextOpt,
    inPlace: inPlaceOpt,
    output: outputOpt,
    kind: kindOpt
  },
  ({ path, json, forceText, inPlace, output, kind }) =>
    Effect.gen(function* () {
      const { report, note } = yield* Humanizer.humanizeFile(path, {
        forceText,
        json,
        inPlace,
        ...(Option.isSome(output) ? { output: output.value } : {}),
        ...(Option.isSome(kind) ? { kind: kind.value } : {})
      })
      yield* Console.error(note)
      yield* Reporter.print(report, json)
      if (residualDrivesExit(report)) {
        return yield* new ResidualHits({ path })
      }
    }).pipe(Effect.provide(NodeHttpClient.layer))
).pipe(
  CliCommand.withDescription(
    "Title restoration: rewrite wording on a non-origin model (best-effort). Refuses Claude and Gemini. print-prompt does not destamp."
  )
)

const capture = CliCommand.make("capture", { model: modelOpt, prompt: promptOpt }, ({ model, prompt }) =>
  Effect.gen(function* () {
    const result = yield* Capturer.capture({ model, prompt })
    yield* Console.error(`wrote ${result.path}`)
  }).pipe(Effect.provide(NodeHttpClient.layer))
).pipe(CliCommand.withDescription("Fetch a Claude Output you own, for fixtures. Does not watermark."))

const demo = CliCommand.make("demo", {}, () => runDemo().pipe(Effect.provide(NodeHttpClient.layer))).pipe(
  CliCommand.withDescription(
    "capture → inspect → clean → humanize → inspect. Prints four channels. Never claims official text-kill."
  )
)

const hostOpt = Options.text("host").pipe(
  Options.withDefault(defaultServeHost),
  Options.withDescription(
    `Bind address. Defaults to ${defaultServeHost}. Remote bind requires an explicit --host.`
  )
)

const portOpt = Options.integer("port").pipe(
  Options.withDefault(defaultServePort),
  Options.withDescription(`Bind port. Defaults to ${String(defaultServePort)}.`)
)

const serve = CliCommand.make("serve", { host: hostOpt, port: portOpt }, ({ host, port }) =>
  Effect.gen(function* () {
    yield* Console.error(`listening on http://${host}:${String(port)}`)
    yield* Layer.launch(
      HttpApp.pipe(Layer.provide(NodeHttpServer.layer(createServer, { host, port })))
    )
  })
).pipe(
  CliCommand.withDescription(
    "Serve inspect and clean on loopback. Does not humanize. Never claims official text-kill."
  )
)

const initPrompt = Prompt.all({
  backend: Prompt.select({
    message: "Rewrite backend?",
    choices: [
      { title: "print-prompt (default)", value: "print-prompt", description: "Print the prompt, no HTTP call" },
      { title: "ollama", value: "ollama", description: "Local Ollama instance" },
      { title: "openai-compatible", value: "openai-compatible", description: "Any OpenAI-compatible API" }
    ]
  }),
  model: Prompt.text({
    message: "Model name (e.g. llama3.2, gpt-4o)?",
    default: ""
  }),
  baseUrl: Prompt.text({
    message: "Base URL (e.g. http://127.0.0.1:11434)?",
    default: "http://127.0.0.1:11434"
  }),
  apiKey: Prompt.password({
    message: "API key (leave empty if not required)?"
  }),
  allowRemote: Prompt.confirm({
    message: "Allow non-loopback URLs (required for remote endpoints)?"
  })
})

const initRewrite = CliCommand.prompt("init-rewrite", initPrompt, ({ backend, model, baseUrl, apiKey, allowRemote }) =>
  Effect.gen(function* () {
    const path = yield* rewriteConfigPath.pipe(Effect.orDie)
    const key = Redacted.value(apiKey)
    const setup = { backend, model, baseUrl, apiKey: key, allowRemote }
    const setupError = validateRewriteSetup(setup)
    if (setupError !== undefined) {
      return yield* new RewriteFailed({ path, reason: setupError })
    }
    if (backend !== "print-prompt") {
      yield* assertRewriteUrlAllowed(baseUrl.trim(), allowRemote ? "1" : "0", path)
    }
    const config = applyRewriteSetup(loadConfigFile(path), setup)
    saveConfigFile(config, path)
    yield* Console.error(`wrote ${path}`)
    yield* Console.error("POSIX mode 0600 (owner read/write). Windows uses profile ACLs.")
  })
).pipe(CliCommand.withDescription("Interactive setup for the rewrite backend: write ~/.anthropies/config.json"))

export const cli = CliCommand.make("anthropies").pipe(
  CliCommand.withDescription("Restore clean title in Outputs the user already owns."),
  CliCommand.withSubcommands([inspect, clean, humanize, capture, demo, serve, initRewrite])
)

const run = CliCommand.run(cli, { name: "anthropies", version: "1.0.0" })

const services = Layer.mergeAll(
  Inspector.Default,
  Cleaner.Default,
  Humanizer.Default,
  Reporter.Default,
  Capturer.Default
)

const tagOf = (u: unknown): string | undefined => {
  if (typeof u === "object" && u !== null && "_tag" in u) {
    return String(u._tag)
  }
  return undefined
}

const reasonOf = (u: unknown): string => {
  if (typeof u === "object" && u !== null && "reason" in u) {
    return String(u.reason)
  }
  return ""
}

const teardown = (exit: Exit.Exit<unknown, unknown>, onExit: (code: number) => void): void => {
  if (Exit.isSuccess(exit)) {
    onExit(0)
    return
  }
  const fail = Cause.failureOption(exit.cause)
  if (Option.isSome(fail)) {
    const tag = tagOf(fail.value)
    if (tag === "ResidualHits") {
      onExit(1)
      return
    }
    if (tag !== undefined && failTags.has(tag)) {
      onExit(2)
      return
    }
  }
  onExit(1)
}

NodeRuntime.runMain(
  run(process.argv).pipe(
    Effect.provide(services),
    Effect.provide(NodeContext.layer),
    Effect.tapError((e) => {
      if (tagOf(e) === "ResidualHits") {
        return Effect.void
      }
      const tag = tagOf(e)
      if (tag === undefined) {
        return Effect.void
      }
      return Console.error(`${tag}: ${reasonOf(e)}`)
    })
  ),
  { disableErrorReporting: true, teardown }
)
