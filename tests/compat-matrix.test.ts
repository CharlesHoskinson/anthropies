import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { CapabilityManifest, defaultNativeLimits, type CapabilityPack } from "../src/core/capability.js"
import { Availability, kernelApiVersion } from "../src/core/domain.js"
import { builtinRegistry } from "../src/core/builtin-registry.js"
import { createRegistry } from "../src/core/registry.js"
import { IMAGE_SCORING_PINS, pinsComplete } from "../src/packs/image-scoring.js"
import { sidecarInspect } from "../src/sidecars/client.js"
import {
  SidecarCapabilities,
  SidecarHealth,
  sidecarProtocolVersion
} from "../src/sidecars/protocol.js"

const root = fileURLToPath(new URL("..", import.meta.url))
const compatPath = join(root, "docs", "COMPATIBILITY.md")
const readmePath = join(root, "README.md")
const dockerPath = join(root, "Dockerfile")

type PackMatrixRow = {
  readonly id: string
  readonly kernelApiMin: string
  readonly kernelApiMax: string
  readonly outcome: "supported" | "incompatible"
}

type PreviousProtocolRow = {
  readonly version: string
  readonly outcome: "supported" | "incompatible"
}

type CompatMatrix = {
  readonly currentSidecarProtocol: string
  readonly currentSidecarProtocolOutcome: "supported" | "incompatible"
  readonly previousSidecarProtocols: ReadonlyArray<PreviousProtocolRow>
  readonly kernelApiVersion: string
  readonly packs: ReadonlyArray<PackMatrixRow>
}

const MACHINE_JSON_RE =
  /```json\s*compat-matrix\s*\n([\s\S]*?)\n```/

const loadCompatDoc = (): string => readFileSync(compatPath, "utf8")
const loadReadme = (): string => readFileSync(readmePath, "utf8")

const loadMatrix = (): CompatMatrix => {
  const doc = loadCompatDoc()
  const match = MACHINE_JSON_RE.exec(doc)
  if (match === null) {
    throw new Error("docs/COMPATIBILITY.md missing ```json compat-matrix fence")
  }
  return JSON.parse(match[1]!) as CompatMatrix
}

const mockPack = (manifest: CapabilityManifest): CapabilityPack => ({
  manifest,
  probe: () => Effect.succeed(new Availability({ status: "available", reason: "ready" })),
  inspect: () => Effect.succeed([])
})

const layerAInput = {
  id: "anthropies.layer-a",
  displayName: "Layer A",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text"],
  markClasses: ["invisible-unicode"],
  operations: ["inspect", "remove"],
  channel: "deterministic",
  priority: 100,
  ordering: {},
  runtime: "native-ts",
  network: "none",
  privacy: "local-only",
  limits: defaultNativeLimits,
  license: "apache-2.0",
  distribution: "core"
} as const

const artifact = {
  bytes: "b3duZWQgb3V0cHV0",
  kind: "text" as const,
  digest: "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })

const failureOf = async (
  effect: ReturnType<typeof sidecarInspect>
): Promise<{ code: string; reason: string; packId: string }> => {
  const exit = await Effect.runPromiseExit(effect)
  if (exit._tag !== "Failure") {
    throw new Error("expected failure")
  }
  const dump = JSON.stringify(exit.cause)
  const match = dump.match(/"code":"([^"]+)".*"reason":"([^"]+)".*"packId":"([^"]+)"/s)
  if (match) {
    return { code: match[1]!, reason: match[2]!, packId: match[3]! }
  }
  const schemaOrder = dump.match(/"code":"([^"]+)".*"packId":"([^"]+)".*"reason":"([^"]+)"/s)
  if (schemaOrder) {
    return { code: schemaOrder[1]!, packId: schemaOrder[2]!, reason: schemaOrder[3]! }
  }
  throw new Error(`unrecognized failure ${dump.slice(0, 400)}`)
}

const OPTIONAL_MODEL_PACKS = ["markllm", "markdiffusion", "ctrlregen", "image-scoring"] as const

