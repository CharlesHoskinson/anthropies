import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { Humanizer, reportFromHumanize } from "../src/services/humanizer.js"

const layers = Effect.provide(Layer.mergeAll(Humanizer.Default, NodeContext.layer))

describe("humanize_print_prompt_default", () => {
  it.scoped("returns the prompt and does not claim removal", () =>
    layers(
      Effect.gen(function* () {
        const sentence = "The compiler rejected the patch."
        const result = yield* Humanizer.humanize(sentence, { kind: "prose" })
        expect(result.text).toContain(sentence)
        expect(result.text).toMatch(/Rewrite the text below/)
        expect(result.note).toMatch(/print-prompt/)
        expect(result.metric.status).toBe("not-run")
        expect(result.metric.surviving_ratio).toBeNull()
        const report = reportFromHumanize({
          kind: "text",
          removed: { unicode: 0, trailer: 0, banner: 0 },
          present: false,
          metric: result.metric
        })
        expect(report.honesty.join("\n")).toMatch(/best-effort/)
        expect(report.honesty.join("\n")).not.toMatch(/watermark removed/i)
        expect(report.rewrite_metric?.status).toBe("not-run")
      })
    )
  )
})
