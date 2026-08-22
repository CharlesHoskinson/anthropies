import { Effect } from "effect"
import type { RunContext } from "./capability.js"
import {
  CapabilityFailure,
  Evidence,
  type Artifact,
  type KernelFinding,
  type Removal,
  TransformResult
} from "./domain.js"
import { plan } from "./planner.js"
import { shouldPreserveOriginal } from "./policy.js"
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
      current = outcome.result.artifact
      removals.push(...outcome.result.removals)
      residualFindings.push(...outcome.result.residualFindings)
      warnings.push(...outcome.result.warnings)
      evidence = outcome.result.evidence
      changed = true
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
