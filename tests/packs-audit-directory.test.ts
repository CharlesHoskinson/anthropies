import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../src/core/capability.js"
import {
  Availability,
  CapabilityFailure,
  KernelFinding,
  makeArtifact
} from "../src/core/domain.js"
import { plan } from "../src/core/planner.js"
import { createRegistry } from "../src/core/registry.js"
import {
  auditDirectoryPack,
  mapWithDirectoryConcurrency,
  resolveUnderRoot,
  runDirectoryAuditBatch,
  selectDirectoryAudit
} from "../src/packs/audit-directory.js"
import {
  aggregateAuditFindings,
  encodeAuditJson,
  type AuditFindingInput
} from "../src/packs/audit-report.js"

const presentFinding = new KernelFinding({
  channel: "deterministic",
  markClass: "agent-trailer",
  status: "present",
  evidence: { kind: "contract" },
  packId: "anthropies.layer-a",
  packImplementationVersion: "0.4.0"
})

const inspectCtx: RunContext = {
  operation: "inspect",
  forceText: false,
  json: true,
  requireCapability: [],
  kernelApiVersion: "1.0.0"
}

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const mockTextPack = (id: string): CapabilityPack => ({
  manifest: decodeManifest({
    id,
    displayName: id,
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: "0.4.0",
    artifactKinds: ["text"],
    markClasses: ["invisible-unicode"],
    operations: ["inspect"],
    channel: "deterministic",
    priority: 100,
    ordering: {},
    runtime: "native-ts",
    network: "none",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "core"
  }),
  probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
  inspect: () => Effect.succeed([])
})

const defaultBounds = {
  maxDepth: 8,
  maxFileCount: 100,
  maxFileBytes: 1024 * 1024,
  maxTotalBytes: 8 * 1024 * 1024
} as const

