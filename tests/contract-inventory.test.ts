import { describe, expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { CONTRACT_CASES } from "../src/core/contract-cases.js"

describe("contract_inventory", () => {
  it("lists seven named cases", () => {
    expect(CONTRACT_CASES).toEqual([
      "available",
      "unavailable",
      "degraded",
      "incompatible",
      "timeout",
      "malformed-output",
      "conflicting-owner"
    ])
    expect(CONTRACT_CASES.length).toBe(7)
    const inventory = JSON.parse(readFileSync("fixtures/contract/inventory.json", "utf8")) as {
      cases: ReadonlyArray<string>
    }
    expect(inventory.cases).toEqual(CONTRACT_CASES)
  })
})
