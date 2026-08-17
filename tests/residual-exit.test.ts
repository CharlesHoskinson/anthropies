import { Command, FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { fileURLToPath } from "node:url"
import { Finding, Removed, Report, residualDrivesExit } from "../src/report.js"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))
const fixtureRel = "fixtures/c2pa/fixture-c2pa-present.png"
const fixtureAbs = fileURLToPath(new URL("../fixtures/c2pa/fixture-c2pa-present.png", import.meta.url))

const leftover = new Report({
  kind: "raster",
  findings: [
    new Finding({ channel: "deterministic", status: "absent" }),
    new Finding({ channel: "c2pa", status: "present" }),
    new Finding({ channel: "official", status: "unavailable" }),
    new Finding({ channel: "statistical", status: "unavailable" })
  ],
  removed: new Removed({}),
  degraded: false,
  honesty: ["soft-binding and pixel marks are out of scope"]
})

describe("residual_exit_not_suppressed", () => {
  it("present c2pa drives exit; degraded suppresses it", () => {
    expect(residualDrivesExit(leftover)).toBe(true)
    expect(residualDrivesExit(new Report({ ...leftover, degraded: true }))).toBe(false)
  })

  it.scoped("inspect of planted c2pa exits 1 in human and --json", () =>
    Effect.gen(function* () {
      const tsc = yield* Command.exitCode(
        Command.make("node", "./node_modules/typescript/bin/tsc", "-p", "tsconfig.json").pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      expect(Number(tsc)).toBe(0)
      const human = yield* Command.exitCode(
        Command.make("node", "dist/cli.js", "inspect", fixtureRel).pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      const json = yield* Command.exitCode(
        Command.make("node", "dist/cli.js", "inspect", "--json", fixtureRel).pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      expect(Number(human)).toBe(1)
      expect(Number(json)).toBe(1)
    }).pipe(Effect.provide(NodeContext.layer))
  )

  it("clean that leaves planted c2pa exits 1 in both modes", () => {
    // Human and --json share residualDrivesExit; leftover present is never 0.
    expect(residualDrivesExit(leftover)).toBe(true)
    expect(residualDrivesExit(new Report({ ...leftover, degraded: false }))).toBe(true)
  })

  it.scoped("successful strip exits 0 in human and --json", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const dir = yield* fs.makeTempDirectoryScoped()
      const src = `${dir}/in.png`
      const dest = `${dir}/out.png`
      yield* fs.copy(fixtureAbs, src)
      const tsc = yield* Command.exitCode(
        Command.make("node", "./node_modules/typescript/bin/tsc", "-p", "tsconfig.json").pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      expect(Number(tsc)).toBe(0)
      const human = yield* Command.exitCode(
        Command.make("node", "dist/cli.js", "clean", "-o", dest, src).pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      const jsonDest = `${dir}/out-json.png`
      const json = yield* Command.exitCode(
        Command.make("node", "dist/cli.js", "clean", "--json", "-o", jsonDest, src).pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      expect(Number(human)).toBe(0)
      expect(Number(json)).toBe(0)
    }).pipe(Effect.provide(NodeContext.layer))
  )
})
