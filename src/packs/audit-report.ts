import { Schema } from "effect"
import { KernelFindingStatus, MarkClass } from "../core/domain.js"
import { Channel } from "../report.js"

const excessPropertyError = {
  parseOptions: { onExcessProperty: "error" as const }
}

/** One audit finding tied to a relative path. Four channels only. */
export class AuditFinding extends Schema.Class<AuditFinding>("AuditFinding")(
  {
    relativePath: Schema.String,
    channel: Channel,
    markClass: MarkClass,
    status: KernelFindingStatus,
    packId: Schema.String
  },
  [undefined, undefined, excessPropertyError]
) {}

export type AuditFindingInput = {
  readonly relativePath: string
  readonly channel: Channel
  readonly markClass: MarkClass
  readonly status: KernelFindingStatus
  readonly packId: string
}

/** Public audit JSON shape. Rejects unknown keys via Schema excess-property error. */
export class AuditJsonReport extends Schema.Class<AuditJsonReport>("AuditJsonReport")(
  {
    findings: Schema.Array(AuditFinding)
  },
  [undefined, undefined, excessPropertyError]
) {}

const SarifArtifactLocation = Schema.Struct({
  uri: Schema.String
}).annotations(excessPropertyError)

const SarifPhysicalLocation = Schema.Struct({
  artifactLocation: SarifArtifactLocation
}).annotations(excessPropertyError)

const SarifLocation = Schema.Struct({
  physicalLocation: SarifPhysicalLocation
}).annotations(excessPropertyError)

const SarifMessage = Schema.Struct({
  text: Schema.String
}).annotations(excessPropertyError)

const SarifResultProperties = Schema.Struct({
  channel: Channel,
  markClass: MarkClass,
  packId: Schema.String
}).annotations(excessPropertyError)

const SarifResult = Schema.Struct({
  ruleId: Schema.String,
  level: Schema.Literal("warning", "note", "error", "none"),
  message: SarifMessage,
  locations: Schema.Array(SarifLocation),
  properties: SarifResultProperties
}).annotations(excessPropertyError)

const SarifRule = Schema.Struct({
  id: Schema.String,
  shortDescription: SarifMessage
}).annotations(excessPropertyError)

const SarifDriver = Schema.Struct({
  name: Schema.Literal("anthropies"),
  informationUri: Schema.optionalWith(Schema.String, { exact: true }),
  rules: Schema.Array(SarifRule)
}).annotations(excessPropertyError)

const SarifTool = Schema.Struct({
  driver: SarifDriver
}).annotations(excessPropertyError)

const SarifRun = Schema.Struct({
  tool: SarifTool,
  results: Schema.Array(SarifResult)
}).annotations(excessPropertyError)

/** Channel-scoped SARIF 2.1.0 log. Rejects unknown top-level keys. */
export class AuditSarifLog extends Schema.Class<AuditSarifLog>("AuditSarifLog")(
  {
    version: Schema.Literal("2.1.0"),
    runs: Schema.Array(SarifRun)
  },
  [undefined, undefined, excessPropertyError]
) {}

const toFinding = (input: AuditFindingInput): AuditFinding => new AuditFinding({ ...input })

/** Sort by relative path, then channel, then mark class. */
export const aggregateAuditFindings = (
  findings: ReadonlyArray<AuditFindingInput>
): ReadonlyArray<AuditFinding> =>
  [...findings]
    .map(toFinding)
    .sort((left, right) => {
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

/** Encode audit JSON with deterministic finding order on the four channels only. */
export const encodeAuditJson = (findings: ReadonlyArray<AuditFindingInput>): unknown =>
  Schema.encodeUnknownSync(AuditJsonReport)(
    new AuditJsonReport({ findings: aggregateAuditFindings(findings) })
  )

const ruleIdFor = (finding: AuditFindingInput): string =>
  `${finding.packId}/${finding.markClass}`

/** Emit SARIF scoped to exactly one channel. Present findings only. */
export const encodeChannelSarif = (
  channel: Channel,
  findings: ReadonlyArray<AuditFindingInput>
): unknown => {
  const scoped = aggregateAuditFindings(findings).filter(
    (finding) => finding.channel === channel && finding.status === "present"
  )
  const rulesById = new Map<string, { id: string; shortDescription: { text: string } }>()
  const results = scoped.map((finding) => {
    const ruleId = ruleIdFor(finding)
    if (!rulesById.has(ruleId)) {
      rulesById.set(ruleId, {
        id: ruleId,
        shortDescription: {
          text: `${finding.packId} ${finding.markClass}`
        }
      })
    }
    return {
      ruleId,
      level: "warning" as const,
      message: {
        text: `${finding.markClass} ${finding.status} on ${finding.relativePath}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: finding.relativePath }
          }
        }
      ],
      properties: {
        channel: finding.channel,
        markClass: finding.markClass,
        packId: finding.packId
      }
    }
  })
  return Schema.encodeUnknownSync(AuditSarifLog)(
    new AuditSarifLog({
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "anthropies",
              rules: [...rulesById.values()]
            }
          },
          results
        }
      ]
    })
  )
}
