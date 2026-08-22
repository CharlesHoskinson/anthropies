import {
  Command as ProcCommand,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { FileSystem } from "@effect/platform/FileSystem"
import { Effect, Either, Layer, Option, Redacted, Schema } from "effect"
import { anthropicDetectUrl, serverApiKey } from "../config.js"
import { RunContext } from "../core/capability.js"
import { builtinRegistry } from "../core/builtin-registry.js"
import { kernelApiVersion } from "../core/domain.js"
import { DecodeError } from "../fail.js"
import { Report } from "../report.js"
import { Cleaner } from "../services/cleaner.js"
import { Inspector } from "../services/inspector.js"
import { PdfTools } from "../formats/pdf.js"
import { openApiDocument } from "./openapi.js"
import {
  CapabilitiesResponse,
  CleanResponse,
  decodeRequestFile,
  FileRequest,
  InspectResponse,
  PackCapabilityView,
  ScorerPresence,
  serviceVersion,
  ToolPresence
} from "./schema.js"

const json400 = (error: string, reason?: string): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.unsafeJson(
    reason === undefined ? { ok: false, error } : { ok: false, error, reason },
    { status: 400 }
  )

const json401 = HttpServerResponse.unsafeJson({ ok: false, error: "unauthorized" }, { status: 401 })

const encodeInspect = (report: Report): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.unsafeJson(
    Schema.encodeUnknownSync(InspectResponse)(
      new InspectResponse({ ok: true, kind: report.kind, report })
    )
  )

const encodeClean = (report: Report, bytes: Uint8Array): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.unsafeJson(
    Schema.encodeUnknownSync(CleanResponse)(
      new CleanResponse({ ok: true, kind: report.kind, report, cleaned: bytes })
    )
  )

const toolPresent = (bin: string, flag: string) =>
  ProcCommand.exitCode(ProcCommand.make(bin, flag)).pipe(
    Effect.map((code) => Number(code) === 0),
    Effect.catchAll(() => Effect.succeed(false))
  )

/** Basename only. Path segments and dots cannot escape the scoped temp dir. */
export const safeUploadName = (name: string): string => {
  const base =
    name.replaceAll("\\", "/").split("/").filter((part) => part.length > 0).pop() ?? "upload"
  if (base === "." || base === "..") {
    return "upload"
  }
  return base
}

const writeUpload = (name: string, bytes: Uint8Array) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    const path = `${dir}/${safeUploadName(name)}`
    yield* fs.writeFile(path, bytes).pipe(
      Effect.mapError((e) => new DecodeError({ path, reason: e.message }))
    )
    return path
  })

const parseFileRequest = HttpServerRequest.schemaBodyJson(FileRequest).pipe(
  Effect.mapError(() => new DecodeError({ path: "<request>", reason: "invalid json" }))
)

const failTags = new Set(["BinaryInput", "OriginBlocked", "DecodeError", "WriteGuard", "InputTooLarge"])

const tagOf = (u: unknown): string | undefined => {
  if (typeof u === "object" && u !== null && "_tag" in u) {
    return String(u._tag)
  }
  return undefined
}

const reasonOf = (u: unknown): string | undefined => {
  if (typeof u === "object" && u !== null && "reason" in u) {
    return String(u.reason)
  }
  return undefined
}

const catchHttpFail = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchAll((e) => {
      const tag = tagOf(e)
      if (tag !== undefined && failTags.has(tag)) {
        return Effect.succeed(json400(tag, reasonOf(e)))
      }
      return Effect.succeed(json400("bad_request"))
    })
  )

const ownedFromRequest = Effect.gen(function* () {
  const body = yield* parseFileRequest
  const decoded = decodeRequestFile(body.file)
  if (Either.isLeft(decoded)) {
    return yield* Effect.fail(decoded.left)
  }
  const path = yield* writeUpload(body.name, decoded.right)
  return { path, forceText: body.options?.forceText ?? false }
})

const health = HttpServerResponse.unsafeJson({ ok: true, version: serviceVersion })

const openapi = HttpServerResponse.unsafeJson(openApiDocument)

const probeContext = new RunContext({
  operation: "inspect",
  forceText: false,
  json: true,
  requireCapability: [],
  kernelApiVersion
})

const capabilities = Effect.gen(function* () {
  const qpdf = yield* toolPresent("qpdf", "--version")
  const exiftool = yield* toolPresent("exiftool", "-ver")
  const c2patool = yield* toolPresent("c2patool", "--version")
  const detect = yield* anthropicDetectUrl
  const packs = yield* Effect.forEach(builtinRegistry().list(), (pack) =>
    Effect.map(
      pack.probe(probeContext),
      (availability) =>
        new PackCapabilityView({
          id: pack.manifest.id,
          implementationVersion: pack.manifest.implementationVersion,
          availability,
          license: pack.manifest.license,
          privacy: pack.manifest.privacy,
          network: pack.manifest.network,
          artifactKinds: [...pack.manifest.artifactKinds],
          operations: [...pack.manifest.operations]
        })
    )
  )
  return HttpServerResponse.unsafeJson(
    Schema.encodeUnknownSync(CapabilitiesResponse)(
      new CapabilitiesResponse({
        version: serviceVersion,
        kernelApiVersion,
        tools: new ToolPresence({ qpdf, exiftool, c2patool }),
        scorers: new ScorerPresence({ officialDetect: Option.isSome(detect) }),
        packs
      })
    )
  )
})

const inspect = catchHttpFail(
  Effect.gen(function* () {
    const owned = yield* ownedFromRequest
    const report = yield* Inspector.inspect(owned.path, { forceText: owned.forceText, json: true })
    return encodeInspect(report)
  })
)

const clean = catchHttpFail(
  Effect.gen(function* () {
    const owned = yield* ownedFromRequest
    const result = yield* Cleaner.clean(owned.path, {
      forceText: owned.forceText,
      json: true,
      inPlace: true
    })
    return encodeClean(result.report, result.bytes)
  })
)

const authorize = <A, E, R>(httpApp: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const key = yield* serverApiKey
    if (Option.isNone(key) || Redacted.value(key.value).length === 0) {
      return yield* httpApp
    }
    const request = yield* HttpServerRequest.HttpServerRequest
    const header = request.headers["authorization"]
    const expected = `Bearer ${Redacted.value(key.value)}`
    if (header !== expected) {
      return json401
    }
    return yield* httpApp
  })

const onError = (): HttpServerResponse.HttpServerResponse => json400("bad_request")

/** Routes for inspect/clean. No /humanize. */
export const router = HttpRouter.empty.pipe(
  HttpRouter.get("/health", health),
  HttpRouter.get("/capabilities", capabilities),
  HttpRouter.get("/openapi.json", openapi),
  HttpRouter.post("/inspect", inspect),
  HttpRouter.post("/clean", clean),
  HttpRouter.use(authorize),
  HttpRouter.catchAll(onError)
)

const services = Layer.mergeAll(Inspector.Default, Cleaner.Default, PdfTools.Default)

/** HttpServer Layer wrapping Wave 1 Inspector and Cleaner. */
export const HttpApp = HttpServer.serve(router).pipe(Layer.provide(services))
