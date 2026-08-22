## Purpose

Sprint 3 freezes multi-candidate non-origin rewrite, print-prompt default, optional Ollama and OpenAI-compatible loopback adapters, lexical candidate selection independent of detectors, and five-gram plus stylometry observation states `computed`, `insufficient`, and `not-run`. Scope excludes official-removal certification, bundled language models, detector-driven success verdicts, and HTTP `/humanize`.

## ADDED Requirements

### Requirement: multi-candidate non-origin rewrite produces observation records

WHEN an HTTP rewrite backend runs humanize on prose with multi-candidate mode enabled, the pack SHALL produce at least two rewrite candidates and SHALL record a per-candidate observation for each candidate.

#### Scenario: two candidates each get observations

- **WHEN** multi-candidate rewrite completes with two candidate texts
- **THEN** the result SHALL include at least two per-candidate observation records
- **AND** each record SHALL identify its candidate

#### Scenario: selected text is one candidate

- **WHEN** multi-candidate rewrite selects a winner
- **THEN** the written humanize output SHALL equal exactly one of the candidate texts

#### Scenario: rewrite pack id is stable

- **WHEN** the rewrite-stylometry pack manifest is read after implementation
- **THEN** its id SHALL equal `anthropies.rewrite-stylometry`

### Requirement: origin stamper backends are refused

WHEN the configured rewrite backend or model string contains `claude`, `anthropic`, `gemini`, `google-gemini`, or `synthid`, humanize SHALL fail with OriginBlocked and SHALL leave input bytes unchanged.

#### Scenario: claude backend is blocked

- **WHEN** backend is `claude` and model is `llama`
- **THEN** humanize SHALL return OriginBlocked
- **AND** SHALL NOT write rewritten bytes

#### Scenario: gemini model is blocked

- **WHEN** backend is `ollama` and model is `gemini-2.5`
- **THEN** humanize SHALL return OriginBlocked

#### Scenario: unmarked local model is allowed

- **WHEN** backend is `ollama` and model is `llama3.2`
- **THEN** origin blocklist SHALL NOT refuse the run for those tokens alone

### Requirement: print-prompt is the default backend

WHEN rewrite backend configuration is unset, the effective backend SHALL be `print-prompt`.

#### Scenario: unset backend resolves to print-prompt

- **WHEN** `ANTHROPIES_REWRITE_BACKEND` is unset
- **THEN** humanize SHALL use backend `print-prompt`

#### Scenario: print-prompt emits prompt text not a rewrite

- **WHEN** backend is `print-prompt`
- **THEN** the returned text SHALL begin with the structured rewrite prompt
- **AND** SHALL include the cleaned input text
- **AND** SHALL NOT POST to a rewrite HTTP endpoint

### Requirement: print-prompt does not destamp

WHEN backend is `print-prompt`, the result note or honesty surface SHALL state that print-prompt does not destamp, and rewrite observation status SHALL be `not-run`.

#### Scenario: print-prompt denial is present

- **WHEN** humanize runs with backend `print-prompt`
- **THEN** the note SHALL match `print-prompt` and SHALL state that it does not destamp

#### Scenario: print-prompt metric is not-run

- **WHEN** humanize runs with backend `print-prompt`
- **THEN** five-gram observation status SHALL equal `not-run`
- **AND** surviving_ratio SHALL be null

### Requirement: optional Ollama adapter posts only when selected

WHERE backend is `ollama`, WHEN humanize runs, the adapter SHALL POST to the Ollama generate endpoint derived from the configured base URL and SHALL parse the response text.

#### Scenario: ollama uses generate path

- **WHEN** base URL is `http://127.0.0.1:11434` and backend is `ollama`
- **THEN** the request URL SHALL equal `http://127.0.0.1:11434/api/generate`

#### Scenario: ollama is not used on print-prompt

- **WHEN** backend is `print-prompt`
- **THEN** the Ollama adapter SHALL NOT open a socket

### Requirement: optional OpenAI-compatible adapter posts only when selected

WHERE backend is `openai-compatible`, WHEN humanize runs, the adapter SHALL POST to the chat completions endpoint derived from the configured base URL and SHALL parse the first choice content.

#### Scenario: openai-compatible uses chat completions path

