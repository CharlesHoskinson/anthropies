## 1. Compose profiles

- [ ] 1.1 Add failing tests that default Compose config validates and starts local-only TypeScript core
- [ ] 1.2 Add failing tests that licensed or optional heavy packs require an explicit Compose profile
- [ ] 1.3 Add Compose profiles or profile fragments so optional packs enable independently

## 2. Health and capability discovery

- [ ] 2.1 Add failing tests that GET `/health` stays `{ "ok": true, "version": "0.3.0" }`
- [ ] 2.2 Add failing tests that GET `/capabilities` lists installed packs and omits mixed score fields
- [ ] 2.3 Wire Compose healthchecks to core `/health` and document sidecar health discovery for enabled packs

## 3. Independently installable pack artifacts

- [ ] 3.1 Add failing tests that core install succeeds with zero optional pack artifacts present
- [ ] 3.2 Package each optional pack as its own installable artifact with required pins when models or sidecars ship
- [ ] 3.3 Assert enabling one optional pack does not require installing unrelated optional packs

## 4. Compatibility matrix

- [ ] 4.1 Add failing tests for a published kernel/pack compatibility matrix that includes current sidecar protocol `1.0.0`
- [ ] 4.2 Include every previous Anthropies sidecar protocol version in the matrix with pass or explicit incompatible outcomes
- [ ] 4.3 Assert unsupported kernel range or protocol pairs report `incompatible` and do not certify results

## 5. Anti-monolith and no automatic download

- [ ] 5.1 Add failing tests that release image inventory omits bulk optional all-model weight sets
- [ ] 5.2 Add failing tests that default install, image build, and service startup do not download models
- [ ] 5.3 Document the explicit operator download or enable step for optional models

## 6. TypeScript-only core and docs

- [ ] 6.1 Add failing tests that publishable core remains TypeScript/Node-only and omits Python sidecar trees
- [ ] 6.2 Publish CLI, HTTP, skill, operator, security, and troubleshooting docs for profiles, discovery, installs, and the matrix
- [ ] 6.3 Keep HTTP `serviceVersion` at `0.3.0` unless a separate contract change bumps it
