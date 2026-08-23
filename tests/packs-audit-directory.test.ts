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
import { Availability } from "../src/core/domain.js"
import { plan } from "../src/core/planner.js"
import { createRegistry } from "../src/core/registry.js"
import {
  auditDirectoryPack,
  resolveUnderRoot,
  selectDirectoryAudit
} from "../src/packs/audit-directory.js"

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
})
