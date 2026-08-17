import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { OfficialFinding, Report } from "../src/report.js"
import { Inspector } from "../src/services/inspector.js"

const layers = Effect.provide(Layer.mergeAll(Inspector.Default, NodeContext.layer))

describe("official_unavailable_default", () => {
  it.scoped("official adapter is Unavailable when detect URL unset", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/owned.txt`
        yield* fs.writeFileString(path, "The compiler rejected the patch.\n")
        const report = yield* Inspector.inspect(path, { forceText: false, json: false })
        const official = report.findings.filter((f) => f.channel === "official")
        expect(official.every((f) => f.status === "unavailable")).toBe(true)
        expect(JSON.stringify(report)).not.toMatch(/"score"/)
        expect(report.official?._tag).toBe("Unavailable")
        expect(() =>
          Schema.decodeUnknownSync(OfficialFinding)(
            { _tag: "Unavailable", score: 0.9 },
            { onExcessProperty: "error" }
          )
        ).toThrow()
        expect(() => Schema.decodeUnknownSync(Report)({ ...report, official: { score: 1 } })).toThrow()
      })
    )
  )
})
