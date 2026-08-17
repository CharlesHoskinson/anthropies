import { Command } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const builtCli = Effect.gen(function* () {
  const tsc = yield* Command.exitCode(
    Command.make("node", "./node_modules/typescript/bin/tsc", "-p", "tsconfig.json").pipe(
      Command.workingDirectory(repoRoot)
    )
  )
  expect(Number(tsc)).toBe(0)
})

describe("serve_cli", () => {
  it.scoped("anthropies serve --help defaults to loopback 127.0.0.1:8765", () =>
    Effect.gen(function* () {
      yield* builtCli
      const help = yield* Command.string(
        Command.make("node", "dist/cli.js", "serve", "--help").pipe(Command.workingDirectory(repoRoot))
      )
      expect(help).toMatch(/--host/)
      expect(help).toMatch(/127\.0\.0\.1/)
      expect(help).toMatch(/--port/)
      expect(help).toMatch(/8765/)
      expect(help).not.toMatch(/watermark removed/i)
      expect(help).not.toMatch(/undetectable/i)
    }).pipe(Effect.provide(NodeContext.layer))
  )
})
