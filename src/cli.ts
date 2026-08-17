import * as Args from "@effect/cli/Args"
import * as CliCommand from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import { NodeContext, NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Cause, Console, Effect, Exit, Layer, Option, Schema } from "effect"
import { residualDrivesExit } from "./report.js"
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
  "InputTooLarge"
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
    })
).pipe(
  CliCommand.withDescription(
    "Rewrite wording on a non-origin model (best-effort). Refuses Claude and Gemini."
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

export const cli = CliCommand.make("anthropies").pipe(
  CliCommand.withDescription("Restore clean title in Outputs the user already owns."),
  CliCommand.withSubcommands([inspect, clean, humanize, capture, demo])
)

const run = CliCommand.run(cli, { name: "anthropies", version: "0.2.0" })

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
