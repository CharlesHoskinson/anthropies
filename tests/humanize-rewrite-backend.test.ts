import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Either, Layer } from "effect"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Humanizer } from "../src/services/humanizer.js"
import { saveConfigFile, type AnthropiesConfig } from "../src/config-file.js"
import { unicodeWords } from "../src/rewrite-metric.js"

const longProse = (stem: string, n: number): string =>
  Array.from({ length: n }, (_, i) => `${stem}${["a", "b", "c", "d"][i % 4] ?? "a"}`).join(" ")

const SOURCE = longProse("alpha", 220)
const REWRITTEN = longProse("bravo", 220)

interface RecordedPost {
  readonly href: string
  readonly method: string
  readonly model?: string
}

const fakeClient = (
  recorded: Array<RecordedPost>,
  body: unknown
): HttpClient.HttpClient =>
  HttpClient.make((request, url) => {
    const payload =
      request.body._tag === "Uint8Array"
        ? (JSON.parse(new TextDecoder().decode(request.body.body)) as { readonly model?: string })
        : {}
    recorded.push({ href: url.href, method: request.method, ...(payload.model !== undefined ? { model: payload.model } : {}) })
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    )
  })

const runHumanize = <A, E>(
  env: ReadonlyArray<readonly [string, string]>,
  http: HttpClient.HttpClient,
  effect: Effect.Effect<A, E, never>,
  config?: AnthropiesConfig
): Effect.Effect<A, E> => {
  const dir = mkdtempSync(join(tmpdir(), "anthropies-humanizer-test-"))
  const path = join(dir, "config.json")
  if (config !== undefined) {
    saveConfigFile(config, path)
  }
  return effect.pipe(
    Effect.provide(Layer.mergeAll(Humanizer.Default, NodeContext.layer, Layer.succeed(HttpClient.HttpClient, http))),
    Effect.withConfigProvider(
      ConfigProvider.fromMap(new Map([...env, ["ANTHROPIES_CONFIG_PATH", path]]))
    ),
    Effect.ensuring(Effect.sync(() => rmSync(dir, { recursive: true, force: true })))
  )
}

