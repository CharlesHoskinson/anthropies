import { describe, it, expect } from "@effect/vitest"
import { Finding, honestyStanza, Removed, Report } from "../src/report.js"
import { channelTable } from "../src/services/capturer.js"

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

  it("demo channel table has four rows and no banned verdict", () => {
    const report = new Report({
      kind: "text",
      findings: [
        new Finding({ channel: "deterministic", status: "absent" }),
        new Finding({ channel: "c2pa", status: "unavailable" }),
        new Finding({ channel: "official", status: "unavailable" }),
        new Finding({ channel: "statistical", status: "unavailable" })
      ],
      removed: new Removed({}),
      degraded: false,
      honesty: honestyStanza({
        official: "unavailable (ANTHROPIC_DETECT_URL unset)",
        c2pa: "not-applicable",
        deterministic: "none",
        statistical: "not-run"
      })
    })
    const table = channelTable(report)
    expect(table).toMatch(/deterministic/)
    expect(table).toMatch(/c2pa/)
    expect(table).toMatch(/official/)
    expect(table).toMatch(/statistical/)
    expect(table).not.toMatch(/watermark removed/i)
    expect(table).not.toMatch(/✓ watermark cleared/)
    expect(table).not.toMatch(/undetectable/i)
  })
})
