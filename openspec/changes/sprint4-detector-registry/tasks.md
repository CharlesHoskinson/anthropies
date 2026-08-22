## 1. Registry and contracts

- [ ] 1.1 Add failing detector-registry contract tests for register, list, and kernel-range rejection
- [ ] 1.2 Register detector packs through the existing capability registry and version rules
- [ ] 1.3 Advertise detector pack ids on GET `/capabilities` without a `score` field

## 2. Anthropic official seam

- [ ] 2.1 Add failing tests for unset `ANTHROPIC_DETECT_URL` (unavailable, no score)
- [ ] 2.2 Implement Anthropic adapter seam that stays unavailable until configured
- [ ] 2.3 Keep official findings off the clean-certificate path

## 3. Gemini SynthID adapter

- [ ] 3.1 Add failing statistical-channel tests for Gemini SynthID text detect
- [ ] 3.2 Implement Gemini SynthID adapter as a replaceable pack
- [ ] 3.3 Fail soft on unconfigured, rate-limited, and malformed Gemini responses

## 4. MarkLLM same-configuration harness

- [ ] 4.1 Add failing tests that require algorithm and configuration identity
- [ ] 4.2 Implement MarkLLM same-configuration harness as optional statistical evidence
- [ ] 4.3 Assert harness output is not presented as Anthropic or Gemini vendor efficacy

## 5. HTTP `/detect` and version lock

- [ ] 5.1 Add failing OpenAPI and route tests for GET and POST `/detect`
- [ ] 5.2 Implement GET-or-POST `/detect` with channel-separated response
- [ ] 5.3 Keep GET `/health` body `{ "ok": true, "version": "0.3.0" }`
- [ ] 5.4 Golden-test OpenAPI and capabilities for `/detect` and detector packs
