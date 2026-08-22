import type { Kind } from "../kind.js"
import type { CapabilityPack, RunContext } from "./capability.js"
import type { PackRegistry } from "./registry.js"

export type PlanRequest = {
  readonly kind: Kind
  readonly context: RunContext
}

export type PlanResult =
  | { readonly ok: true; readonly packs: ReadonlyArray<CapabilityPack> }
  | { readonly ok: false; readonly code: "conflict" | "none" }

const isApplicable = (pack: CapabilityPack, request: PlanRequest): boolean => {
  const { manifest } = pack
  return (
    manifest.artifactKinds.includes(request.kind) &&
    manifest.operations.includes(request.context.operation)
  )
}

/** Directed edge A→B means A runs before B. */
const addEdge = (
  successors: Map<string, Set<string>>,
  inDegree: Map<string, number>,
  from: string,
  to: string
): void => {
  if (from === to) {
    return
  }
  const outs = successors.get(from)
  if (outs === undefined || inDegree.get(to) === undefined) {
    return
  }
  if (outs.has(to)) {
    return
  }
  outs.add(to)
  inDegree.set(to, (inDegree.get(to) ?? 0) + 1)
}

const compareReady = (left: CapabilityPack, right: CapabilityPack): number => {
  const priorityDelta = right.manifest.priority - left.manifest.priority
  if (priorityDelta !== 0) {
    return priorityDelta
  }
  return left.manifest.id.localeCompare(right.manifest.id)
}

const orderPacks = (packs: ReadonlyArray<CapabilityPack>): PlanResult => {
  const byId = new Map<string, CapabilityPack>()
  for (const pack of packs) {
    byId.set(pack.manifest.id, pack)
  }

  const successors = new Map<string, Set<string>>()
  const inDegree = new Map<string, number>()
  for (const pack of packs) {
    successors.set(pack.manifest.id, new Set())
    inDegree.set(pack.manifest.id, 0)
  }

  for (const pack of packs) {
    const id = pack.manifest.id
    const { before, after } = pack.manifest.ordering

    if (before !== undefined) {
      for (const otherId of before) {
        // this pack runs before other → id → other
        addEdge(successors, inDegree, id, otherId)
      }
    }
    if (after !== undefined) {
      for (const otherId of after) {
        // this pack runs after other → other → id
        addEdge(successors, inDegree, otherId, id)
      }
    }
  }

  const ready: Array<CapabilityPack> = []
  for (const pack of packs) {
    if ((inDegree.get(pack.manifest.id) ?? 0) === 0) {
      ready.push(pack)
    }
  }
  ready.sort(compareReady)

  const ordered: Array<CapabilityPack> = []
  while (ready.length > 0) {
    const next = ready.shift()!
    ordered.push(next)
    const outs = successors.get(next.manifest.id)
    if (outs === undefined) {
      continue
    }
    for (const successorId of outs) {
      const degree = (inDegree.get(successorId) ?? 0) - 1
      inDegree.set(successorId, degree)
      if (degree === 0) {
        const successor = byId.get(successorId)
        if (successor !== undefined) {
          ready.push(successor)
          ready.sort(compareReady)
        }
      }
    }
  }

  if (ordered.length !== packs.length) {
    return { ok: false, code: "conflict" }
  }
  return { ok: true, packs: ordered }
}

export const plan = (registry: PackRegistry, request: PlanRequest): PlanResult => {
  const applicable = registry.list().filter((pack) => isApplicable(pack, request))
  if (applicable.length === 0) {
    return { ok: false, code: "none" }
  }
  return orderPacks(applicable)
}
