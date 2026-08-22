import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { sidecarInspect } from "../src/sidecars/client.js"

const artifact = {
  bytes: "b3duZWQgb3V0cHV0",
  kind: "text" as const,
  digest: "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
}

const inspectOk = JSON.parse(
  readFileSync("fixtures/sidecars/v1/inspect-ok.json", "utf8")
) as unknown

const errorTimeout = JSON.parse(
  readFileSync("fixtures/sidecars/v1/error-timeout.json", "utf8")
) as unknown

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
  const err = exit.cause
  const dump = JSON.stringify(err)
  const match = dump.match(/"code":"([^"]+)".*"reason":"([^"]+)".*"packId":"([^"]+)"/s)
  if (match) {
    return { code: match[1]!, reason: match[2]!, packId: match[3]! }
  }
  // Schema.TaggedError serializes code, packId, reason (packId before reason).
  const schemaOrder = dump.match(/"code":"([^"]+)".*"packId":"([^"]+)".*"reason":"([^"]+)"/s)
  if (schemaOrder) {
    return { code: schemaOrder[1]!, packId: schemaOrder[2]!, reason: schemaOrder[3]! }
  }
  const fail = (err as { failures?: ReadonlyArray<{ error?: { code: string; reason: string; packId: string } }> })
    .failures?.[0]?.error
  if (fail?.code !== undefined) {
    return fail
  }
  throw new Error(`unrecognized failure ${dump.slice(0, 400)}`)
}

describe("sidecar_client", () => {
  it("refuses example.com without calling fetch", async () => {
    let calls = 0
    const fetch = async (): Promise<Response> => {
      calls += 1
      return jsonResponse(inspectOk)
    }
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://example.com", packId: "sid", fetch }, artifact)
    )
    expect(calls).toBe(0)
    expect(fail.code).toBe("unavailable")
    expect(fail.reason).toBe("privacy-denied")
    expect(fail.packId).toBe("sid")
  })

  it("posts inspect to loopback and decodes the golden", async () => {
    const urls: Array<string> = []
    const fetch = async (input: string): Promise<Response> => {
      urls.push(input)
      return jsonResponse(inspectOk)
    }
    const result = await Effect.runPromise(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, artifact)
    )
    expect(urls).toEqual(["http://127.0.0.1:1870/v1/inspect"])
    expect(result.ok).toBe(true)
    expect(result.packId).toBe("anthropies.layer-a")
  })

  it("maps protocolVersion 2 to incompatible", async () => {
    const fetch = async (): Promise<Response> =>
      jsonResponse({ ...(inspectOk as object), protocolVersion: "2.0.0" })
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, artifact)
    )
    expect(fail.code).toBe("incompatible")
    expect(fail.reason).toBe("protocol-mismatch")
  })

  it("maps SidecarError timeout", async () => {
    const fetch = async (): Promise<Response> => jsonResponse(errorTimeout)
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, artifact)
    )
    expect(fail.code).toBe("timeout")
    expect(fail.reason).toBe("timeout")
  })

  it("maps malformed JSON to malformed-output", async () => {
    const fetch = async (): Promise<Response> =>
      new Response("not-json", { status: 200, headers: { "content-type": "application/json" } })
    const fail = await failureOf(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, artifact)
    )
    expect(fail.code).toBe("malformed-output")
    expect(fail.reason).toBe("malformed-output")
  })

  it("does not follow redirects", async () => {
    const urls: Array<string> = []
    const fetch = async (input: string, init?: RequestInit): Promise<Response> => {
      urls.push(input)
      expect(init?.redirect).toBe("error")
      return new Response(JSON.stringify(inspectOk), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }
    await Effect.runPromise(
      sidecarInspect({ baseUrl: "http://127.0.0.1:1870", packId: "sid", fetch }, artifact)
    )
    expect(urls).toEqual(["http://127.0.0.1:1870/v1/inspect"])
  })
})