- **WHEN** base URL is `http://127.0.0.1:8080` and backend is `openai-compatible`
- **THEN** the request URL SHALL equal `http://127.0.0.1:8080/v1/chat/completions`

#### Scenario: trailing v1 is not doubled

- **WHEN** base URL is `http://127.0.0.1:8080/v1` and backend is `openai-compatible`
- **THEN** the request URL SHALL equal `http://127.0.0.1:8080/v1/chat/completions`

### Requirement: remote rewrite URLs require explicit enablement

WHEN a rewrite base URL host is not loopback and `ANTHROPIES_REWRITE_ALLOW_REMOTE` is not `1`, the rewrite SHALL fail closed and SHALL NOT open the remote socket.

#### Scenario: non-loopback without enablement is denied

- **WHEN** base URL is `https://example.com` and allow-remote is unset or not `1`
- **THEN** rewrite SHALL fail with remote denied
- **AND** SHALL NOT send the prompt body to that host

#### Scenario: loopback is allowed without remote enablement

- **WHEN** base URL host is `127.0.0.1` or `localhost` and backend is `ollama`
- **THEN** rewrite URL policy SHALL allow the request without `ANTHROPIES_REWRITE_ALLOW_REMOTE=1`

#### Scenario: remote enablement permits non-loopback

- **WHEN** allow-remote is `1` and base URL is a valid http(s) non-loopback URL
- **THEN** rewrite URL policy SHALL allow the request

### Requirement: no bundled language models

WHEN the Anthropies package is built or published for Sprint 3 rewrite, it SHALL NOT include language model weight files for Ollama, Llama, or other rewrite backends.

#### Scenario: package excludes model blobs

- **WHEN** package contents are inventoried after Sprint 3 implementation
- **THEN** the inventory SHALL omit bundled model weight blobs
- **AND** adapters SHALL expect an operator-provided local or remote endpoint

### Requirement: lexical candidate selection ignores detectors

WHEN multiple rewrite candidates exist, candidate selection SHALL use lexical or five-gram overlap criteria derived from text only and SHALL NOT use detector scores, official channel results, or vendor detection payloads to choose the winner.

#### Scenario: detector disagreement does not change lexical winner

- **WHEN** candidate A is lexically better than candidate B and a detector scores B more favorably than A
- **THEN** selection SHALL still choose candidate A

#### Scenario: missing detectors still select

- **WHEN** no detector adapters are configured
- **THEN** multi-candidate rewrite SHALL still select a winner by lexical criteria
- **AND** SHALL NOT fail solely because detectors are absent

#### Scenario: selection is not a clean certificate

- **WHEN** a candidate is selected
- **THEN** the report SHALL NOT treat selection as official removal or as an official-detector failure certificate

### Requirement: five-gram observation uses three states

WHEN five-gram overlap is recorded, status SHALL be one of `computed`, `insufficient`, or `not-run`.

#### Scenario: not-run when rewrite skipped

- **WHEN** rewrite does not execute, including print-prompt
- **THEN** five-gram status SHALL equal `not-run`
- **AND** surviving_ratio SHALL be null

#### Scenario: insufficient for short prose

- **WHEN** a real rewrite completes on prose with fewer than 200 Unicode letter tokens
- **THEN** five-gram status SHALL equal `insufficient`
- **AND** surviving_ratio SHALL be null

#### Scenario: insufficient for code domain

- **WHEN** a real rewrite completes with domain `code`
- **THEN** five-gram status SHALL equal `insufficient`
- **AND** surviving_ratio SHALL be null

#### Scenario: computed for long prose rewrite

- **WHEN** a real rewrite completes on prose with at least 200 Unicode letter tokens
- **THEN** five-gram status SHALL equal `computed`
- **AND** ngram SHALL equal `5`
- **AND** tokenizer SHALL equal `unicode-words`

### Requirement: stylometry observation uses three states

WHEN stylometric observation is recorded, status SHALL be one of `computed`, `insufficient`, or `not-run`, and SHALL follow the same sufficiency gate as five-gram overlap for code and short prose.

#### Scenario: stylometry not-run on print-prompt

- **WHEN** backend is `print-prompt`
- **THEN** stylometry status SHALL equal `not-run`

