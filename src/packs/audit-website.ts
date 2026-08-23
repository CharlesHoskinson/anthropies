import { Effect, Schema } from "effect"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import { Availability, type Artifact } from "../core/domain.js"

const PACK_ID = "anthropies.audit-website"
const PACK_VERSION = "0.4.0"

export type WebsiteFetch = (input: string, init?: RequestInit) => Promise<Response>

export type WebsiteAuditBounds = {
  readonly maxRedirectHops: number
  readonly maxDownloadBytes: number
  readonly maxRequests: number
  readonly allowedContentTypes: ReadonlyArray<string>
}

export type WebsiteHostPolicy = {
  readonly host: string
  readonly pathPrefix: string
}

export type WebsiteAuditOptions = {
  readonly optIn: boolean
  readonly url: string
  readonly bounds: WebsiteAuditBounds
  readonly hostPolicy: WebsiteHostPolicy
  readonly fetch: WebsiteFetch
  readonly mode?: "single" | "sitemap"
}

export type WebsiteAuditRefusalCode =
  | "remote-disabled"
  | "ssrf-blocked"
  | "scheme-blocked"
  | "redirect-policy"
  | "content-type"
  | "download-cap"
  | "request-budget"

export type WebsiteSkippedUrl = {
  readonly url: string
  readonly reason: "off-host" | "path-policy" | "ssrf-blocked" | "scheme-blocked" | "request-budget"
}

export type WebsiteAuditResult =
  | {
      readonly ok: true
      readonly url: string
      readonly contentType: string
      readonly body: Uint8Array
      readonly truncated: boolean
      readonly requestsUsed: number
      readonly fetchedUrls: ReadonlyArray<string>
      readonly skippedUrls: ReadonlyArray<WebsiteSkippedUrl>
    }
  | {
      readonly ok: false
      readonly code: WebsiteAuditRefusalCode
      readonly detail: string
      readonly requestsUsed: number
      readonly fetchedUrls: ReadonlyArray<string>
      readonly skippedUrls: ReadonlyArray<WebsiteSkippedUrl>
    }

const METADATA_HOSTS = new Set(["metadata.google.internal", "metadata"])

const fail = (
  code: WebsiteAuditRefusalCode,
  detail: string,
  requestsUsed: number,
  fetchedUrls: ReadonlyArray<string>,
  skippedUrls: ReadonlyArray<WebsiteSkippedUrl> = []
): WebsiteAuditResult => ({
  ok: false,
  code,
  detail,
  requestsUsed,
  fetchedUrls,
  skippedUrls
})

const parseIpv4 = (hostname: string): ReadonlyArray<number> | undefined => {
  const parts = hostname.split(".")
  if (parts.length !== 4) {
    return undefined
  }
  const nums: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return undefined
    }
    const n = Number(part)
    if (n < 0 || n > 255) {
      return undefined
    }
    nums.push(n)
  }
  return nums
}

const normalizeHostname = (hostname: string): string =>
  hostname.replace(/^\[|\]$/g, "").toLowerCase()

/** True for loopback, link-local, private, unique-local, and cloud metadata hosts. */
export const isBlockedSsrfHost = (hostname: string): boolean => {
  const host = normalizeHostname(hostname)
  if (host.length === 0) {
    return true
  }
  if (host === "localhost" || METADATA_HOSTS.has(host)) {
    return true
  }

  const ipv4 = parseIpv4(host)
  if (ipv4 !== undefined) {
    const a = ipv4[0]!
    const b = ipv4[1]!
    if (a === 127 || a === 0 || a === 10) {
      return true
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true
    }
    if (a === 192 && b === 168) {
      return true
    }
    if (a === 169 && b === 254) {
      return true
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return true
    }
    return false
  }

  if (!host.includes(":")) {
    return false
  }
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") {
    return true
  }
  // fe80::/10 link-local and fc00::/7 unique local
  if (
    host.startsWith("fe8") ||
    host.startsWith("fe9") ||
    host.startsWith("fea") ||
    host.startsWith("feb") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true
  }
  if (host.includes("%")) {
    return true
  }
  return false
}

export type UrlPolicyCheck =
  | { readonly ok: true; readonly url: URL }
  | { readonly ok: false; readonly code: "scheme-blocked" | "ssrf-blocked"; readonly detail: string }

/** Refuse non-http(s) and SSRF target classes before any network call. */
export const checkUrlPolicy = (urlString: string): UrlPolicyCheck => {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return { ok: false, code: "scheme-blocked", detail: "invalid URL" }
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, code: "scheme-blocked", detail: `scheme ${parsed.protocol} is refused` }
  }
  if (isBlockedSsrfHost(parsed.hostname)) {
    return {
      ok: false,
      code: "ssrf-blocked",
      detail: `host ${parsed.hostname} is refused by SSRF policy`
    }
  }
  return { ok: true, url: parsed }
}

