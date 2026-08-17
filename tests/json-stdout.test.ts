import { Command } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { fileURLToPath } from "node:url"
import { Report } from "../src/report.js"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))

describe("json_stdout_purity", () => {
  it.scoped("inspect --json stdout is Schema.encode JSON only", () =>
    Effect.gen(function* () {
      const tsc = yield* Command.exitCode(
        Command.make("node", "./node_modules/typescript/bin/tsc", "-p", "tsconfig.json").pipe(
          Command.workingDirectory(repoRoot)
        )
      )
      expect(Number(tsc)).toBe(0)
      const cmd = Command.make(
        "node",
        "dist/cli.js",
        "inspect",
        "--json",
        "fixtures/layer-a/trailer-claude.txt"
      ).pipe(Command.workingDirectory(repoRoot))
      const stdout = yield* Command.string(cmd)
      const code = yield* Command.exitCode(cmd)
      const parsed: unknown = JSON.parse(stdout)
      expect(Schema.decodeUnknownSync(Report)(parsed).kind).toBe("text")
      expect(stdout.trimStart().startsWith("{")).toBe(true)
      expect(stdout).not.toMatch(/watermark removed/i)
      expect(Number(code)).toBe(1)
    }).pipe(Effect.provide(NodeContext.layer))
  )
})
