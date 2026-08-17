import { describe, it, expect } from "@effect/vitest"
import { honestyStanza } from "../src/report.js"

describe("official_claim_forbidden", () => {
  it("honesty stanza contains the two does-not-prove lines", () => {
    const lines = honestyStanza({
      official: "unavailable (ANTHROPIC_DETECT_URL unset)",
      c2pa: "not-applicable",
      deterministic: "none",
      statistical: "not-run"
    })
    expect(lines.join("\n")).toMatch(/does not prove the official Claude text detector will fail/)
    expect(lines.join("\n")).toMatch(/does not prove the text is human-written/)
    expect(lines.join("\n")).not.toMatch(/watermark removed/i)
    expect(lines.join("\n")).not.toMatch(/undetectable/i)
  })
})