const mediaTypeOf = (contentType: string | null): string => {
  if (contentType === null || contentType.length === 0) {
    return ""
  }
  return contentType.split(";", 1)[0]!.trim().toLowerCase()
}

const contentTypeAllowed = (
  contentType: string | null,
  allowlist: ReadonlyArray<string>
): boolean => {
  const media = mediaTypeOf(contentType)
  if (media.length === 0) {
    return false
  }
  return allowlist.some((allowed) => allowed.toLowerCase() === media)
}

const readBodyCapped = async (
  response: Response,
  maxBytes: number
): Promise<{ readonly body: Uint8Array; readonly truncated: boolean; readonly oversize: boolean }> => {
  const buffer = new Uint8Array(await response.arrayBuffer())
  if (buffer.byteLength > maxBytes) {
    return {
      body: buffer.slice(0, maxBytes),
      truncated: true,
      oversize: true
    }
  }
  return { body: buffer, truncated: false, oversize: false }
}

const extractSitemapLocs = (xml: string): ReadonlyArray<string> => {
  const locs: string[] = []
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(xml)) !== null) {
    locs.push(match[1]!)
  }
  return locs
}

const matchesHostPolicy = (
  candidate: URL,
  hostPolicy: WebsiteHostPolicy
): WebsiteSkippedUrl["reason"] | undefined => {
  if (normalizeHostname(candidate.hostname) !== normalizeHostname(hostPolicy.host)) {
    return "off-host"
  }
  const prefix = hostPolicy.pathPrefix.length === 0 ? "/" : hostPolicy.pathPrefix
  if (!candidate.pathname.startsWith(prefix)) {
    return "path-policy"
  }
  return undefined
}

type FetchOutcome =
  | {
      readonly ok: true
      readonly finalUrl: string
      readonly contentType: string
      readonly body: Uint8Array
      readonly truncated: boolean
      readonly requestsUsed: number
      readonly fetchedUrls: ReadonlyArray<string>
    }
  | {
      readonly ok: false
      readonly code: WebsiteAuditRefusalCode
      readonly detail: string
      readonly requestsUsed: number
      readonly fetchedUrls: ReadonlyArray<string>
    }

const fetchOne = async (
  startUrl: string,
  options: WebsiteAuditOptions,
  requestsUsedStart: number,
  fetchedUrlsStart: ReadonlyArray<string>
): Promise<FetchOutcome> => {
  let current = startUrl
  let hops = 0
  let requestsUsed = requestsUsedStart
  const fetchedUrls = [...fetchedUrlsStart]

  while (true) {
    if (requestsUsed >= options.bounds.maxRequests) {
      return {
        ok: false,
        code: "request-budget",
        detail: "request budget exhausted",
        requestsUsed,
        fetchedUrls
      }
    }

    const policy = checkUrlPolicy(current)
    if (!policy.ok) {
      return {
        ok: false,
        code: policy.code,
        detail: policy.detail,
        requestsUsed,
        fetchedUrls
      }
    }

    requestsUsed += 1
    fetchedUrls.push(current)
    const response = await options.fetch(current, { redirect: "manual", method: "GET" })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (location === null || location.length === 0) {
        return {
          ok: false,
          code: "redirect-policy",
          detail: "redirect missing Location",
          requestsUsed,
          fetchedUrls
        }
      }
      if (hops >= options.bounds.maxRedirectHops) {
        return {
          ok: false,
          code: "redirect-policy",
          detail: `redirect hop cap ${options.bounds.maxRedirectHops} exceeded`,
          requestsUsed,
          fetchedUrls
        }
      }
      let nextUrl: string
      try {
        nextUrl = new URL(location, current).toString()
      } catch {
        return {
          ok: false,
          code: "redirect-policy",
          detail: "redirect Location is not a valid URL",
          requestsUsed,
          fetchedUrls
        }
      }
      const nextPolicy = checkUrlPolicy(nextUrl)
      if (!nextPolicy.ok) {
        return {
          ok: false,
          code: nextPolicy.code,
          detail: nextPolicy.detail,
          requestsUsed,
          fetchedUrls
        }
      }
      hops += 1
      current = nextUrl
      continue
    }

    if (!contentTypeAllowed(response.headers.get("content-type"), options.bounds.allowedContentTypes)) {
      return {
        ok: false,
        code: "content-type",
        detail: `content type ${response.headers.get("content-type") ?? "missing"} is not allowlisted`,
        requestsUsed,
        fetchedUrls
      }
    }

    const read = await readBodyCapped(response, options.bounds.maxDownloadBytes)
    if (read.oversize) {
      // Truncate under the download cap; do not inspect unbounded bytes.
      return {
        ok: true,
        finalUrl: current,
        contentType: mediaTypeOf(response.headers.get("content-type")),
        body: read.body,
        truncated: true,
        requestsUsed,
        fetchedUrls
      }
    }

    return {
      ok: true,
      finalUrl: current,
      contentType: mediaTypeOf(response.headers.get("content-type")),
      body: read.body,
      truncated: false,
      requestsUsed,
      fetchedUrls
    }
  }
}

