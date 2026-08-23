import { Effect, Schema } from "effect"
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import { Availability, makeArtifact, type Artifact } from "../core/domain.js"
import { plan } from "../core/planner.js"
import type { PackRegistry } from "../core/registry.js"
import { classify, type Kind } from "../kind.js"

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
