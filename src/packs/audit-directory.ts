import { Effect, Schema } from "effect"
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import {
  Availability,
  makeArtifact,
  type Artifact,
  type AvailabilityReasonCode,
  type CapabilityFailure,
  type KernelFinding,
  type KernelFindingStatus,
  type MarkClass,
  type Remediation
} from "../core/domain.js"
import { plan } from "../core/planner.js"
import { shouldPreserveOriginal } from "../core/policy.js"
import type { PackRegistry } from "../core/registry.js"
import { classify, type Kind } from "../kind.js"
import type { Channel } from "../report.js"

const PACK_ID = "anthropies.audit-directory"
const PACK_VERSION = "0.4.0"

export type DirectoryAuditBounds = {
  readonly maxDepth: number
  readonly maxFileCount: number
  readonly maxFileBytes: number
  readonly maxTotalBytes: number
}

export type PathResolveResult =
  | { readonly ok: true; readonly absolutePath: string; readonly relativePath: string }
  | { readonly ok: false; readonly code: "path-escape" }

export type SelectedAuditFile = {
  readonly relativePath: string
  readonly absolutePath: string
  readonly bytes: Uint8Array
  readonly kind: Kind
  readonly artifact: Artifact
  readonly plannedPackIds: ReadonlyArray<string>
}

export type DirectoryAuditSelection =
  | {
      readonly ok: true
      readonly selected: ReadonlyArray<SelectedAuditFile>
      readonly fileCountBoundHit: boolean
      readonly refusals: ReadonlyArray<{
        readonly relativePath: string
        readonly reason: "path-escape" | "size" | "symlink-escape"
      }>
    }
  | {
      readonly ok: false
      readonly code: "empty-selection" | "missing-root"
    }

const normalizeSlashes = (value: string): string => value.split(sep).join("/")

const escapesRoot = (rootReal: string, resolved: string): boolean => {
  const rel = relative(rootReal, resolved)
  return rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)
}

/** Refuse any candidate whose resolved path leaves the configured root. */
export const resolveUnderRoot = (root: string, candidate: string): PathResolveResult => {
  let rootReal: string
  try {
    rootReal = realpathSync(resolve(root))
  } catch {
    return { ok: false, code: "path-escape" }
  }
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(rootReal, candidate)
  let resolved: string
  try {
    resolved = realpathSync(absolute)
  } catch {
    // Candidate may not exist yet; still enforce lexical containment under root.
    resolved = absolute
  }
  if (escapesRoot(rootReal, resolved)) {
    return { ok: false, code: "path-escape" }
  }
  const rel = relative(rootReal, resolved)
  return {
    ok: true,
    absolutePath: resolved,
    relativePath: normalizeSlashes(rel)
  }
}

const pathDepth = (relativePath: string): number => {
  if (relativePath.length === 0) {
    return 0
  }
  return relativePath.split("/").length - 1
}

const listCandidates = (
  rootReal: string,
  bounds: DirectoryAuditBounds
): {
  readonly files: ReadonlyArray<{ readonly absolutePath: string; readonly relativePath: string }>
  readonly fileCountBoundHit: boolean
  readonly refusals: Array<{
    readonly relativePath: string
    readonly reason: "path-escape" | "size" | "symlink-escape"
  }>
} => {
  const files: Array<{ absolutePath: string; relativePath: string }> = []
  const refusals: Array<{
    relativePath: string
    reason: "path-escape" | "size" | "symlink-escape"
  }> = []
  let fileCountBoundHit = false

  const walk = (dirAbsolute: string, dirRelative: string, dirDepth: number): void => {
    if (fileCountBoundHit) {
      return
    }
    let entries: ReadonlyArray<string>
    try {
      entries = readdirSync(dirAbsolute)
    } catch {
      return
    }
    const sorted = [...entries].sort((left, right) => left.localeCompare(right))
    for (const name of sorted) {
      if (fileCountBoundHit) {
        return
      }
      const childAbsolute = join(dirAbsolute, name)
      const childRelative = dirRelative.length === 0 ? name : `${dirRelative}/${name}`
      const resolved = resolveUnderRoot(rootReal, childRelative)
      if (!resolved.ok) {
        let reason: "path-escape" | "symlink-escape" = "path-escape"
        try {
          if (lstatSync(childAbsolute).isSymbolicLink()) {
            reason = "symlink-escape"
          }
        } catch {
          // Keep path-escape when the candidate cannot be stated.
        }
        refusals.push({ relativePath: childRelative, reason })
        continue
      }
      let info: ReturnType<typeof statSync>
      try {
        info = statSync(resolved.absolutePath)
      } catch {
        continue
      }
      if (info.isDirectory()) {
        const nextDepth = dirDepth + 1
        if (nextDepth > bounds.maxDepth) {
          continue
        }
        walk(resolved.absolutePath, resolved.relativePath, nextDepth)
        continue
      }
      if (!info.isFile()) {
        continue
      }
      const depth = pathDepth(resolved.relativePath)
      if (depth > bounds.maxDepth) {
        continue
      }
      if (files.length >= bounds.maxFileCount) {
        fileCountBoundHit = true
        return
      }
      files.push({
        absolutePath: resolved.absolutePath,
        relativePath: resolved.relativePath
      })
    }
  }

  walk(rootReal, "", 0)
  return { files, fileCountBoundHit, refusals }
}

