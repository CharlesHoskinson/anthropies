import { describe, expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import {
  auditWebsitePack,
  runWebsiteAudit,
  type WebsiteAuditBounds,
  type WebsiteFetch
} from "../src/packs/audit-website.js"

const defaultBounds = (overrides?: Partial<WebsiteAuditBounds>): WebsiteAuditBounds => ({
  maxRedirectHops: 3,
  maxDownloadBytes: 1024,
  maxRequests: 8,
  allowedContentTypes: [
    "text/html",
    "text/plain",
    "application/xml",
    "text/xml",
    "application/xhtml+xml"
  ],
  ...overrides
})

const htmlResponse = (body: string, contentType = "text/html; charset=utf-8"): Response =>
  new Response(body, {
    status: 200,
    headers: { "content-type": contentType }
  })

const redirectResponse = (location: string): Response =>
  new Response(null, {
    status: 302,
    headers: { Location: location }
  })

const trackingFetch = (
  handler: (url: string, init: RequestInit | undefined, calls: string[]) => Promise<Response>
): { fetch: WebsiteFetch; calls: string[] } => {
  const calls: string[] = []
  return {
    calls,
    fetch: async (input, init) => {
      const url = String(input)
      calls.push(url)
      return handler(url, init, calls)
    }
  }
}

describe("packs_audit_website", () => {
  it("default off refuses remote", async () => {
    const { fetch, calls } = trackingFetch(async () => htmlResponse("<html></html>"))
    const result = await runWebsiteAudit({
      optIn: false,
      url: "https://example.com/",
      bounds: defaultBounds(),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.code).toBe("remote-disabled")
    expect(result.detail.toLowerCase()).toMatch(/remote|disabled|opt-?in/)
    expect(calls).toEqual([])
  })

  it("website pack id is stable", () => {
    expect(auditWebsitePack.manifest.id).toBe("anthropies.audit-website")
    expect(auditWebsitePack.manifest.network).toBe("remote-opt-in")
    expect(auditWebsitePack.manifest.operations).toContain("audit")
    expect(auditWebsitePack.manifest.channel).toBe("deterministic")
    expect(auditWebsitePack.manifest.distribution).toBe("optional")
    expect(auditWebsitePack.manifest.license).toBe("apache-2.0")
    const src = readFileSync(new URL("../src/packs/audit-website.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/\bscore\b/)
    expect(src).not.toMatch(/watermarkScore/)
  })

  it("loopback address is refused", async () => {
    const { fetch, calls } = trackingFetch(async () => htmlResponse("nope"))
    for (const url of ["http://127.0.0.1/", "http://[::1]/", "http://localhost/"]) {
      const result = await runWebsiteAudit({
        optIn: true,
        url,
        bounds: defaultBounds(),
        hostPolicy: { host: new URL(url).hostname, pathPrefix: "/" },
        fetch
      })
      expect(result.ok).toBe(false)
      if (result.ok) {
        return
      }
      expect(result.code).toBe("ssrf-blocked")
    }
    expect(calls).toEqual([])
  })

  it("link-local and metadata are refused", async () => {
    const { fetch, calls } = trackingFetch(async () => htmlResponse("nope"))
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "http://169.254.1.1/",
      "http://metadata.google.internal/"
    ]) {
      const result = await runWebsiteAudit({
        optIn: true,
        url,
        bounds: defaultBounds(),
        hostPolicy: { host: new URL(url).hostname, pathPrefix: "/" },
        fetch
      })
      expect(result.ok).toBe(false)
      if (result.ok) {
        return
      }
      expect(result.code).toBe("ssrf-blocked")
    }
    expect(calls).toEqual([])
  })

  it("private network is refused", async () => {
    const { fetch, calls } = trackingFetch(async () => htmlResponse("nope"))
    for (const url of ["http://10.0.0.1/", "http://192.168.1.1/", "http://172.16.5.9/"]) {
      const result = await runWebsiteAudit({
        optIn: true,
        url,
        bounds: defaultBounds(),
        hostPolicy: { host: new URL(url).hostname, pathPrefix: "/" },
        fetch
      })
      expect(result.ok).toBe(false)
      if (result.ok) {
        return
      }
      expect(result.code).toBe("ssrf-blocked")
    }
    expect(calls).toEqual([])
  })

  it("file scheme is refused", async () => {
    const { fetch, calls } = trackingFetch(async () => htmlResponse("nope"))
    const result = await runWebsiteAudit({
      optIn: true,
      url: "file:///etc/passwd",
      bounds: defaultBounds(),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.code).toBe("scheme-blocked")
    expect(calls).toEqual([])
  })

  it("redirect hop cap stops follow", async () => {
    const { fetch, calls } = trackingFetch(async (url) => {
      if (url === "https://example.com/a") {
        return redirectResponse("https://example.com/b")
      }
      if (url === "https://example.com/b") {
        return redirectResponse("https://example.com/c")
      }
      return htmlResponse("done")
    })
    const result = await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/a",
      bounds: defaultBounds({ maxRedirectHops: 1 }),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.code).toBe("redirect-policy")
    expect(calls[0]).toBe("https://example.com/a")
    expect(calls).not.toContain("https://example.com/c")
    expect(calls.length).toBeLessThanOrEqual(2)
  })

  it("redirect to private target is refused", async () => {
    const { fetch, calls } = trackingFetch(async (url) => {
      if (url === "https://example.com/start") {
        return redirectResponse("http://10.0.0.1/secret")
      }
      return htmlResponse("private")
    })
    const result = await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/start",
      bounds: defaultBounds({ maxRedirectHops: 3 }),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.code).toBe("ssrf-blocked")
    expect(calls).toEqual(["https://example.com/start"])
    expect(calls).not.toContain("http://10.0.0.1/secret")
  })

  it("disallowed content type is refused", async () => {
    const { fetch } = trackingFetch(async () =>
      new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
        status: 200,
        headers: { "content-type": "image/jpeg" }
      })
    )
    const result = await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/photo.jpg",
      bounds: defaultBounds(),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.code).toBe("content-type")
  })

  it("download cap truncates or refuses oversize body", async () => {
    const big = "x".repeat(2048)
    const { fetch } = trackingFetch(async () => htmlResponse(big))
    const result = await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/big",
      bounds: defaultBounds({ maxDownloadBytes: 64 }),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    if (result.ok) {
      expect(result.truncated).toBe(true)
      expect(result.body.byteLength).toBeLessThanOrEqual(64)
    } else {
      expect(result.code).toBe("download-cap")
    }
  })

  it("request budget stops further fetches", async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/one</loc></url>
  <url><loc>https://example.com/two</loc></url>
  <url><loc>https://example.com/three</loc></url>
</urlset>`
    const { fetch, calls } = trackingFetch(async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return new Response(sitemap, {
          status: 200,
          headers: { "content-type": "application/xml" }
        })
      }
      return htmlResponse(`<html>${url}</html>`)
    })
    const result = await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/sitemap.xml",
      mode: "sitemap",
      bounds: defaultBounds({ maxRequests: 2 }),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(calls.length).toBeLessThanOrEqual(2)
    expect(calls).not.toContain("https://example.com/three")
    if (result.ok) {
      expect(result.requestsUsed).toBeLessThanOrEqual(2)
    } else {
      expect(result.code).toBe("request-budget")
      expect(result.requestsUsed).toBeLessThanOrEqual(2)
    }
  })

  it("off-host sitemap URL is skipped", async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/ok</loc></url>
  <url><loc>https://evil.example/steal</loc></url>
</urlset>`
    const { fetch, calls } = trackingFetch(async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return new Response(sitemap, {
          status: 200,
          headers: { "content-type": "application/xml" }
        })
      }
      return htmlResponse(`<html>${url}</html>`)
    })
    const result = await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/sitemap.xml",
      mode: "sitemap",
      bounds: defaultBounds({ maxRequests: 8 }),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(calls).toContain("https://example.com/sitemap.xml")
    expect(calls).toContain("https://example.com/ok")
    expect(calls).not.toContain("https://evil.example/steal")
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.skippedUrls.some((entry) => entry.url === "https://evil.example/steal")).toBe(
      true
    )
  })

  it("no unrestricted crawl", async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/page</loc></url>
</urlset>`
    const page = `<html><body><a href="https://example.com/other">other</a></body></html>`
    const { fetch, calls } = trackingFetch(async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return new Response(sitemap, {
          status: 200,
          headers: { "content-type": "application/xml" }
        })
      }
      return htmlResponse(page)
    })
    await runWebsiteAudit({
      optIn: true,
      url: "https://example.com/sitemap.xml",
      mode: "sitemap",
      bounds: defaultBounds({ maxRequests: 8 }),
      hostPolicy: { host: "example.com", pathPrefix: "/" },
      fetch
    })
    expect(calls).toEqual(["https://example.com/sitemap.xml", "https://example.com/page"])
    expect(calls).not.toContain("https://example.com/other")
    const src = readFileSync(new URL("../src/packs/audit-website.ts", import.meta.url), "utf8")
    expect(src.toLowerCase()).not.toMatch(/puppeteer|playwright|browser\.launch/)
  })

  it("capabilities text avoids hosted-cloud claim", () => {
    const src = readFileSync(new URL("../src/packs/audit-website.ts", import.meta.url), "utf8")
    expect(src.toLowerCase()).not.toMatch(/hosted cloud|multi-tenant cloud|saas cloud/)
    expect(auditWebsitePack.manifest.privacy).toBe("local-only")
    expect(auditWebsitePack.manifest.displayName.toLowerCase()).not.toMatch(/hosted cloud/)
    const provenance = auditWebsitePack.manifest.provenance ?? ""
    expect(provenance.toLowerCase()).not.toMatch(/hosted cloud|multi-tenant/)
  })
})
