## Purpose

Sprint 2 freezes bounded directory audit, deterministic concurrency, JSON and channel-scoped SARIF, partial-failure reporting, and opt-in website audit with SSRF defense. Scope excludes browser rendering, unrestricted crawling, and hosted cloud operation.

## ADDED Requirements

### Requirement: directory audit uses the single-file planner

WHEN directory audit selects a file under a configured root, it SHALL build an Artifact and SHALL plan packs with the same capability planner used for single-file inspect of equivalent bytes.

#### Scenario: planner ids match single-file

- **WHEN** directory audit selects a text fixture and single-file inspect runs on the same bytes
- **THEN** the planned pack id set for that file SHALL equal the single-file planned pack id set

#### Scenario: directory pack id is stable

- **WHEN** the directory audit pack manifest is read after implementation
- **THEN** its id SHALL equal `anthropies.audit-directory`
- **AND** its operations SHALL include `audit`

### Requirement: directory scan is bounded

WHEN directory audit runs, it SHALL enforce configured maximum depth, maximum file count, and maximum total input bytes, and SHALL stop selecting further files once a bound is reached.

#### Scenario: file-count bound stops selection

- **WHEN** a root contains more selectable files than the configured maximum file count
- **THEN** the audit SHALL select at most that maximum
- **AND** SHALL record that the file-count bound was hit

#### Scenario: depth bound excludes deeper files

- **WHEN** maximum depth is `1` and a file sits two directories below the root
- **THEN** that deeper file SHALL NOT be selected

#### Scenario: size bound refuses oversized file

- **WHEN** a candidate file exceeds the configured per-file or total input size bound
- **THEN** that file SHALL NOT be inspected as a success path
- **AND** the audit SHALL record a bound refusal for it

### Requirement: directory paths cannot escape the root

WHEN directory audit resolves a candidate path, IF the resolved path is outside the configured root, THEN the audit SHALL refuse that path.

#### Scenario: parent traversal is refused

- **WHEN** a candidate path would resolve to a file outside the configured root through `..` segments
- **THEN** the audit SHALL refuse the path
- **AND** SHALL NOT read the outside file bytes

#### Scenario: symlink escape is refused

- **WHEN** a symlink under the root resolves to a target outside the root
- **THEN** the audit SHALL refuse that candidate
- **AND** SHALL NOT follow the escape

### Requirement: empty selection is an error

IF directory audit completes selection with zero files, THEN the audit SHALL fail closed with an empty-selection error.

#### Scenario: fully filtered root fails

- **WHEN** the root exists and every candidate is excluded by kind filters or bounds before inspect
- **THEN** the audit SHALL return an empty-selection error
- **AND** SHALL NOT emit a successful empty findings list as a clean certificate

#### Scenario: missing root fails

- **WHEN** the configured root does not exist
- **THEN** the audit SHALL fail closed

### Requirement: concurrency never exceeds the configured bound

WHEN directory or website audit runs with a configured concurrency value N, inflight artifact work SHALL stay at or under N.

#### Scenario: concurrency two caps inflight

- **WHEN** concurrency is `2` and five files are selected
- **THEN** observed inflight work SHALL never exceed `2`

#### Scenario: concurrency one is serial

- **WHEN** concurrency is `1`
- **THEN** the next file SHALL NOT start before the current file finishes

### Requirement: aggregation order is deterministic

WHEN audit aggregation encodes JSON or SARIF for a multi-target run, result order SHALL follow stable relative path, then channel, then mark class, and SHALL NOT follow task completion order.

#### Scenario: shuffled completion keeps order

- **WHEN** the same three files complete in two different orders under concurrency greater than one
- **THEN** the encoded JSON finding order SHALL be identical across both runs

#### Scenario: relative paths sort stably

- **WHEN** selected relative paths are `b/a.txt` and `a/a.txt`
- **THEN** aggregated output SHALL list `a/a.txt` before `b/a.txt`

### Requirement: JSON audit keeps four unmixed channels

WHEN audit JSON is encoded, findings SHALL use only channels `deterministic`, `c2pa`, `official`, and `statistical`, and the object SHALL NOT contain `watermarkScore`, `suspicious`, or a flat mixed `removed` bag.

