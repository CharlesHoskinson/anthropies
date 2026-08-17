import * as Args from "@effect/cli/Args"
import * as CliCommand from "@effect/cli/Command"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const pathArg = Args.file({ name: "path" }).pipe(Args.withDescription("Path to an owned file"))

const stub = (name: string): Effect.Effect<void> =>
  Console.error(`${name} is not implemented`)

const inspect = CliCommand.make("inspect", { path: pathArg }, () => stub("inspect")).pipe(
  CliCommand.withDescription("Report marks by channel. Never a single watermark score.")
)

const clean = CliCommand.make("clean", { path: pathArg }, () => stub("clean")).pipe(
  CliCommand.withDescription(
    "Strip deterministic Layer A and hard-bound C2PA/metadata. Does not remove the keyed text mark."
  )
)

const humanize = CliCommand.make("humanize", { path: pathArg }, () => stub("humanize")).pipe(
  CliCommand.withDescription(
    "Rewrite wording on a non-origin model (best-effort). Refuses Claude and Gemini."
  )
)

const capture = CliCommand.make("capture", {}, () => stub("capture")).pipe(
  CliCommand.withDescription("Fetch a Claude Output you own, for fixtures. Does not watermark.")
)

const demo = CliCommand.make("demo", {}, () => stub("demo")).pipe(
  CliCommand.withDescription(
    "capture → inspect → clean → humanize → inspect. Prints four channels. Never claims official text-kill."
  )
)

export const cli = CliCommand.make("anthropies").pipe(
  CliCommand.withDescription("Restore clean title in Outputs the user already owns."),
  CliCommand.withSubcommands([inspect, clean, humanize, capture, demo])
)

const run = CliCommand.run(cli, { name: "anthropies", version: "0.2.0" })

NodeRuntime.runMain(run(process.argv).pipe(Effect.provide(NodeContext.layer)))
