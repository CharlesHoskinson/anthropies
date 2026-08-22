import { describe, expect, it } from "@effect/vitest"
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  applyRewriteSetup,
  loadConfigFile,
  saveConfigFile,
  validateRewriteSetup,
  type AnthropiesConfig
} from "../src/config-file.js"

describe("config_file", () => {
  const withConfigPath = <A>(run: (path: string) => A): A => {
    const dir = mkdtempSync(join(tmpdir(), "anthropies-config-test-"))
    try {
      return run(join(dir, "config.json"))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it("saveConfigFile creates 0600 file and loadConfigFile reads it back", () =>
    withConfigPath((path) => {
      const config: AnthropiesConfig = {
        rewrite: {
          backend: "openai-compatible",
          model: "gpt-4o",
          baseUrl: "https://api.example.com/v1",
          apiKey: "sk-test-123",
          allowRemote: true
        }
      }
      saveConfigFile(config, path)
      expect(existsSync(path)).toBe(true)

      const st = statSync(path)
      expect(st.mode & 0o777).toBe(0o600)

      const loaded = loadConfigFile(path)
      expect(loaded.rewrite?.backend).toBe("openai-compatible")
      expect(loaded.rewrite?.model).toBe("gpt-4o")
      expect(loaded.rewrite?.baseUrl).toBe("https://api.example.com/v1")
      expect(loaded.rewrite?.apiKey).toBe("sk-test-123")
      expect(loaded.rewrite?.allowRemote).toBe(true)
    })
  )

  it("loadConfigFile returns empty object when file is missing", () =>
    withConfigPath((path) => {
      expect(loadConfigFile(path)).toEqual({})
    })
  )

  it("loadConfigFile returns empty object for invalid JSON", () =>
    withConfigPath((path) => {
      writeFileSync(path, "not valid json {", { encoding: "utf-8" })
      expect(loadConfigFile(path)).toEqual({})
    })
  )

  it("a later setup run clears stale rewrite values", () => {
    const existing: AnthropiesConfig = {
      rewrite: {
        backend: "openai-compatible",
        model: "old-model",
        baseUrl: "https://example.com",
        apiKey: "old-secret",
        allowRemote: true
      }
    }
    expect(
      applyRewriteSetup(existing, {
        backend: "ollama",
        model: "new-model",
        baseUrl: "http://127.0.0.1:11434",
        apiKey: "",
        allowRemote: false
      })
    ).toEqual({
      rewrite: {
        backend: "ollama",
        model: "new-model",
        baseUrl: "http://127.0.0.1:11434",
        allowRemote: false
      }
    })
  })

  it("HTTP rewrite setup requires a model", () => {
    expect(
      validateRewriteSetup({
        backend: "ollama",
        model: "  ",
        baseUrl: "http://127.0.0.1:11434",
        apiKey: "",
        allowRemote: false
      })
    ).toMatch(/model is required/)
  })
})
