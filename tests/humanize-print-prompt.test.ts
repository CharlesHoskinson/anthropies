import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { CODE_PROMPT, Humanizer, PROSE_PROMPT, reportFromHumanize } from "../src/services/humanizer.js"

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

describe("humanize_prompt_structure_rules", () => {
  const structure = [
    /clause order/i,
    /sentence boundar/i,
    /discourse marker/i,
    /5-word sequence/i,
    /H-gram/i,
    /fact/i,
    /URL/i,
    /fence/i
  ] as const

  const forbidden = [/undetectable/i, /beats detector/i] as const

  const assertStructure = (text: string): void => {
    for (const re of structure) {
      expect(text).toMatch(re)
    }
    for (const re of forbidden) {
      expect(text).not.toMatch(re)
    }
  }

  it.scoped("prose print-prompt contains structure rules", () =>
    layers(
      Effect.gen(function* () {
        const sentence = "The compiler rejected the patch."
        const result = yield* Humanizer.humanize(sentence, { kind: "prose" })
        expect(result.text.startsWith(PROSE_PROMPT)).toBe(true)
        expect(result.text).toContain(sentence)
        assertStructure(result.text)
        expect(result.metric.status).toBe("not-run")
      })
    )
  )

  it.scoped("code print-prompt contains structure rules", () =>
    layers(
      Effect.gen(function* () {
        const snippet = "/** The compiler rejected the patch. */\nexport const x = 1\n"
        const result = yield* Humanizer.humanize(snippet, { kind: "code" })
        expect(result.text.startsWith(CODE_PROMPT)).toBe(true)
        expect(result.text).toContain(snippet)
        assertStructure(result.text)
        expect(result.metric.status).toBe("not-run")
      })
    )
  )
})
