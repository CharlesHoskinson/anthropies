import { describe, it, expect } from "@effect/vitest"
import { applyLayerA } from "../src/layer-a.js"

describe("cert_layer_a_roundtrip", () => {
  it("strips Claude trailer and keeps human trailer", () => {
    const src = "Fix the bug\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nCo-authored-by: Jane Doe <jane@example.com>\n"
    const { text, removed } = applyLayerA(src)
    expect(text).not.toMatch(/noreply@anthropic\.com/)
    expect(text).toMatch(/jane@example\.com/)
    expect(removed.trailer).toBeGreaterThan(0)
  })
  it("strips Generated-with banner", () => {
    const { text } = applyLayerA("# helper\n# Generated with Claude Code\nprint(1)\n")
    expect(text).not.toMatch(/Generated with Claude Code/)
    expect(text).toMatch(/print\(1\)/)
  })
  it("strips ZWSP and keeps emoji ZWJ family", () => {
    const family = "family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}"
    expect(applyLayerA("hello\u200Bworld").text).toBe("helloworld")
    expect(applyLayerA(family).text).toBe(family)
  })
})