describe("packs_audit_directory", () => {
  it("planner ids match single-file", () => {
    const root = mkdtempSync(join(tmpdir(), "audit-plan-"))
    writeFileSync(join(root, "note.txt"), "hello trailer\n", "utf8")

    const registry = createRegistry()
    expect(registry.register(mockTextPack("anthropies.layer-a-mock"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(root, defaultBounds, registry, inspectCtx)
    expect(selected.ok).toBe(true)
    if (!selected.ok) {
      return
    }
    expect(selected.selected).toHaveLength(1)
    const file = selected.selected[0]!
    expect(file.kind).toBe("text")

    const single = plan(registry, { kind: "text", context: inspectCtx })
    expect(single.ok).toBe(true)
    if (!single.ok) {
      return
    }
    expect(file.plannedPackIds).toEqual(single.packs.map((pack) => pack.manifest.id))
  })

  it("directory pack id is stable", () => {
    expect(auditDirectoryPack.manifest.id).toBe("anthropies.audit-directory")
    expect(auditDirectoryPack.manifest.operations).toContain("audit")
    expect(auditDirectoryPack.manifest.channel).toBe("deterministic")
    expect(auditDirectoryPack.manifest.distribution).toBe("optional")
    expect(auditDirectoryPack.manifest.license).toBe("apache-2.0")
    const src = readFileSync(new URL("../src/packs/audit-directory.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/\bscore\b/)
    expect(src).not.toMatch(/watermarkScore/)
  })

  it("file-count bound stops selection", () => {
    const root = mkdtempSync(join(tmpdir(), "audit-count-"))
    writeFileSync(join(root, "a.txt"), "a", "utf8")
    writeFileSync(join(root, "b.txt"), "b", "utf8")
    writeFileSync(join(root, "c.txt"), "c", "utf8")

    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(
      root,
      { ...defaultBounds, maxFileCount: 2 },
      registry,
      inspectCtx
    )
    expect(selected.ok).toBe(true)
    if (!selected.ok) {
      return
    }
    expect(selected.selected.length).toBe(2)
    expect(selected.fileCountBoundHit).toBe(true)
  })

  it("depth bound excludes deeper files", () => {
    const root = mkdtempSync(join(tmpdir(), "audit-depth-"))
    writeFileSync(join(root, "top.txt"), "top", "utf8")
    mkdirSync(join(root, "one"))
    writeFileSync(join(root, "one", "mid.txt"), "mid", "utf8")
    mkdirSync(join(root, "one", "two"))
    writeFileSync(join(root, "one", "two", "deep.txt"), "deep", "utf8")

    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(
      root,
      { ...defaultBounds, maxDepth: 1 },
      registry,
      inspectCtx
    )
    expect(selected.ok).toBe(true)
    if (!selected.ok) {
      return
    }
    const rels = selected.selected.map((file) => file.relativePath).sort()
    expect(rels).toEqual(["one/mid.txt", "top.txt"])
    expect(rels).not.toContain("one/two/deep.txt")
  })

  it("parent traversal is refused", () => {
    const root = mkdtempSync(join(tmpdir(), "audit-escape-"))
    mkdirSync(join(root, "safe"))
    writeFileSync(join(root, "safe", "ok.txt"), "ok", "utf8")
    const outside = join(root, "..", "outside-secret.txt")
    writeFileSync(outside, "secret", "utf8")

    const resolved = resolveUnderRoot(root, join("safe", "..", "..", "outside-secret.txt"))
    expect(resolved.ok).toBe(false)
    if (resolved.ok) {
      return
    }
    expect(resolved.code).toBe("path-escape")

    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })
    const selected = selectDirectoryAudit(root, defaultBounds, registry, inspectCtx)
    expect(selected.ok).toBe(true)
    if (!selected.ok) {
      return
    }
    expect(selected.selected.map((file) => file.relativePath)).toEqual(["safe/ok.txt"])
    expect(new TextDecoder().decode(selected.selected[0]!.bytes)).toBe("ok")
  })

  it("size bound refuses oversized file", () => {
    const root = mkdtempSync(join(tmpdir(), "audit-size-"))
    writeFileSync(join(root, "small.txt"), "ok", "utf8")
    writeFileSync(join(root, "big.txt"), "x".repeat(64), "utf8")

    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(
      root,
      { ...defaultBounds, maxFileBytes: 8 },
      registry,
      inspectCtx
    )
    expect(selected.ok).toBe(true)
    if (!selected.ok) {
      return
    }
    expect(selected.selected.map((file) => file.relativePath)).toEqual(["small.txt"])
    expect(selected.refusals).toContainEqual({ relativePath: "big.txt", reason: "size" })
  })

  it("fully filtered root fails", () => {
    const root = mkdtempSync(join(tmpdir(), "audit-filtered-"))
    writeFileSync(join(root, "only-big.txt"), "x".repeat(64), "utf8")

    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(
      root,
      { ...defaultBounds, maxFileBytes: 8 },
      registry,
      inspectCtx
    )
    expect(selected.ok).toBe(false)
    if (selected.ok) {
      return
    }
    expect(selected.code).toBe("empty-selection")
  })

  it("missing root fails", () => {
    const root = join(mkdtempSync(join(tmpdir(), "audit-missing-")), "does-not-exist")
    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(root, defaultBounds, registry, inspectCtx)
    expect(selected.ok).toBe(false)
    if (selected.ok) {
      return
    }
    expect(selected.code).toBe("missing-root")
  })

  it("symlink escape is refused", () => {
    const base = mkdtempSync(join(tmpdir(), "audit-symlink-"))
    const root = join(base, "root")
    mkdirSync(root)
    writeFileSync(join(root, "safe.txt"), "safe", "utf8")
    const outside = join(base, "outside-secret.txt")
    writeFileSync(outside, "secret-bytes", "utf8")
    symlinkSync(outside, join(root, "escape.txt"))

    const registry = createRegistry()
    expect(registry.register(mockTextPack("text-pack"))).toEqual({ ok: true })

    const selected = selectDirectoryAudit(root, defaultBounds, registry, inspectCtx)
    expect(selected.ok).toBe(true)
    if (!selected.ok) {
      return
    }
    expect(selected.selected.map((file) => file.relativePath)).toEqual(["safe.txt"])
    expect(new TextDecoder().decode(selected.selected[0]!.bytes)).toBe("safe")
    expect(selected.refusals).toContainEqual({
      relativePath: "escape.txt",
      reason: "symlink-escape"
    })
    expect(
      selected.selected.some((file) => new TextDecoder().decode(file.bytes).includes("secret"))
    ).toBe(false)
  })

  it("concurrency two caps inflight", async () => {
    let inflight = 0
    let maxInflight = 0
    const items = Array.from({ length: 5 }, (_, index) => ({
      relativePath: `f${index}.txt`,
      effect: Effect.gen(function* () {
        inflight += 1
        maxInflight = Math.max(maxInflight, inflight)
        yield* Effect.sleep("40 millis")
        inflight -= 1
        return index
      })
    }))

    const results = await Effect.runPromise(mapWithDirectoryConcurrency(items, 2))
    expect(maxInflight).toBeLessThanOrEqual(2)
    expect(maxInflight).toBe(2)
    expect(results.map((row) => row.relativePath)).toEqual([
      "f0.txt",
      "f1.txt",
      "f2.txt",
      "f3.txt",
      "f4.txt"
    ])
  })

  it("concurrency one is serial", async () => {
    const events: Array<string> = []
    const names = ["a", "b", "c"] as const
    const items = names.map((name) => ({
      relativePath: `${name}.txt`,
      effect: Effect.gen(function* () {
        events.push(`start:${name}`)
        yield* Effect.sleep("20 millis")
        events.push(`end:${name}`)
        return name
      })
    }))

    await Effect.runPromise(mapWithDirectoryConcurrency(items, 1))
    expect(events).toEqual([
      "start:a",
      "end:a",
      "start:b",
      "end:b",
      "start:c",
      "end:c"
    ])
  })

  it("shuffled completion keeps order", async () => {
    const toFinding = (relativePath: string): AuditFindingInput => ({
      relativePath,
      channel: "deterministic",
      markClass: "agent-trailer",
      status: "present",
      packId: "anthropies.layer-a"
    })

    const runWithDelays = async (delays: Readonly<Record<string, number>>) => {
      const paths = ["c.txt", "a.txt", "b.txt"] as const
      const items = paths.map((relativePath) => ({
        relativePath,
        effect: Effect.gen(function* () {
          yield* Effect.sleep(`${delays[relativePath]} millis`)
          return toFinding(relativePath)
        })
      }))
      const rows = await Effect.runPromise(mapWithDirectoryConcurrency(items, 3))
      const findings = aggregateAuditFindings(rows.map((row) => row.value))
      return JSON.stringify(encodeAuditJson(findings))
    }

    const first = await runWithDelays({ "a.txt": 50, "b.txt": 10, "c.txt": 30 })
    const second = await runWithDelays({ "a.txt": 5, "b.txt": 40, "c.txt": 20 })
    expect(first).toBe(second)
    expect(JSON.parse(first).findings.map((f: { relativePath: string }) => f.relativePath)).toEqual([
      "a.txt",
      "b.txt",
      "c.txt"
    ])
  })

  it("relative paths sort stably", async () => {
    const items = [
      {
        relativePath: "b/a.txt",
        effect: Effect.succeed({
          relativePath: "b/a.txt",
          channel: "deterministic" as const,
          markClass: "agent-trailer" as const,
          status: "present" as const,
          packId: "anthropies.layer-a"
        })
      },
      {
        relativePath: "a/a.txt",
        effect: Effect.succeed({
          relativePath: "a/a.txt",
          channel: "c2pa" as const,
          markClass: "c2pa-manifest" as const,
          status: "present" as const,
          packId: "anthropies.c2pa"
        })
      }
    ]

    const rows = await Effect.runPromise(mapWithDirectoryConcurrency(items, 2))
    expect(rows.map((row) => row.relativePath)).toEqual(["a/a.txt", "b/a.txt"])

    const aggregated = aggregateAuditFindings(rows.map((row) => row.value))
    expect(aggregated.map((finding) => finding.relativePath)).toEqual(["a/a.txt", "b/a.txt"])
  })

  it("sibling success survives one failure", async () => {
    const originalA = makeArtifact(new TextEncoder().encode("a-ok"), "text", { name: "a.txt" })
    const originalB = makeArtifact(new TextEncoder().encode("b-bad"), "text", { name: "b.txt" })

    const batch = await Effect.runPromise(
      runDirectoryAuditBatch([
        {
          relativePath: "a.txt",
          original: originalA,
          effect: Effect.succeed({
            findings: [presentFinding],
            artifact: originalA,
            remediation: "unchanged" as const
          })
        },
        {
          relativePath: "b.txt",
          original: originalB,
          effect: Effect.fail(
            new CapabilityFailure({
              code: "unavailable",
              packId: "anthropies.layer-a",
              reason: "probe-failed"
            })
          )
        }
      ])
    )

    expect(batch.findings.some((finding) => finding.relativePath === "a.txt")).toBe(true)
    expect(
      batch.findings.find((finding) => finding.relativePath === "a.txt")?.status
    ).toBe("present")
    expect(batch.failures.some((failure) => failure.relativePath === "b.txt")).toBe(true)
    expect(batch.findings.some((finding) => finding.relativePath === "b.txt")).toBe(false)
  })

  it("batch is not silent-success on required failure", async () => {
    const originalA = makeArtifact(new TextEncoder().encode("a-ok"), "text", { name: "a.txt" })
    const originalB = makeArtifact(new TextEncoder().encode("b-bad"), "text", { name: "b.txt" })

    const batch = await Effect.runPromise(
      runDirectoryAuditBatch([
        {
          relativePath: "a.txt",
          original: originalA,
          effect: Effect.succeed({
            findings: [presentFinding],
            artifact: originalA,
            remediation: "unchanged" as const
          })
        },
        {
          relativePath: "b.txt",
          original: originalB,
          required: true,
          effect: Effect.fail(
            new CapabilityFailure({
              code: "unavailable",
              packId: "anthropies.layer-a",
              reason: "tool-missing"
            })
          )
        }
      ])
    )

    expect(batch.outcome).not.toBe("success")
    expect(batch.outcome).toBe("partial")
    expect(batch.failures).toHaveLength(1)
    expect(batch.findings.some((finding) => finding.relativePath === "a.txt")).toBe(true)
  })

  it("timeout preserves only the timed-out target", async () => {
    const originalA = makeArtifact(new TextEncoder().encode("a-original"), "text", {
      name: "a.txt"
    })
    const changedA = makeArtifact(new TextEncoder().encode("a-cleaned"), "text", {
      name: "a.txt"
    })
    const originalB = makeArtifact(new TextEncoder().encode("b-original"), "text", {
      name: "b.txt"
    })

    const batch = await Effect.runPromise(
      runDirectoryAuditBatch([
        {
          relativePath: "a.txt",
          original: originalA,
          effect: Effect.succeed({
            findings: [presentFinding],
            artifact: changedA,
            remediation: "changed" as const
          })
        },
        {
          relativePath: "b.txt",
          original: originalB,
          effect: Effect.fail(
            new CapabilityFailure({
              code: "timeout",
              packId: "anthropies.layer-a",
              reason: "timeout"
            })
          )
        }
      ])
    )

    const targetA = batch.targets.find((target) => target.relativePath === "a.txt")
    const targetB = batch.targets.find((target) => target.relativePath === "b.txt")
    expect(targetA).toBeDefined()
    expect(targetB).toBeDefined()
    expect(targetA!.artifact.digest).toBe(changedA.digest)
    expect(targetA!.artifact.digest).not.toBe(originalA.digest)
    expect(targetB!.artifact.digest).toBe(originalB.digest)
    expect(targetB!.preservedOriginal).toBe(true)
    expect(batch.findings.some((finding) => finding.relativePath === "a.txt")).toBe(true)
    expect(batch.failures.some((failure) => failure.relativePath === "b.txt")).toBe(true)
    expect(batch.outcome).toBe("partial")
  })
})
