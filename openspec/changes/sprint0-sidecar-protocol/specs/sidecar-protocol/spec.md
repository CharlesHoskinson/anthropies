## Purpose

Versioned loopback sidecar HTTP schemas for optional heavy engines.

## ADDED Requirements

### Requirement: protocol version pin

WHEN a sidecar message is encoded, the kernel SHALL include `protocolVersion` equal to `1.0.0`.

#### Scenario: v2 body fails v1 decode

- **WHEN** a body with `protocolVersion` `2.0.0` is decoded as a v1 inspect response
- **THEN** decode SHALL throw

### Requirement: loopback only

IF a sidecar base URL is not `127.0.0.1` or `localhost`, THEN the client SHALL fail with code `unavailable` and reason `privacy-denied`.

#### Scenario: example.com is refused

- **WHEN** baseUrl is `http://example.com`
- **THEN** the client SHALL not send the request
- **AND** the failure code SHALL be `unavailable`

### Requirement: error codes stay unmixed

WHEN a sidecar error is encoded, the kernel SHALL use `ok: false` and code `timeout|malformed-output|incompatible|unavailable|resource-exceeded`.

#### Scenario: no watermark score on errors

- **WHEN** a golden error body is decoded
- **THEN** the JSON SHALL omit `watermarkScore` and `score`