#### Scenario: stylometry insufficient under 200 tokens

- **WHEN** a real rewrite completes on prose with fewer than 200 Unicode letter tokens
- **THEN** stylometry status SHALL equal `insufficient`

#### Scenario: stylometry computed only after sufficient prose rewrite

- **WHEN** a real rewrite completes on prose with at least 200 Unicode letter tokens
- **THEN** stylometry status SHALL equal `computed`

### Requirement: statistical observations are not pass bars

WHEN five-gram or stylometry observations are present, tests and CI SHALL NOT treat those values as a pass or fail efficacy threshold, and the report SHALL keep them on the statistical channel as best-effort evidence.

#### Scenario: no CI gate on surviving ratio

- **WHEN** Sprint 3 rewrite tests run
- **THEN** they SHALL NOT fail solely because surviving_ratio is above or below a numeric efficacy threshold

#### Scenario: honesty denies official-detector certificate

- **WHEN** a humanize report is encoded after rewrite
- **THEN** honesty text SHALL state that statistical evidence is not an official-detector certificate

### Requirement: prompts preserve facts URLs and fences

WHEN prose or code rewrite prompts are emitted, they SHALL require structure-changing rewrite and SHALL require facts, numbers, names, URLs, citations, and fenced code to remain byte-stable.

#### Scenario: prose prompt requires H-gram break

- **WHEN** the prose print-prompt text is read
- **THEN** it SHALL require change of clause order and sentence boundaries
- **AND** SHALL tell the model to keep facts, URLs, and code fences stable

#### Scenario: code prompt keeps APIs stable

- **WHEN** the code print-prompt text is read
- **THEN** it SHALL forbid changing public APIs and behavior
- **AND** SHALL limit rewrite to comments, docstrings, and non-load-bearing string literals

### Requirement: no official-removal certification

WHEN Sprint 3 rewrite or stylometry runs, the pack SHALL NOT claim official removal, official-kill, destamp success, or certified absence of a keyed text mark.

#### Scenario: report rejects official-kill claim

- **WHEN** a rewrite report or note claims official text-kill or certified destamp
- **THEN** claims or report validation SHALL reject that text

#### Scenario: destamp capability stays forbidden

- **WHEN** capability names for the rewrite pack are listed
- **THEN** they SHALL NOT include `destamp` as a provided operation

### Requirement: no mixed score in rewrite packs

WHEN any Sprint 3 rewrite pack encodes a finding, report, or observation, the object SHALL NOT contain `score` or `watermarkScore`.

#### Scenario: rewrite pack tests reject score

- **WHEN** Sprint 3 rewrite pack tests run
- **THEN** they SHALL assert the pack source files do not match `score` or `watermarkScore`

### Requirement: capabilities lists rewrite pack and health stays 0.3.0

WHEN GET /capabilities runs after Sprint 3 implementation, packs[] SHALL include id `anthropies.rewrite-stylometry`. WHEN GET /health runs, the body SHALL equal `{ "ok": true, "version": "0.3.0" }`.

#### Scenario: capabilities includes rewrite pack id

- **WHEN** GET /capabilities is called after implementation
- **THEN** packs[].id SHALL include `anthropies.rewrite-stylometry`

#### Scenario: health stays 0.3.0

- **WHEN** GET /health is called
- **THEN** the body SHALL equal `{ "ok": true, "version": "0.3.0" }`

#### Scenario: no humanize HTTP route

- **WHEN** the HTTP route table is read after Sprint 3 implementation
- **THEN** it SHALL NOT expose `/humanize`

### Requirement: freeze unit does not implement packs

WHEN this OpenSpec change is created as the freeze unit, the repository SHALL contain the change documents under `openspec/changes/sprint3-rewrite-stylometry/` and SHALL NOT require rewrite pack source files to exist yet.

#### Scenario: openspec change documents exist

- **WHEN** `openspec/changes/sprint3-rewrite-stylometry/` is listed
- **THEN** it SHALL contain `proposal.md`, `design.md`, `tasks.md`, and `specs/rewrite-stylometry/spec.md`

#### Scenario: strict validate passes on freeze

- **WHEN** `openspec validate sprint3-rewrite-stylometry --strict` runs
- **THEN** the command SHALL exit 0
