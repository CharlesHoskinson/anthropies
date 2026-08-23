import { describe, expect, it } from "@effect/vitest"
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const composePath = join(root, "compose.yaml")
const dockerPath = join(root, "Dockerfile")
const packagePath = join(root, "package.json")
const srcRoot = join(root, "src")

const OPTIONAL_PROFILES = ["markllm", "markdiffusion", "ctrlregen", "image-scoring"] as const

const MODEL_FETCH_PATTERN =
  /huggingface|hf_hub|hf-hub|git\s+clone|curl\s+.*\.(gguf|safetensors|onnx|pt|pth|ckpt)|wget\s+.*\.(gguf|safetensors|onnx|pt|pth|ckpt)|pip\s+install|uv\s+pip|modelscope|torch\.hub/i

const MODEL_BLOB = /\.(gguf|safetensors|onnx|pt|pth|ckpt|bin)$/i

type ComposeJson = {
  readonly services?: Record<
    string,
    {
      readonly profiles?: ReadonlyArray<string>
      readonly healthcheck?: { readonly test?: unknown }
      readonly depends_on?: unknown
      readonly image?: string
      readonly build?: unknown
      readonly command?: unknown
      readonly entrypoint?: unknown
      readonly environment?: Record<string, string | null | undefined>
    }
  >
}

const composeConfig = (extraArgs: ReadonlyArray<string> = []): ComposeJson => {
  const out = execFileSync("docker", ["compose", "-f", composePath, ...extraArgs, "config", "--format", "json"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MARKLLM_DIR: "/tmp/anthropies-markllm-fixture",
      MARKDIFFUSION_DIR: "/tmp/anthropies-markdiffusion-fixture",
      CTRLREGEN_WEIGHTS: "/tmp/anthropies-ctrlregen-fixture",
      IMAGE_SCORING_BASE_URL: "http://127.0.0.1:18765"
    }
  })
  return JSON.parse(out) as ComposeJson
}

const composeServices = (extraArgs: ReadonlyArray<string> = []): Array<string> => {
  const out = execFileSync("docker", ["compose", "-f", composePath, ...extraArgs, "config", "--services"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MARKLLM_DIR: "/tmp/anthropies-markllm-fixture",
      MARKDIFFUSION_DIR: "/tmp/anthropies-markdiffusion-fixture",
      CTRLREGEN_WEIGHTS: "/tmp/anthropies-ctrlregen-fixture",
      IMAGE_SCORING_BASE_URL: "http://127.0.0.1:18765"
    }
  })
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

const walkRel = (dir: string, prefix = "", skip = new Set<string>()): Array<string> => {
  const out: Array<string> = []
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) {
      continue
    }
    const rel = prefix === "" ? name : `${prefix}/${name}`
    const path = join(dir, name)
    const st = statSync(path)
    if (st.isDirectory()) {
      out.push(...walkRel(path, rel, skip))
    } else {
      out.push(rel)
    }
  }
  return out
}

const serviceBlob = (service: NonNullable<ComposeJson["services"]>[string]): string =>
  JSON.stringify(service)

