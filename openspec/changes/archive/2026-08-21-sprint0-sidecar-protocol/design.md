## Context

Optional Python engines talk HTTP on loopback. T10 owns the client. This change owns schemas and goldens only.

## Goals / Non-Goals

**Goals:** v1 schemas, seven goldens, decode tests for both polarities.

**Non-Goals:** Live HTTP, Docker, MarkLLM.

## Decisions

Binary payload is inline base64 or a blob path under `/tmp/anthropies-sidecar/` with digest. Reject `..`.

## Risks / Trade-offs

Goldens can drift from the schema. Tests decode every golden.