#### Scenario: mixed score is rejected

- **WHEN** an audit JSON document contains `watermarkScore`
- **THEN** Schema decode of the public report shape SHALL fail

#### Scenario: channels remain distinct

- **WHEN** a multi-file audit finds deterministic and c2pa evidence
- **THEN** JSON findings SHALL keep separate channel values
- **AND** SHALL NOT merge them into one blended score field

### Requirement: SARIF export is channel-scoped

WHEN audit emits SARIF, each SARIF run or result collection SHALL be scoped to exactly one channel from `deterministic`, `c2pa`, `official`, or `statistical`.

#### Scenario: deterministic SARIF excludes other channels

- **WHEN** SARIF is requested for channel `deterministic`
- **THEN** every result in that SARIF document SHALL map only to deterministic findings
- **AND** SHALL omit c2pa, official, and statistical findings

#### Scenario: SARIF rule ids are actionable

- **WHEN** a present finding is mapped into SARIF
- **THEN** the result SHALL include a stable rule id that names pack id or mark class evidence
- **AND** SHALL include the target path or URI

#### Scenario: SARIF rejects blended score

- **WHEN** a SARIF payload includes `watermarkScore` or a cross-channel blended score property
- **THEN** audit SARIF validation SHALL reject that payload

### Requirement: partial failure retains successful findings

WHEN one selected target fails and another selected target succeeds, the audit result SHALL retain the successful findings and SHALL record the failed target as a failure.

#### Scenario: sibling success survives one failure

- **WHEN** file A inspect succeeds with a present finding and file B inspect fails
- **THEN** the batch result SHALL still include the present finding for file A
- **AND** SHALL include a failure record for file B

#### Scenario: batch is not silent-success on required failure

- **WHEN** any required selected target fails
- **THEN** the overall audit outcome SHALL NOT be reported as full success

### Requirement: uncertainty preserves the failed target only

WHEN a selected target hits an uncertainty reason such as timeout or malformed output, the audit SHALL preserve that target unchanged and SHALL NOT rewrite sibling targets because of that uncertainty.

#### Scenario: timeout preserves only the timed-out target

- **WHEN** file B times out and file A already completed successfully
- **THEN** file B SHALL remain unchanged
- **AND** file A successful findings SHALL remain present in the report

### Requirement: website audit requires explicit opt-in

WHEN website audit is invoked without explicit remote opt-in, the pack SHALL refuse network fetch.

#### Scenario: default off refuses remote

- **WHEN** website audit runs with opt-in unset or false
- **THEN** it SHALL NOT open a remote socket
- **AND** availability or execution SHALL report that remote audit is disabled

#### Scenario: website pack id is stable

- **WHEN** the website audit pack manifest is read after implementation
- **THEN** its id SHALL equal `anthropies.audit-website`
- **AND** its `network` SHALL equal `remote-opt-in`
- **AND** its operations SHALL include `audit`

### Requirement: website audit blocks SSRF target classes

WHILE website audit opt-in is enabled, WHEN a candidate URL resolves to loopback, link-local, private, metadata, or a non-http(s) scheme, the audit SHALL refuse the fetch.

#### Scenario: loopback address is refused

- **WHEN** the URL host resolves to `127.0.0.1` or `::1`
- **THEN** the audit SHALL refuse the fetch

#### Scenario: link-local and metadata are refused

- **WHEN** the URL host resolves to a link-local address or a cloud metadata address such as `169.254.169.254`
- **THEN** the audit SHALL refuse the fetch

#### Scenario: private network is refused

- **WHEN** the URL host resolves to a private address such as `10.0.0.1` or `192.168.1.1`
- **THEN** the audit SHALL refuse the fetch

#### Scenario: file scheme is refused

- **WHEN** the URL uses scheme `file`
- **THEN** the audit SHALL refuse the fetch

### Requirement: redirects stay inside SSRF policy

WHEN website audit follows a redirect, it SHALL enforce a configured hop cap and SHALL re-apply SSRF checks to each redirect target before fetch.

