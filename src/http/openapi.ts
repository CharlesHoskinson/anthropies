import { kernelApiVersion } from "../core/domain.js"
import { serviceVersion } from "./schema.js"

/** Loopback default for `anthropies serve --host`. */
export const defaultServeHost = "127.0.0.1"

/** Default for `anthropies serve --port`. */
export const defaultServePort = 8765

const jsonContent = (schema: Record<string, unknown>) => ({
  content: {
    "application/json": { schema }
  }
})

const errorBody = {
  type: "object",
  required: ["ok", "error"],
  properties: {
    ok: { type: "boolean", enum: [false] },
    error: { type: "string" },
    reason: { type: "string" }
  }
}

const fileRequest = {
  type: "object",
  required: ["file", "name"],
  properties: {
    file: {
      type: "string",
      format: "byte",
      description: "Base64-encoded owned file. Decoded size cap 256 MiB."
    },
    name: {
      type: "string",
      description: "Upload filename. Only the basename is written to a scoped temp dir."
    },
    options: {
      type: "object",
      properties: {
        forceText: { type: "boolean" }
      }
    }
  }
}

const reportSchema = {
  type: "object",
  description:
    "Wave 1 Report. honesty is the locked stanza. No score field. Official stays unavailable unless ANTHROPIC_DETECT_URL is set.",
  additionalProperties: true,
  properties: {
    kind: { type: "string" },
    findings: { type: "array", items: { type: "object", additionalProperties: true } },
    honesty: { type: "array", items: { type: "string" } }
  }
}

const inspectResponse = {
  type: "object",
  required: ["ok", "kind", "report"],
  properties: {
    ok: { type: "boolean" },
    kind: { type: "string" },
    report: reportSchema
  }
}

const cleanResponse = {
  type: "object",
  required: ["ok", "kind", "report", "cleaned"],
  properties: {
    ok: { type: "boolean" },
    kind: { type: "string" },
    report: reportSchema,
    cleaned: {
      type: "string",
      format: "byte",
      description: "Base64-encoded cleaned bytes. Layer A only. No humanize."
    }
  }
}

const bearerNote =
  "Required only when ANTHROPIES_SERVER_API_KEY is set. Missing or wrong key returns 401."

const optionalBearer = [{}, { bearerAuth: [] }]

/** OpenAPI 3.0.3 for the local inspect/clean service. No /humanize. */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "anthropies",
    version: serviceVersion,
    description:
      "Local HTTP inspect and clean for files the user already owns. Does not humanize. Does not claim official-detector failure. Honesty remains on report.honesty."
  },
  servers: [
    {
      url: `http://${defaultServeHost}:${String(defaultServePort)}`,
      description: "Loopback default. Override with anthropies serve --host --port."
    }
  ],
  paths: {
    "/health": {
      get: {
        operationId: "health",
        summary: "Liveness",
        security: optionalBearer,
        responses: {
          "200": {
            description: "Service is up",
            ...jsonContent({
              type: "object",
              required: ["ok", "version"],
              properties: {
                ok: { type: "boolean", enum: [true] },
                version: { type: "string", enum: [serviceVersion] }
              }
            })
          },
          "401": { description: "Missing or wrong bearer", ...jsonContent(errorBody) }
        }
      }
    },
    "/capabilities": {
      get: {
        operationId: "capabilities",
        summary: "Tool, scorer, and pack inventory",
        security: optionalBearer,
        responses: {
          "200": {
            description:
              "Version, kernelApiVersion, tool probes, officialDetect presence bit, and probed packs",
            ...jsonContent({
              type: "object",
              required: ["version", "kernelApiVersion", "tools", "scorers", "packs"],
              properties: {
                version: { type: "string", enum: [serviceVersion] },
                kernelApiVersion: { type: "string", enum: [kernelApiVersion] },
                tools: {
                  type: "object",
                  required: ["qpdf", "exiftool", "c2patool"],
                  properties: {
                    qpdf: { type: "boolean" },
                    exiftool: { type: "boolean" },
                    c2patool: { type: "boolean" }
                  }
                },
                scorers: {
                  type: "object",
                  required: ["officialDetect"],
                  properties: {
                    officialDetect: {
                      type: "boolean",
                      description: "True when ANTHROPIC_DETECT_URL is set. Not a score."
                    }
                  }
                },
                packs: {
                  type: "array",
                  items: {
                    type: "object",
                    required: [
                      "id",
                      "implementationVersion",
                      "availability",
                      "license",
                      "privacy",
                      "network",
                      "artifactKinds",
                      "operations"
                    ],
                    properties: {
                      id: { type: "string" },
                      implementationVersion: { type: "string" },
                      availability: {
                        type: "object",
                        required: ["status", "reason"],
                        properties: {
                          status: { type: "string" },
                          reason: { type: "string" },
                          detail: { type: "string" }
                        }
                      },
                      license: { type: "string" },
                      privacy: { type: "string" },
                      network: { type: "string" },
                      artifactKinds: { type: "array", items: { type: "string" } },
                      operations: { type: "array", items: { type: "string" } }
                    }
                  }
                }
              }
            })
          },
          "401": { description: "Missing or wrong bearer", ...jsonContent(errorBody) }
        }
      }
    },
    "/openapi.json": {
      get: {
        operationId: "openapi",
        summary: "This OpenAPI 3.0.3 document",
        security: optionalBearer,
        responses: {
          "200": {
            description: "OpenAPI 3.0.3 document",
            ...jsonContent({ type: "object", additionalProperties: true })
          },
          "401": { description: "Missing or wrong bearer", ...jsonContent(errorBody) }
        }
      }
    },
    "/inspect": {
      post: {
        operationId: "inspect",
        summary: "Report marks by channel. Never a single watermark score.",
        security: optionalBearer,
        requestBody: {
          required: true,
          content: { "application/json": { schema: fileRequest } }
        },
        responses: {
          "200": { description: "Inspect report", ...jsonContent(inspectResponse) },
          "400": { description: "Decode, cap, or fail-closed input", ...jsonContent(errorBody) },
          "401": { description: "Missing or wrong bearer", ...jsonContent(errorBody) }
        }
      }
    },
    "/clean": {
      post: {
        operationId: "clean",
        summary:
          "Strip deterministic Layer A and hard-bound C2PA/metadata. Does not remove the keyed text mark. Does not humanize.",
        security: optionalBearer,
        requestBody: {
          required: true,
          content: { "application/json": { schema: fileRequest } }
        },
        responses: {
          "200": { description: "Clean report plus cleaned base64", ...jsonContent(cleanResponse) },
          "400": { description: "Decode, cap, or fail-closed input", ...jsonContent(errorBody) },
          "401": { description: "Missing or wrong bearer", ...jsonContent(errorBody) }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: bearerNote
      }
    }
  }
}
