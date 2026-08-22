import { Effect } from "effect"
import type { CapabilityPack, RunContext } from "./capability.js"
import {
  CapabilityFailure,
  Evidence,
  type Artifact,
  type KernelFinding,
  type Removal,
  TransformResult
} from "./domain.js"
import { plan } from "./planner.js"
import { isOptionalFailSoft, shouldPreserveOriginal } from "./policy.js"
import type { PackRegistry } from "./registry.js"

const planConflict = (): CapabilityFailure =>
  new CapabilityFailure({ code: "conflict", packId: "pipeline", reason: "conflict" })

const unchangedResult = (artifact: Artifact): TransformResult =>
  new TransformResult({
    artifact,
    removals: [],
    evidence: new Evidence({ kind: "contract" }),
    residualFindings: [],
    warnings: [],
    remediation: "unchanged"
  })

const probeGate = (
  pack: CapabilityPack,
  context: RunContext
): Effect.Effect<"run" | "skip", CapabilityFailure> =>
  Effect.gen(function* () {
    const availability = yield* pack.probe(context)
    if (availability.status !== "unavailable") {
      return "run" as const
    }
    if (isOptionalFailSoft(pack.manifest, context.requireCapability)) {
      return "skip" as const
    }
    return yield* Effect.fail(
      new CapabilityFailure({
        code: "unavailable",
        packId: pack.manifest.id,
        reason: availability.reason
      })
    )
  })

export const inspectArtifact = (
  registry: PackRegistry,
  artifact: Artifact,
  context: RunContext
): Effect.Effect<ReadonlyArray<KernelFinding>, CapabilityFailure> => {
  const planned = plan(registry, { kind: artifact.kind, context })
  if (!planned.ok) {
    if (planned.code === "none") {
      return Effect.succeed([])
    }
    return Effect.fail(planConflict())
  }
  return Effect.gen(function* () {
    const findings: Array<KernelFinding> = []
    for (const pack of planned.packs) {
      const gate = yield* probeGate(pack, context)
      if (gate === "skip") {
        continue
      }
      const packFindings = yield* pack.inspect(artifact, context)
      findings.push(...packFindings)
    }
    return findings
  })
}

export const transformArtifact = (
  registry: PackRegistry,
  artifact: Artifact,
  context: RunContext
): Effect.Effect<TransformResult, CapabilityFailure> => {
  const planned = plan(registry, { kind: artifact.kind, context })
  if (!planned.ok) {
    if (planned.code === "none") {
      return Effect.succeed(unchangedResult(artifact))
    }
    return Effect.fail(planConflict())
  }
  return Effect.gen(function* () {
    let current = artifact
    const removals: Array<Removal> = []
    const residualFindings: Array<KernelFinding> = []
    const warnings: Array<string> = []
    let evidence = new Evidence({ kind: "contract" })
    let changed = false

    for (const pack of planned.packs) {
      const gate = yield* probeGate(pack, context)
      if (gate === "skip") {
        continue
      }
      if (pack.transform === undefined) {
        continue
      }
      const outcome = yield* pack.transform(current, context).pipe(
        Effect.map((result) => ({ _tag: "ok" as const, result })),
        Effect.catchAll((failure) =>
          shouldPreserveOriginal(failure.reason)
            ? Effect.succeed({ _tag: "preserve" as const })
            : Effect.fail(failure)
        )
      )
      if (outcome._tag === "preserve") {
        return unchangedResult(artifact)
      }
      const next = outcome.result.artifact
      removals.push(...outcome.result.removals)
      residualFindings.push(...outcome.result.residualFindings)
      warnings.push(...outcome.result.warnings)
      evidence = outcome.result.evidence
      if (next.digest !== current.digest) {
        changed = true
      }
      current = next
    }

    return new TransformResult({
      artifact: current,
      removals,
      evidence,
      residualFindings,
      warnings,
      remediation: changed ? "changed" : "unchanged"
    })
  })
}