#### Scenario: redirect hop cap stops follow

- **WHEN** redirect hops would exceed the configured hop cap
- **THEN** the audit SHALL stop following redirects
- **AND** SHALL record a redirect-policy failure

#### Scenario: redirect to private target is refused

- **WHEN** an http(s) response redirects to a private or loopback host
- **THEN** the audit SHALL refuse that hop
- **AND** SHALL NOT fetch the private target

### Requirement: website responses honor content type and caps

WHEN website audit downloads a response, it SHALL accept only allowlisted content types and SHALL enforce configured download size and total request budgets.

#### Scenario: disallowed content type is refused

- **WHEN** a response content type is outside the allowlist
- **THEN** the audit SHALL refuse to treat the body as an inspectable artifact

#### Scenario: download cap truncates or refuses oversize body

- **WHEN** a response body would exceed the download size cap
- **THEN** the audit SHALL refuse or stop the download under the cap
- **AND** SHALL NOT inspect unbounded bytes

#### Scenario: request budget stops further fetches

- **WHEN** the configured request budget is exhausted
- **THEN** the audit SHALL NOT issue additional remote requests in that run

### Requirement: sitemap expansion stays inside policy

WHEN website audit reads a sitemap, it SHALL queue only URLs that remain inside the configured host and path policy and inside the request budget.

#### Scenario: off-host sitemap URL is skipped

- **WHEN** a sitemap entry points at a different host than the configured policy host
- **THEN** that entry SHALL NOT be fetched

#### Scenario: no unrestricted crawl

- **WHEN** website audit runs in sitemap mode
- **THEN** it SHALL NOT follow arbitrary hyperlinks outside the sitemap and host policy
- **AND** SHALL NOT perform browser rendering

### Requirement: audit packs do not claim hosted cloud operation

WHEN audit packs are documented or advertised, they SHALL describe local or operator-run execution and SHALL NOT claim a hosted multi-tenant cloud service.

#### Scenario: capabilities text avoids hosted-cloud claim

- **WHEN** GET /capabilities lists audit packs after implementation
- **THEN** pack metadata SHALL NOT advertise hosted cloud operation as a provided service

### Requirement: capabilities lists audit packs and health stays 0.3.0

WHEN GET /capabilities runs after Sprint 2 implementation, packs[] SHALL include ids `anthropies.audit-directory` and `anthropies.audit-website`. WHEN GET /health runs, the body SHALL equal `{ "ok": true, "version": "0.3.0" }`.

#### Scenario: capabilities includes directory audit id

- **WHEN** GET /capabilities is called after implementation
- **THEN** packs[].id SHALL include `anthropies.audit-directory`

#### Scenario: capabilities includes website audit id

- **WHEN** GET /capabilities is called after implementation
- **THEN** packs[].id SHALL include `anthropies.audit-website`

#### Scenario: health stays 0.3.0

- **WHEN** GET /health is called
- **THEN** the body SHALL equal `{ "ok": true, "version": "0.3.0" }`

### Requirement: no mixed score in audit packs

WHEN any Sprint 2 audit pack encodes a finding, removal, JSON report, or SARIF document, the object SHALL NOT contain `score` or `watermarkScore`.

#### Scenario: audit pack tests reject score

- **WHEN** Sprint 2 audit pack tests run
- **THEN** they SHALL assert the pack source files do not match `score` or `watermarkScore`

### Requirement: freeze unit does not implement packs

WHEN this OpenSpec change is created as the freeze unit, the repository SHALL contain the change documents under `openspec/changes/sprint2-audit-reporting-packs/` and SHALL NOT require audit pack source files to exist yet.

#### Scenario: openspec change documents exist

- **WHEN** `openspec/changes/sprint2-audit-reporting-packs/` is listed
- **THEN** it SHALL contain `proposal.md`, `design.md`, `tasks.md`, and `specs/audit-reporting-packs/spec.md`

#### Scenario: strict validate passes on freeze

- **WHEN** `openspec validate sprint2-audit-reporting-packs --strict` runs
- **THEN** the command SHALL exit 0
