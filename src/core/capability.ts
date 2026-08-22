import type { Effect } from "effect"
import { Schema } from "effect"
import { Kind } from "../kind.js"
import { Channel } from "../report.js"
import {
  type Artifact,
  type Availability,
  type CapabilityFailure,
  type KernelFinding,
  MarkClass,
  type TransformResult
} from "./domain.js"

export const defaultNativeLimits = {
  timeoutMs: 30000,
  memoryBytes: 536870912,
  inputSizeBytes: 268435456,
  outputSizeBytes: 268435456,
  concurrency: 1
} as const

const excessPropertyError = {
  parseOptions: { onExcessProperty: "error" as const }
}

const CapabilityLimits = Schema.Struct({
  timeoutMs: Schema.Number,
  memoryBytes: Schema.Number,
  inputSizeBytes: Schema.Number,
  outputSizeBytes: Schema.Number,
  concurrency: Schema.Number
})

const CapabilityOrdering = Schema.Struct({
  before: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  after: Schema.optionalWith(Schema.Array(Schema.String), { exact: true })
})

const CapabilityOperation = Schema.Literal(
  "inspect",
  "remove",
  "rewrite",
  "score",
  "audit"
)

export class CapabilityManifest extends Schema.Class<CapabilityManifest>("CapabilityManifest")(
  {
    id: Schema.String,
    displayName: Schema.String,
    kernelApiMin: Schema.String,
    kernelApiMax: Schema.String,
    apiVersion: Schema.String,
    implementationVersion: Schema.String,
    schemeEpoch: Schema.optionalWith(Schema.String, { exact: true }),
    evidenceEpoch: Schema.optionalWith(Schema.String, { exact: true }),
    artifactKinds: Schema.Array(Kind),
    markClasses: Schema.Array(MarkClass),
    operations: Schema.Array(CapabilityOperation),
    channel: Channel,
    priority: Schema.Number,
    ordering: CapabilityOrdering,
    runtime: Schema.Literal("native-ts", "local-process", "loopback-sidecar"),
    network: Schema.Literal("none", "loopback", "remote-opt-in"),
    privacy: Schema.Literal("local-only", "may-send-bytes", "may-send-digests"),
    limits: CapabilityLimits,
    license: Schema.Literal("apache-2.0", "optional-noncommercial", "optional-restricted"),
    distribution: Schema.Literal("core", "optional"),
    provenance: Schema.optionalWith(Schema.String, { exact: true })
  },
  [undefined, undefined, excessPropertyError]
) {}

export class RunContext extends Schema.Class<RunContext>("RunContext")(
  {
    operation: Schema.Literal("inspect", "remove"),
    forceText: Schema.Boolean,
    json: Schema.Boolean,
    requireCapability: Schema.Array(Schema.String),
    kernelApiVersion: Schema.Literal("1.0.0")
  },
  [undefined, undefined, excessPropertyError]
) {}

export interface CapabilityPack {
  readonly manifest: CapabilityManifest
  probe(context: RunContext): Effect.Effect<Availability>
  inspect(
    artifact: Artifact,
    context: RunContext
  ): Effect.Effect<ReadonlyArray<KernelFinding>, CapabilityFailure>
  transform?(
    artifact: Artifact,
    context: RunContext
  ): Effect.Effect<TransformResult, CapabilityFailure>
}