/** Opt-in website audit with fail-closed SSRF, redirect, content-type, and budget checks. */
export const runWebsiteAudit = async (
  options: WebsiteAuditOptions
): Promise<WebsiteAuditResult> => {
  if (!options.optIn) {
    return fail(
      "remote-disabled",
      "remote website audit is disabled until explicit opt-in",
      0,
      []
    )
  }

  const mode = options.mode ?? "single"
  const initial = checkUrlPolicy(options.url)
  if (!initial.ok) {
    return fail(initial.code, initial.detail, 0, [])
  }

  if (mode === "single") {
    const outcome = await fetchOne(options.url, options, 0, [])
    if (!outcome.ok) {
      return fail(outcome.code, outcome.detail, outcome.requestsUsed, outcome.fetchedUrls)
    }
    return {
      ok: true,
      url: outcome.finalUrl,
      contentType: outcome.contentType,
      body: outcome.body,
      truncated: outcome.truncated,
      requestsUsed: outcome.requestsUsed,
      fetchedUrls: outcome.fetchedUrls,
      skippedUrls: []
    }
  }

  // Sitemap mode: fetch the sitemap, then only listed URLs inside host/path policy.
  const sitemapFetch = await fetchOne(options.url, options, 0, [])
  if (!sitemapFetch.ok) {
    return fail(
      sitemapFetch.code,
      sitemapFetch.detail,
      sitemapFetch.requestsUsed,
      sitemapFetch.fetchedUrls
    )
  }

  const locs = extractSitemapLocs(new TextDecoder("utf-8").decode(sitemapFetch.body))
  const skippedUrls: WebsiteSkippedUrl[] = []
  let requestsUsed = sitemapFetch.requestsUsed
  const fetchedUrls = [...sitemapFetch.fetchedUrls]
  let lastBody = sitemapFetch.body
  let lastUrl = sitemapFetch.finalUrl
  let lastContentType = sitemapFetch.contentType
  let lastTruncated = sitemapFetch.truncated

  for (const loc of locs) {
    if (requestsUsed >= options.bounds.maxRequests) {
      skippedUrls.push({ url: loc, reason: "request-budget" })
      return {
        ok: true,
        url: lastUrl,
        contentType: lastContentType,
        body: lastBody,
        truncated: lastTruncated,
        requestsUsed,
        fetchedUrls,
        skippedUrls
      }
    }

    let candidate: URL
    try {
      candidate = new URL(loc)
    } catch {
      skippedUrls.push({ url: loc, reason: "scheme-blocked" })
      continue
    }

    const schemeOrSsrf = checkUrlPolicy(candidate.toString())
    if (!schemeOrSsrf.ok) {
      skippedUrls.push({
        url: loc,
        reason: schemeOrSsrf.code === "scheme-blocked" ? "scheme-blocked" : "ssrf-blocked"
      })
      continue
    }

    const hostReason = matchesHostPolicy(candidate, options.hostPolicy)
    if (hostReason !== undefined) {
      skippedUrls.push({ url: loc, reason: hostReason })
      continue
    }

    const page = await fetchOne(candidate.toString(), options, requestsUsed, fetchedUrls)
    if (!page.ok) {
      if (page.code === "request-budget") {
        skippedUrls.push({ url: loc, reason: "request-budget" })
        return {
          ok: true,
          url: lastUrl,
          contentType: lastContentType,
          body: lastBody,
          truncated: lastTruncated,
          requestsUsed: page.requestsUsed,
          fetchedUrls: page.fetchedUrls,
          skippedUrls
        }
      }
      return fail(page.code, page.detail, page.requestsUsed, page.fetchedUrls, skippedUrls)
    }

    requestsUsed = page.requestsUsed
    fetchedUrls.splice(0, fetchedUrls.length, ...page.fetchedUrls)
    lastBody = page.body
    lastUrl = page.finalUrl
    lastContentType = page.contentType
    lastTruncated = page.truncated
  }

  return {
    ok: true,
    url: lastUrl,
    contentType: lastContentType,
    body: lastBody,
    truncated: lastTruncated,
    requestsUsed,
    fetchedUrls,
    skippedUrls
  }
}

export const auditWebsitePack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "Website audit",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: [],
    markClasses: [],
    operations: ["audit"],
    channel: "deterministic",
    priority: 10,
    ordering: {},
    runtime: "native-ts",
    network: "remote-opt-in",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "optional",
    provenance:
      "Operator-run opt-in website audit with SSRF defense; local execution only, not a hosted service"
  }),

  probe: (_context: RunContext) =>
    Effect.succeed(
      new Availability({
        status: "available",
        reason: "ready",
        detail: "remote fetch requires explicit opt-in"
      })
    ),

  inspect: (_artifact: Artifact, _context: RunContext) => Effect.succeed([])
}