/** Select files under root bounds and plan each with the single-file planner. */
export const selectDirectoryAudit = (
  root: string,
  bounds: DirectoryAuditBounds,
  registry: PackRegistry,
  context: RunContext
): DirectoryAuditSelection => {
  let rootReal: string
  try {
    rootReal = realpathSync(resolve(root))
    const rootStat = statSync(rootReal)
    if (!rootStat.isDirectory()) {
      return { ok: false, code: "missing-root" }
    }
  } catch {
    return { ok: false, code: "missing-root" }
  }

  const { files, fileCountBoundHit, refusals } = listCandidates(rootReal, bounds)
  const selected: Array<SelectedAuditFile> = []
  let totalBytes = 0

  for (const file of files) {
    let bytes: Uint8Array
    try {
      bytes = readFileSync(file.absolutePath)
    } catch {
      refusals.push({ relativePath: file.relativePath, reason: "path-escape" })
      continue
    }
    if (bytes.byteLength > bounds.maxFileBytes || totalBytes + bytes.byteLength > bounds.maxTotalBytes) {
      refusals.push({ relativePath: file.relativePath, reason: "size" })
      continue
    }
    totalBytes += bytes.byteLength
    const suffix = file.relativePath.includes(".")
      ? `.${file.relativePath.split(".").pop()!.toLowerCase()}`
      : undefined
    const kind = classify(bytes, suffix)
    const artifact = makeArtifact(bytes, kind, {
      name: file.relativePath,
      ...(suffix !== undefined ? { suffix } : {})
    })
    const planned = plan(registry, { kind, context })
    const plannedPackIds =
      planned.ok === true ? planned.packs.map((pack) => pack.manifest.id) : ([] as string[])
    selected.push({
      relativePath: file.relativePath,
      absolutePath: file.absolutePath,
      bytes,
      kind,
      artifact,
      plannedPackIds
    })
  }

  if (selected.length === 0) {
    return { ok: false, code: "empty-selection" }
  }

  selected.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
  return {
    ok: true,
    selected,
    fileCountBoundHit,
    refusals
  }
}

export type DirectoryConcurrencyItem<A, E = never, R = never> = {
  readonly relativePath: string
  readonly effect: Effect.Effect<A, E, R>
}

export type DirectoryConcurrencyRow<A> = {
  readonly relativePath: string
  readonly value: A
}

/**
 * Run directory-audit work under a concurrency bound.
 * Result order follows stable relativePath sort, not completion order.
 */
export const mapWithDirectoryConcurrency = <A, E = never, R = never>(
  items: ReadonlyArray<DirectoryConcurrencyItem<A, E, R>>,
  concurrency: number
): Effect.Effect<ReadonlyArray<DirectoryConcurrencyRow<A>>, E, R> => {
  const bound = Number.isFinite(concurrency) ? Math.max(1, Math.floor(concurrency)) : 1
  return Effect.forEach(
    items,
    (item) =>
      item.effect.pipe(
        Effect.map((value): DirectoryConcurrencyRow<A> => ({
          relativePath: item.relativePath,
          value
        }))
      ),
    { concurrency: bound }
  ).pipe(
    Effect.map((rows) =>
      [...rows].sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    )
  )
}

export type DirectoryAuditTargetSuccess = {
  readonly findings: ReadonlyArray<KernelFinding>
  readonly artifact: Artifact
  readonly remediation: Remediation
}