/** Core release acceptance: reject monolithic all-model inventories. */
const acceptCoreReleaseImage = (dockerfile: string): boolean => {
  const copyLines = dockerfile.split("\n").filter((line) => /^\s*COPY\b/.test(line))
  const embedsOptional = OPTIONAL_MODEL_PACKS.every((name) =>
    copyLines.some((line) => line.toLowerCase().includes(name))
  )
  const embedsWeightTrees =
    /models\/|weights\/|checkpoints\//i.test(dockerfile) &&
    /\.(gguf|safetensors|onnx|pt|pth|ckpt)\b/i.test(dockerfile)
  if (embedsOptional || embedsWeightTrees) {
    return false
  }
  return true
}

describe("compat_matrix", () => {
  it("matrix lists current sidecar protocol", () => {
    const matrix = loadMatrix()
    expect(matrix.currentSidecarProtocol).toBe("1.0.0")
    expect(sidecarProtocolVersion).toBe("1.0.0")
    expect(matrix.currentSidecarProtocolOutcome).toBe("supported")
    const listedIds = matrix.packs.map((row) => row.id)
    const builtinIds = builtinRegistry().list().map((pack) => pack.manifest.id)
    for (const id of builtinIds) {
      expect(listedIds).toContain(id)
    }
    for (const row of matrix.packs) {
      expect(row.kernelApiMin).toMatch(/^\d+\.\d+\.\d+$/)
      expect(row.kernelApiMax).toMatch(/^\d+\.\d+\.\d+$/)
    }
    expect(loadCompatDoc()).toMatch(/sidecar protocol version `?1\.0\.0`?.*current/i)
  })

  it("supported kernel range passes", () => {
    const matrix = loadMatrix()
    expect(matrix.kernelApiVersion).toBe(kernelApiVersion)
    const registry = createRegistry()
    const pack = mockPack(Schema.decodeUnknownSync(CapabilityManifest)(layerAInput))
    expect(registry.register(pack)).toEqual({ ok: true })
    const cell = matrix.packs.find((row) => row.id === "anthropies.layer-a")
    expect(cell).toBeDefined()
    expect(cell!.outcome).toBe("supported")
    expect(cell!.kernelApiMin <= kernelApiVersion && kernelApiVersion <= cell!.kernelApiMax).toBe(
      true
    )
  })

  it("unsupported kernel range is incompatible", () => {
    const matrix = loadMatrix()
    const registry = createRegistry()
    const pack = mockPack(
      Schema.decodeUnknownSync(CapabilityManifest)({
        ...layerAInput,
        id: "anthropies.too-new",
        kernelApiMin: "2.0.0",
        kernelApiMax: "2.0.0"
      })
    )
    expect(registry.register(pack)).toEqual({ ok: false, code: "incompatible" })
    expect(registry.list()).toEqual([])
    const unsupported = matrix.packs.find((row) => row.outcome === "incompatible")
    expect(unsupported).toBeDefined()
    expect(loadCompatDoc()).toMatch(/incompatible/i)
    expect(loadCompatDoc()).toMatch(/do not certify|does not certify|shall not certify/i)
  })

  it("previous protocol rows exist", () => {
    const matrix = loadMatrix()
    expect(Array.isArray(matrix.previousSidecarProtocols)).toBe(true)
    for (const row of matrix.previousSidecarProtocols) {
      expect(typeof row.version).toBe("string")
      expect(row.version.length).toBeGreaterThan(0)
      expect(["supported", "incompatible"]).toContain(row.outcome)
    }
    expect(loadCompatDoc()).toMatch(/previous sidecar protocol/i)
  })

  it("empty previous set is explicit when none exist", () => {
    const matrix = loadMatrix()
    expect(matrix.currentSidecarProtocol).toBe("1.0.0")
    expect(matrix.previousSidecarProtocols).toEqual([])
    expect(loadCompatDoc()).toMatch(/previous-protocol set is empty/i)
  })

  it("unsupported previous protocol fails closed", async () => {
    const fetch = async (): Promise<Response> =>
      jsonResponse({
        protocolVersion: "0.9.0",
        ok: true,
        packId: "anthropies.layer-a",
        artifact,
        findings: []
      })
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, artifact)
    )
    expect(fail.code).toBe("incompatible")
    expect(fail.reason).toBe("protocol-mismatch")
    expect(loadCompatDoc()).toMatch(/fail-closed|fails closed/i)
    expect(loadCompatDoc()).toMatch(/do not certify|does not certify|shall not certify/i)
  })

  it("current protocol still negotiates", () => {
    const health = Schema.decodeUnknownSync(SidecarHealth)(
      JSON.parse(readFileSync(join(root, "fixtures/sidecars/v1/health-ok.json"), "utf8"))
    )
    expect(health.protocolVersion).toBe("1.0.0")
    expect(health.ok).toBe(true)
    const caps = Schema.decodeUnknownSync(SidecarCapabilities)(
      JSON.parse(readFileSync(join(root, "fixtures/sidecars/v1/capabilities-ok.json"), "utf8"))
    )
    expect(caps.protocolVersion).toBe("1.0.0")
    const matrix = loadMatrix()
    expect(matrix.currentSidecarProtocol).toBe("1.0.0")
    expect(matrix.currentSidecarProtocolOutcome).toBe("supported")
  })

  it("all-model image fails acceptance", () => {
    const docker = readFileSync(dockerPath, "utf8")
    expect(acceptCoreReleaseImage(docker)).toBe(true)
    const allModelCandidate = [
      docker,
      "COPY packs/markllm /opt/markllm",
      "COPY packs/markdiffusion /opt/markdiffusion",
      "COPY packs/ctrlregen /opt/ctrlregen",
      "COPY packs/image-scoring /opt/image-scoring",
      "COPY models/all.safetensors /models/all.safetensors"
    ].join("\n")
    expect(acceptCoreReleaseImage(allModelCandidate)).toBe(false)
    expect(loadCompatDoc()).toMatch(/all-model image fails acceptance/i)
  })

  it("optional pack carries pins when models ship", () => {
    expect(pinsComplete(IMAGE_SCORING_PINS)).toBe(true)
    expect(IMAGE_SCORING_PINS.containerOrLockDigest.length).toBeGreaterThan(0)
    expect(IMAGE_SCORING_PINS.upstreamCommit.length).toBeGreaterThan(0)
    expect(IMAGE_SCORING_PINS.modelOrCodebookDigest.length).toBeGreaterThan(0)
    expect(IMAGE_SCORING_PINS.configurationDigest.length).toBeGreaterThan(0)
    const doc = loadCompatDoc()
    expect(doc).toMatch(/upstream/i)
    expect(doc).toMatch(/model or codebook|modelOrCodebookDigest/i)
    expect(doc).toMatch(/configuration/i)
    expect(doc).toMatch(/container or lock|containerOrLockDigest/i)
  })

  it("licensed profile documents redistribution limits", () => {
    const docs = `${loadCompatDoc()}\n${loadReadme()}`
    expect(docs).toMatch(/image-scoring/)
    expect(docs).toMatch(/optional-noncommercial|optional-restricted/)
    expect(docs).toMatch(/license disposition|redistribution/i)
    expect(docs).toMatch(/markllm|markdiffusion|ctrlregen/i)
  })

  it("operator docs name default profile behavior", () => {
    const docs = `${loadCompatDoc()}\n${loadReadme()}`
    expect(docs).toMatch(/default Compose profile is local-only TypeScript core/i)
    expect(docs).toMatch(/docker compose --profile/)
    expect(docs).toMatch(/enable one optional pack|optional pack profile independently/i)
  })

  it("troubleshooting covers unavailable optional packs", () => {
    const doc = loadCompatDoc()
    expect(doc).toMatch(/## Troubleshooting/i)
    expect(doc).toMatch(/unavailable optional packs as fail-soft|fail-soft for core/i)
    expect(doc).toMatch(
      /incompatible protocol versions as fail-closed|fail-closed for certification/i
    )
  })
})
