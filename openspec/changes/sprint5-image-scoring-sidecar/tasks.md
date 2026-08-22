## 1. Protocol negotiation and loopback

- [ ] 1.1 Add failing tests for sidecar health and capabilities negotiation at protocol `1.0.0`
- [ ] 1.2 Add failing tests that default the scorer base URL to loopback and refuse non-loopback hosts
- [ ] 1.3 Wire the image-scoring pack probe to GET `/health` and GET `/capabilities` before inspect

## 2. Pinned Python scorer (optional distribution)

- [ ] 2.1 Add failing tests that require container or lock digest, upstream commit, model digest, and configuration digest
- [ ] 2.2 Add the pinned Python scorer service behind sidecar protocol `1.0.0` as an optional artifact
- [ ] 2.3 Assert the publishable core package inventory omits noncommercial scorer code and weights

## 3. Statistical observations only

- [ ] 3.1 Add failing tests that successful inspect findings use channel `statistical` and markClass `pixel`
- [ ] 3.2 Implement inspect mapping that emits observations without Removal, `watermarkScore`, or finding top-level `score`
- [ ] 3.3 Assert absent or present pixel observations do not become clean certificates or removal verdicts

## 4. Absence, malformed, and incompatible fail paths

- [ ] 4.1 Add failing tests that an absent optional sidecar reports `unavailable` without breaking core inspect
- [ ] 4.2 Map malformed sidecar bodies to `malformed-output` with no certified finding
- [ ] 4.3 Map incompatible protocol or capability sets to `incompatible` with no certified finding

## 5. Manifest, capabilities, and HTTP version lock

- [ ] 5.1 Add failing tests that the pack manifest includes `score` or `inspect` and excludes `remove`
- [ ] 5.2 Advertise the pack id on GET `/capabilities` without mixed score fields
- [ ] 5.3 Keep GET `/health` body `{ "ok": true, "version": "0.3.0" }`
- [ ] 5.4 Enforce client timeout mapping to code `timeout` and keep scorer diagnostics off stdout JSON