export type DirectoryAuditTargetSpec<E = CapabilityFailure, R = never> = {
  readonly relativePath: string
  readonly original: Artifact
  /** Required targets keep the batch from reporting full success on failure. Default true. */
  readonly required?: boolean
  readonly effect: Effect.Effect<DirectoryAuditTargetSuccess, E, R>
}

export type DirectoryAuditPathFinding = {
  readonly relativePath: string
  readonly channel: Channel
  readonly markClass: MarkClass
  readonly status: KernelFindingStatus
  readonly packId: string
  readonly packImplementationVersion: string
}

export type DirectoryAuditTargetFailure = {
  readonly relativePath: string
  readonly code: CapabilityFailure["code"]
  readonly reason: AvailabilityReasonCode
}

export type DirectoryAuditTargetResult = {
  readonly relativePath: string
  readonly status: "success" | "failure"
  readonly artifact: Artifact
  readonly remediation: Remediation
  readonly preservedOriginal: boolean
}

export type DirectoryAuditBatchResult = {
  readonly outcome: "success" | "partial"
  readonly findings: ReadonlyArray<DirectoryAuditPathFinding>
  readonly failures: ReadonlyArray<DirectoryAuditTargetFailure>
  readonly targets: ReadonlyArray<DirectoryAuditTargetResult>
}

type TargetSettle =
  | { readonly _tag: "ok"; readonly value: DirectoryAuditTargetSuccess }
  | { readonly _tag: "fail"; readonly failure: CapabilityFailure }

/**
 * Aggregate per-target audit work. Keep successful sibling findings when one
 * target fails. Uncertainty reasons preserve only that target's original.
 */
export const runDirectoryAuditBatch = <R = never>(
  targets: ReadonlyArray<DirectoryAuditTargetSpec<CapabilityFailure, R>>
): Effect.Effect<DirectoryAuditBatchResult, never, R> =>
  Effect.gen(function* () {
    const findings: Array<DirectoryAuditPathFinding> = []
    const failures: Array<DirectoryAuditTargetFailure> = []
    const targetResults: Array<DirectoryAuditTargetResult> = []
    let requiredFailed = false

    for (const target of targets) {
      const required = target.required !== false
      const settled: TargetSettle = yield* target.effect.pipe(
        Effect.map((value): TargetSettle => ({ _tag: "ok", value })),
        Effect.catchAll((failure): Effect.Effect<TargetSettle> =>
          Effect.succeed({ _tag: "fail", failure })
        )
      )

      if (settled._tag === "ok") {
        for (const finding of settled.value.findings) {
          findings.push({
            relativePath: target.relativePath,
            channel: finding.channel,
            markClass: finding.markClass,
            status: finding.status,
            packId: finding.packId,
            packImplementationVersion: finding.packImplementationVersion
          })
        }
        targetResults.push({
          relativePath: target.relativePath,
          status: "success",
          artifact: settled.value.artifact,
          remediation: settled.value.remediation,
          preservedOriginal: false
        })
        continue
      }

      if (required) {
        requiredFailed = true
      }
      failures.push({
        relativePath: target.relativePath,
        code: settled.failure.code,
        reason: settled.failure.reason
      })
      const preserve = shouldPreserveOriginal(settled.failure.reason)
      targetResults.push({
        relativePath: target.relativePath,
        status: "failure",
        artifact: target.original,
        remediation: "unchanged",
        preservedOriginal: preserve
      })
    }

    findings.sort((left, right) => {
      const byPath = left.relativePath.localeCompare(right.relativePath)
      if (byPath !== 0) {
        return byPath
      }
      const byChannel = left.channel.localeCompare(right.channel)
      if (byChannel !== 0) {
        return byChannel
      }
      return left.markClass.localeCompare(right.markClass)
    })
    targetResults.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    failures.sort((left, right) => left.relativePath.localeCompare(right.relativePath))

    return {
      outcome: requiredFailed ? "partial" : "success",
      findings,
      failures,
      targets: targetResults
    }
  })

export const auditDirectoryPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Directory audit",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: [],
    markClasses: [],
    operations: ["audit"],
    channel: "deterministic",
    priority: 10,
    ordering: {},
    runtime: "native-ts",
    network: "none",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "optional"
  }),

  probe: (_context: RunContext) =>
    Effect.succeed(new Availability({ status: "available", reason: "ready" })),

  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([])
}
