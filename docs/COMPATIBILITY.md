# Compatibility matrix

Kernel API, pack ranges, and sidecar protocol compatibility for Anthropies distribution.

The matrix lists sidecar protocol version `1.0.0` as current. Unsupported kernel ranges and unsupported protocol pairs report `incompatible` and do not certify results.

```json compat-matrix
{
  "currentSidecarProtocol": "1.0.0",
  "currentSidecarProtocolOutcome": "supported",
  "previousSidecarProtocols": [],
  "kernelApiVersion": "1.0.0",
  "packs": [
    { "id": "anthropies.layer-a", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.c2pa", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.pdf", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.html", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.md", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.svg-strip", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.docx", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.odt", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.raster-strip", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.pdf-tools", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.xlsx", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.pptx", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.epub", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.markllm", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.markdiffusion", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.ctrlregen", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.audit-directory", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.rewrite-stylometry", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.gemini-synthid", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.official", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.image-scoring", "kernelApiMin": "1.0.0", "kernelApiMax": "1.0.0", "outcome": "supported" },
    { "id": "anthropies.example-unsupported", "kernelApiMin": "2.0.0", "kernelApiMax": "2.0.0", "outcome": "incompatible" }
  ]
}
```

## Sidecar protocol

| Role | Version | Outcome on this release |
| --- | --- | --- |
| current | `1.0.0` | supported |

### Previous sidecar protocols

The previous-protocol set is empty. No Anthropies sidecar protocol version was published before `1.0.0`.

When a previous sidecar protocol version is published later, add a row for that version with outcome `supported` or `incompatible`. Unsupported previous protocol responses fail closed. The client returns `incompatible` and does not certify results from that sidecar.

Current protocol `1.0.0` still negotiates. Health and capability exchange proceed under the sidecar protocol rules when both sides speak `1.0.0`.

## Kernel and packs

Running `kernelApiVersion` is `1.0.0`. A pack whose inclusive `[kernelApiMin, kernelApiMax]` range includes that version registers as supported. A pack whose range excludes it returns `incompatible` and is not listed. The example row `anthropies.example-unsupported` records that incompatible cell.

## Optional pack pins

When an optional pack artifact ships model weights or a sidecar runtime, the artifact must carry pins:

- upstream commit
- model or codebook digest (`modelOrCodebookDigest`)
- configuration digest
- container or lock digest (`containerOrLockDigest`)

Example: `anthropies.image-scoring` pins reverse-SynthID with those four digests. Core install does not download those weights.

## Compose profiles and license disposition

The default Compose profile is local-only TypeScript core. Optional pack sidecars stay off until an operator enables one optional pack profile independently:

```bash
docker compose --profile markllm up
docker compose --profile markdiffusion up
docker compose --profile ctrlregen up
docker compose --profile image-scoring up
```

License disposition and redistribution limits for licensed or restricted profiles:

| Compose profile | Pack id | License disposition | Redistribution in core image |
| --- | --- | --- | --- |
| `markllm` | `anthropies.markllm` | Apache-2.0 upstream wrap | omitted from default core image |
| `markdiffusion` | `anthropies.markdiffusion` | Apache-2.0 upstream wrap | omitted from default core image |
| `ctrlregen` | `anthropies.ctrlregen` | Apache-2.0 method code; operator-supplied weights | weights omitted from default core image |
| `image-scoring` | `anthropies.image-scoring` | `optional-noncommercial` | omitted; no redistribution in `anthropies:0.3.0` |

## Release image acceptance

The core release image must stay TypeScript/Node-only. It must not embed every optional pack model and sidecar as one monolithic artifact.

An all-model image fails acceptance. A candidate that copies every optional model tree and every optional sidecar runtime must not be published as the core release image.

## Operator enable steps

1. Keep the default profile for local-only TypeScript core (`docker compose up`).
2. To enable one optional pack profile independently, run `docker compose --profile <name> up` after an explicit checkout or download into the pack volume.
3. That explicit download or enable step is distinct from default install and default compose up.

See also the operator notes in [README.md](../README.md).

## Troubleshooting

- Treat unavailable optional packs as fail-soft for core. Core inspect and clean for unrelated packs still succeed when an optional pack probe is absent.
- Treat incompatible protocol versions as fail-closed for certification. A sidecar that speaks an unsupported protocol yields `incompatible` and does not certify.
- Unsupported kernel ranges return `incompatible` at register or probe and do not certify.
- Missing optional model weights do not trigger automatic download. Supply weights with an explicit operator step, then enable the matching Compose profile.
