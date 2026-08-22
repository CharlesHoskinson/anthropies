import type { CapabilityPack } from "./capability.js"
import { kernelApiVersion } from "./domain.js"
import {
  selectOwner,
  type OwnerTuple,
  type SelectOwnerResult
} from "./policy.js"

const parseXyz = (value: string): readonly [number, number, number] | undefined => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value)
  if (match === null) {
    return undefined
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

const compareXyz = (
  left: readonly [number, number, number],
  right: readonly [number, number, number]
): number => {
  for (let index = 0; index < 3; index += 1) {
    const delta = left[index]! - right[index]!
    if (delta !== 0) {
      return delta < 0 ? -1 : 1
    }
  }
  return 0
}

export const kernelRangeIncludes = (min: string, max: string, version: string): boolean => {
  const parsedMin = parseXyz(min)
  const parsedMax = parseXyz(max)
  const parsedVersion = parseXyz(version)
  if (parsedMin === undefined || parsedMax === undefined || parsedVersion === undefined) {
    return false
  }
  return (
    compareXyz(parsedMin, parsedVersion) <= 0 && compareXyz(parsedVersion, parsedMax) <= 0
  )
}

export type RegisterResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: "incompatible" | "conflict" }

export type PackRegistry = {
  register(pack: CapabilityPack): RegisterResult
  list(): ReadonlyArray<CapabilityPack>
  ownerFor(tuple: OwnerTuple): SelectOwnerResult
}

const claimedTuples = (pack: CapabilityPack): ReadonlyArray<OwnerTuple> => {
  const tuples: Array<OwnerTuple> = []
  for (const artifactKind of pack.manifest.artifactKinds) {
    for (const markClass of pack.manifest.markClasses) {
      for (const operation of pack.manifest.operations) {
        tuples.push({ artifactKind, markClass, operation })
      }
    }
  }
  return tuples
}

export const createRegistry = (): PackRegistry => {
  const packs: Array<CapabilityPack> = []

  const listedManifests = () => packs.map((pack) => pack.manifest)

  return {
    register(pack) {
      if (
        !kernelRangeIncludes(
          pack.manifest.kernelApiMin,
          pack.manifest.kernelApiMax,
          kernelApiVersion
        )
      ) {
        return { ok: false, code: "incompatible" }
      }

      if (packs.some((listed) => listed.manifest.id === pack.manifest.id)) {
        return { ok: false, code: "conflict" }
      }

      const listed = listedManifests()
      for (const tuple of claimedTuples(pack)) {
        const existing = selectOwner(listed, tuple)
        if (existing.ok || existing.code === "conflict") {
          return { ok: false, code: "conflict" }
        }
      }

      packs.push(pack)
      return { ok: true }
    },

    list() {
      return packs.slice()
    },

    ownerFor(tuple) {
      return selectOwner(listedManifests(), tuple)
    }
  }
}