describe("humanize_rewrite_backends", () => {
  it.scoped("ollama POST computes rewrite_metric when n>=200", () => {
    const recorded: Array<RecordedPost> = []
    return runHumanize(
      [
        ["ANTHROPIES_REWRITE_BACKEND", "ollama"],
        ["ANTHROPIES_REWRITE_MODEL", "llama3.2"]
      ],
      fakeClient(recorded, { response: REWRITTEN }),
      Effect.gen(function* () {
        const result = yield* Humanizer.humanize(SOURCE, { kind: "prose" })
        expect(recorded).toHaveLength(1)
        expect(recorded[0]?.method).toBe("POST")
        expect(recorded[0]?.href).toBe("http://127.0.0.1:11434/api/generate")
        expect(result.text).toBe(REWRITTEN)
        expect(result.text).not.toMatch(/Rewrite the text below/)
        expect(result.note).toMatch(/ollama/)
        expect(result.note).not.toMatch(/watermark removed/i)
        expect(result.metric.status).toBe("computed")
        expect(result.metric.n).toBeGreaterThanOrEqual(200)
        expect(result.metric.n).toBe(unicodeWords(SOURCE).length)
        expect(result.metric.domain).toBe("prose")
        expect(result.metric.surviving_ratio).not.toBeNull()
        expect(result.metric.tokenizer).toBe("unicode-words")
        expect(result.metric.ngram).toBe(5)
      })
    )
  })

  it.scoped("openai-compatible POST computes rewrite_metric when n>=200", () => {
    const recorded: Array<RecordedPost> = []
    return runHumanize(
      [
        ["ANTHROPIES_REWRITE_BACKEND", "openai-compatible"],
        ["ANTHROPIES_REWRITE_MODEL", "llama3.2"]
      ],
      fakeClient(recorded, { choices: [{ message: { content: REWRITTEN } }] }),
      Effect.gen(function* () {
        const result = yield* Humanizer.humanize(SOURCE, { kind: "prose" })
        expect(recorded).toHaveLength(1)
        expect(recorded[0]?.method).toBe("POST")
        expect(recorded[0]?.href).toBe("http://127.0.0.1:11434/v1/chat/completions")
        expect(result.text).toBe(REWRITTEN)
        expect(result.metric.status).toBe("computed")
        expect(result.metric.n).toBeGreaterThanOrEqual(200)
        expect(result.metric.surviving_ratio).not.toBeNull()
      })
    )
  })

  it.scoped("successful rewrite with n<200 is insufficient", () => {
    const recorded: Array<RecordedPost> = []
    const short = "The compiler rejected the patch."
    return runHumanize(
      [
        ["ANTHROPIES_REWRITE_BACKEND", "ollama"],
        ["ANTHROPIES_REWRITE_MODEL", "llama3.2"]
      ],
      fakeClient(recorded, { response: "A different sentence entirely." }),
      Effect.gen(function* () {
        const result = yield* Humanizer.humanize(short, { kind: "prose" })
        expect(recorded).toHaveLength(1)
        expect(result.text).toBe("A different sentence entirely.")
        expect(result.metric.status).toBe("insufficient")
        expect(result.metric.surviving_ratio).toBeNull()
        expect(result.metric.n).toBe(unicodeWords(short).length)
      })
    )
  })

  it.scoped("origin blocklist still refuses before POST", () => {
    const recorded: Array<RecordedPost> = []
    return runHumanize(
      [
        ["ANTHROPIES_REWRITE_BACKEND", "ollama"],
        ["ANTHROPIES_REWRITE_MODEL", "claude-opus"]
      ],
      fakeClient(recorded, { response: REWRITTEN }),
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/owned.txt`
        const original = `${SOURCE}\n`
        yield* fs.writeFileString(path, original)
        const result = yield* Humanizer.humanizeFile(path, {
          forceText: false,
          json: false,
          inPlace: true
        }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("OriginBlocked")
        }
        expect(recorded).toHaveLength(0)
        expect(yield* fs.readFileString(path)).toBe(original)
        expect(yield* fs.exists(`${path}.cleaned`)).toBe(false)
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
      })
    )
  })

  it.scoped("non-loopback URL without ALLOW_REMOTE does not POST", () => {
    const recorded: Array<RecordedPost> = []
    return runHumanize(
      [
        ["ANTHROPIES_REWRITE_BACKEND", "ollama"],
        ["ANTHROPIES_REWRITE_MODEL", "llama3.2"],
        ["ANTHROPIES_REWRITE_BASE_URL", "http://example.com:8080"]
      ],
      fakeClient(recorded, { response: REWRITTEN }),
      Effect.gen(function* () {
        const result = yield* Humanizer.humanize(SOURCE, { kind: "prose" }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("RewriteRemoteDenied")
        }
        expect(recorded).toHaveLength(0)
      })
    )
  })

  it.scoped("ALLOW_REMOTE=1 permits a non-loopback POST", () => {
    const recorded: Array<RecordedPost> = []
    return runHumanize(
      [
        ["ANTHROPIES_REWRITE_BACKEND", "openai-compatible"],
        ["ANTHROPIES_REWRITE_MODEL", "llama3.2"],
        ["ANTHROPIES_REWRITE_BASE_URL", "http://example.com:8080"],
        ["ANTHROPIES_REWRITE_ALLOW_REMOTE", "1"]
      ],
      fakeClient(recorded, { choices: [{ message: { content: REWRITTEN } }] }),
      Effect.gen(function* () {
        const result = yield* Humanizer.humanize(SOURCE, { kind: "prose" })
        expect(recorded).toHaveLength(1)
        expect(recorded[0]?.href).toBe("http://example.com:8080/v1/chat/completions")
        expect(result.metric.status).toBe("computed")
        expect(result.text).toBe(REWRITTEN)
      })
    )
  })

  // --- Config file fallback tests ---
  // Write a temporary ~/.anthropies/config.json, run humanize, verify the
  // config file values are picked up when env vars are absent.

  const configFileTest = (
    name: string,
    config: AnthropiesConfig,
    env: ReadonlyArray<readonly [string, string]>,
    body: unknown,
    assert: (recorded: Array<RecordedPost>) => void
  ): void => {
    it.scoped(name, () => {
      const recorded: Array<RecordedPost> = []
      return runHumanize(env, fakeClient(recorded, body), Effect.gen(function* () {
        yield* Humanizer.humanize(SOURCE, { kind: "prose" }).pipe(Effect.either)
        assert(recorded)
      }), config)
    })
  }

  configFileTest(
    "config file model is used when env ANTHROPIES_REWRITE_MODEL is absent",
    { rewrite: { backend: "ollama", model: "file-model", baseUrl: "http://127.0.0.1:11434" } },
    [["ANTHROPIES_REWRITE_BACKEND", "ollama"]],
    { response: REWRITTEN },
    (recorded) => {
      expect(recorded).toHaveLength(1)
      expect(recorded[0]?.href).toBe("http://127.0.0.1:11434/api/generate")
      expect(recorded[0]?.model).toBe("file-model")
    }
  )

  configFileTest(
    "env ANTHROPIES_REWRITE_MODEL overrides config file model",
    { rewrite: { backend: "ollama", model: "file-model", baseUrl: "http://127.0.0.1:11434" } },
    [
      ["ANTHROPIES_REWRITE_BACKEND", "ollama"],
      ["ANTHROPIES_REWRITE_MODEL", "env-model"]
    ],
    { response: REWRITTEN },
    (recorded) => {
      expect(recorded).toHaveLength(1)
      expect(recorded[0]?.href).toBe("http://127.0.0.1:11434/api/generate")
      expect(recorded[0]?.model).toBe("env-model")
    }
  )

  configFileTest(
    "config file baseUrl is used when env ANTHROPIES_REWRITE_BASE_URL is absent",
    { rewrite: { backend: "ollama", model: "llama3.2", baseUrl: "http://127.0.0.1:9999" } },
    [["ANTHROPIES_REWRITE_BACKEND", "ollama"]],
    { response: REWRITTEN },
    (recorded) => {
      expect(recorded).toHaveLength(1)
      expect(recorded[0]?.href).toBe("http://127.0.0.1:9999/api/generate")
    }
  )

  configFileTest(
    "config file allowRemote permits non-loopback URL",
    {
      rewrite: {
        backend: "openai-compatible",
        model: "llama3.2",
        baseUrl: "http://example.com:8080",
        allowRemote: true
      }
    },
    [["ANTHROPIES_REWRITE_BACKEND", "openai-compatible"]],
    { choices: [{ message: { content: REWRITTEN } }] },
    (recorded) => {
      expect(recorded).toHaveLength(1)
      expect(recorded[0]?.href).toBe("http://example.com:8080/v1/chat/completions")
    }
  )
})