describe("compose_profiles", () => {
  it("default profile starts core only", () => {
    const services = composeServices()
    expect(services).toContain("anthropies")
    expect(services).toEqual(["anthropies"])
    for (const profile of OPTIONAL_PROFILES) {
      expect(services).not.toContain(profile)
    }
  })

  it("default compose config validates", () => {
    execFileSync("docker", ["compose", "-f", composePath, "config", "-q"], {
      cwd: root,
      encoding: "utf8"
    })
    const rendered = composeConfig()
    expect(rendered.services?.anthropies).toBeDefined()
    expect(Object.keys(rendered.services ?? {})).toEqual(["anthropies"])
  })

  it("licensed pack stays off without profile", () => {
    const services = composeServices()
    for (const profile of OPTIONAL_PROFILES) {
      expect(services).not.toContain(profile)
    }
    const raw = readFileSync(composePath, "utf8")
    for (const profile of OPTIONAL_PROFILES) {
      expect(raw).toMatch(new RegExp(`profiles:\\s*\\[\\s*["']${profile}["']\\s*\\]`))
    }
  })

  it("selecting one licensed profile does not enable others", () => {
    for (const profile of OPTIONAL_PROFILES) {
      const services = composeServices(["--profile", profile])
      expect(services).toContain("anthropies")
      expect(services).toContain(profile)
      for (const other of OPTIONAL_PROFILES) {
        if (other === profile) {
          continue
        }
        expect(services).not.toContain(other)
      }
      expect(services.sort()).toEqual(["anthropies", profile].sort())
    }
  })

  it("compose healthcheck uses core health", () => {
    const rendered = composeConfig()
    const health = rendered.services?.anthropies?.healthcheck
    expect(health).toBeDefined()
    const testBlob = JSON.stringify(health?.test ?? "")
    expect(testBlob).toMatch(/\/health/)
    expect(testBlob).toMatch(/127\.0\.0\.1:8765|localhost:8765/)
    const raw = readFileSync(composePath, "utf8")
    expect(raw).toMatch(/healthcheck:/i)
    expect(raw).toMatch(/\/health/)
  })

  it("core installs without optional packs", () => {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      name: string
      dependencies?: Record<string, string>
      optionalDependencies?: Record<string, string>
      scripts?: Record<string, string>
    }
    expect(pkg.name).toBe("anthropies")
    expect(pkg.optionalDependencies ?? {}).toEqual({})
    for (const [name] of Object.entries(pkg.dependencies ?? {})) {
      expect(name).not.toMatch(/markllm|markdiffusion|ctrlregen|image-scoring|synthid/i)
    }
    const docker = readFileSync(dockerPath, "utf8")
    expect(docker).toMatch(/COPY src \.\/src/)
    expect(docker).not.toMatch(/MARKLLM_DIR|MARKDIFFUSION_DIR|CTRLREGEN_WEIGHTS|IMAGE_SCORING/)
    for (const profile of OPTIONAL_PROFILES) {
      expect(existsSync(join(root, "packs", profile))).toBe(false)
      expect(existsSync(join(root, "optional-packs", profile))).toBe(false)
    }
  })

  it("one optional pack installs alone", () => {
    for (const profile of OPTIONAL_PROFILES) {
      const rendered = composeConfig(["--profile", profile])
      const optional = rendered.services?.[profile]
      expect(optional).toBeDefined()
      const depends = optional?.depends_on
      if (depends !== undefined) {
        const depKeys = Array.isArray(depends)
          ? depends
          : Object.keys(depends as Record<string, unknown>)
        for (const other of OPTIONAL_PROFILES) {
          if (other === profile) {
            continue
          }
          expect(depKeys).not.toContain(other)
        }
      }
      for (const other of OPTIONAL_PROFILES) {
        if (other === profile) {
          continue
        }
        expect(rendered.services?.[other]).toBeUndefined()
      }
    }
  })

  it("default startup does not fetch models", () => {
    const rendered = composeConfig()
    const core = rendered.services?.anthropies
    expect(core).toBeDefined()
    expect(serviceBlob(core!)).not.toMatch(MODEL_FETCH_PATTERN)
    const raw = readFileSync(composePath, "utf8")
    const defaultSection = raw.split(/^\s{2}markllm:/m)[0] ?? raw
    expect(defaultSection).not.toMatch(MODEL_FETCH_PATTERN)
    const cli = readFileSync(join(srcRoot, "cli.ts"), "utf8")
    const server = readFileSync(join(srcRoot, "http", "server.ts"), "utf8")
    expect(cli).not.toMatch(MODEL_FETCH_PATTERN)
    expect(server).not.toMatch(MODEL_FETCH_PATTERN)
  })

  it("default install does not fetch models", () => {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts?: Record<string, string>
    }
    for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
      expect(name).not.toMatch(/postinstall|preinstall|prepare/)
      expect(script).not.toMatch(MODEL_FETCH_PATTERN)
    }
    const docker = readFileSync(dockerPath, "utf8")
    expect(docker).not.toMatch(MODEL_FETCH_PATTERN)
    expect(docker).not.toMatch(/RUN\s+.*(curl|wget|huggingface)/i)
  })

  it("explicit download is required", () => {
    const raw = readFileSync(composePath, "utf8")
    expect(raw).toMatch(/explicit (download|enable|checkout)/i)
    expect(raw).toMatch(/docker compose --profile/)
    expect(raw).toMatch(/distinct from default (install|compose up|startup)/i)
    expect(raw).not.toMatch(/ONBUILD.*(curl|wget|huggingface)/i)
  })

  it("core omits Python sidecar trees", () => {
    const rels = walkRel(srcRoot)
    for (const rel of rels) {
      expect(rel).not.toMatch(/\.py$/)
      expect(rel).not.toMatch(/reverse-SynthID|reverse_synthid|aloshdenny/)
      expect(rel).not.toMatch(/yepengliu\/CtrlRegen|mertizci\/noai-watermark/)
      expect(rel).not.toMatch(/THU-BPM\/MarkLLM|THU-BPM\/MarkDiffusion/)
    }
    const docker = readFileSync(dockerPath, "utf8")
    expect(docker).toMatch(/^FROM node:/m)
    expect(docker).not.toMatch(/^FROM python/m)
    expect(docker).not.toMatch(/python3|pip install/i)
  })

  it("core stays publishable without optional packs", () => {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      bin?: Record<string, string>
      scripts?: Record<string, string>
    }
    expect(pkg.bin?.anthropies).toBe("./dist/cli.js")
    expect(pkg.scripts?.build).toMatch(/tsc/)
    const docker = readFileSync(dockerPath, "utf8")
    expect(docker).toMatch(/COPY src \.\/src/)
    expect(docker).toMatch(/pnpm build|tsc/)
    expect(docker).toMatch(/dist\/cli\.js/)
    expect(existsSync(join(srcRoot, "http", "server.ts"))).toBe(true)
    expect(existsSync(join(srcRoot, "packs", "layer-a.ts"))).toBe(true)
  })

  it("noncommercial pack stays out of core image", () => {
    const docker = readFileSync(dockerPath, "utf8")
    const copyLines = docker.split("\n").filter((line) => /^\s*COPY\b/.test(line))
    for (const line of copyLines) {
      expect(line).not.toMatch(/image-scoring|reverse-SynthID|synthid|spectral_codebook|aloshdenny/i)
      expect(line).not.toMatch(/optional-noncommercial|optional-restricted/i)
    }
    const rendered = composeConfig()
    expect(rendered.services?.["image-scoring"]).toBeUndefined()
    const withProfile = composeConfig(["--profile", "image-scoring"])
    expect(withProfile.services?.["image-scoring"]).toBeDefined()
    expect(withProfile.services?.["image-scoring"]?.build).toBeUndefined()
    const image = withProfile.services?.["image-scoring"]?.image ?? ""
    expect(image).not.toBe("anthropies:0.3.0")
    expect(image).toMatch(/image-scoring|optional/i)
  })

  it("core image omits bulk optional models", () => {
    const docker = readFileSync(dockerPath, "utf8")
    expect(docker).not.toMatch(MODEL_BLOB)
    expect(docker).not.toMatch(/models\/|weights\/|checkpoints\//i)
    const copyLines = docker.split("\n").filter((line) => /^\s*COPY\b/.test(line))
    for (const line of copyLines) {
      expect(line).not.toMatch(/markllm|markdiffusion|ctrlregen|image-scoring/i)
      expect(line).not.toMatch(/\.gguf|\.safetensors|\.onnx|\.pt|\.pth|\.ckpt/i)
    }
    const rels = walkRel(root, "", new Set(["node_modules", "dist", ".git", "fixtures", "knowledge"]))
    for (const rel of rels) {
      expect(MODEL_BLOB.test(rel)).toBe(false)
    }
  })
})
