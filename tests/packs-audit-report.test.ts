import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { readFileSync } from "node:fs"
import {
  aggregateAuditFindings,
  AuditJsonReport,
  AuditSarifLog,
  encodeAuditJson,
  encodeChannelSarif,
  type AuditFindingInput
} from "../src/packs/audit-report.js"

const finding = (
  partial: AuditFindingInput
): AuditFindingInput => partial

describe("packs_audit_report", () => {
  it("mixed score is rejected", () => {
    const valid = encodeAuditJson([
      finding({
        relativePath: "a.txt",
        channel: "deterministic",
        markClass: "agent-trailer",
        status: "present",
        packId: "anthropies.layer-a"
      })
    ])
    expect(Schema.decodeUnknownSync(AuditJsonReport)(valid).findings).toHaveLength(1)
    expect(() =>
      Schema.decodeUnknownSync(AuditJsonReport)({
        ...(valid as object),
        watermarkScore: 0.9
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(AuditJsonReport)({
        findings: [
          {
            relativePath: "a.txt",
            channel: "deterministic",
            markClass: "agent-trailer",
            status: "present",
            packId: "anthropies.layer-a",
            watermarkScore: 1
          }
        ]
      })
    ).toThrow()
  })

  it("channels remain distinct", () => {
    const encoded = encodeAuditJson([
      finding({
        relativePath: "b.txt",
        channel: "c2pa",
        markClass: "c2pa-manifest",
        status: "present",
        packId: "anthropies.c2pa"
      }),
      finding({
        relativePath: "a.txt",
        channel: "deterministic",
        markClass: "invisible-unicode",
        status: "present",
        packId: "anthropies.layer-a"
      })
    ])
    const decoded = Schema.decodeUnknownSync(AuditJsonReport)(encoded)
    const channels = decoded.findings.map((row) => row.channel)
    expect(channels).toEqual(["deterministic", "c2pa"])
    expect(JSON.stringify(encoded)).not.toMatch(/blended/)
    expect(Object.prototype.hasOwnProperty.call(encoded, "watermarkScore")).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(encoded, "suspicious")).toBe(false)
  })

  it("deterministic SARIF excludes other channels", () => {
    const findings = aggregateAuditFindings([
      finding({
        relativePath: "a.txt",
        channel: "deterministic",
        markClass: "agent-trailer",
        status: "present",
        packId: "anthropies.layer-a"
      }),
      finding({
        relativePath: "b.txt",
        channel: "c2pa",
        markClass: "c2pa-manifest",
        status: "present",
        packId: "anthropies.c2pa"
      }),
      finding({
        relativePath: "c.txt",
        channel: "official",
        markClass: "keyed-text",
        status: "absent",
        packId: "anthropies.official"
      }),
      finding({
        relativePath: "d.txt",
        channel: "statistical",
        markClass: "soft-binding",
        status: "absent",
        packId: "anthropies.statistical"
      })
    ])
    const sarif = encodeChannelSarif("deterministic", findings)
    const decoded = Schema.decodeUnknownSync(AuditSarifLog)(sarif)
    const results = decoded.runs[0]!.results
    expect(results.length).toBe(1)
    expect(results.every((result) => result.properties.channel === "deterministic")).toBe(true)
    expect(JSON.stringify(sarif)).not.toMatch(/"c2pa"/)
    expect(JSON.stringify(sarif)).not.toMatch(/"official"/)
    expect(JSON.stringify(sarif)).not.toMatch(/"statistical"/)
  })

  it("SARIF rule ids are actionable", () => {
    const sarif = encodeChannelSarif("deterministic", [
      finding({
        relativePath: "notes/trail.txt",
        channel: "deterministic",
        markClass: "agent-trailer",
        status: "present",
        packId: "anthropies.layer-a"
      })
    ])
    const decoded = Schema.decodeUnknownSync(AuditSarifLog)(sarif)
    const result = decoded.runs[0]!.results[0]!
    expect(result.ruleId).toMatch(/anthropies\.layer-a|agent-trailer/)
    expect(result.locations[0]!.physicalLocation.artifactLocation.uri).toBe("notes/trail.txt")
  })

  it("SARIF rejects blended score", () => {
    const valid = encodeChannelSarif("deterministic", [
      finding({
        relativePath: "a.txt",
        channel: "deterministic",
        markClass: "agent-trailer",
        status: "present",
        packId: "anthropies.layer-a"
      })
    ])
    expect(Schema.decodeUnknownSync(AuditSarifLog)(valid).version).toBe("2.1.0")
    expect(() =>
      Schema.decodeUnknownSync(AuditSarifLog)({
        ...(valid as object),
        watermarkScore: 0.42
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(AuditSarifLog)({
        ...(valid as object),
        blended: 0.5
      })
    ).toThrow()
  })

  it("audit pack tests reject score", () => {
    for (const file of ["audit-directory.ts", "audit-report.ts"]) {
      const src = readFileSync(new URL(`../src/packs/${file}`, import.meta.url), "utf8")
      expect(src).not.toMatch(/score|watermarkScore/)
    }
  })
})
