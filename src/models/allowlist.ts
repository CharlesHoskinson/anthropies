/** Committed MARKED_MODEL_IDS. Empty is a valid Wave-1 state. Keep in sync with allowlist.json. */
export const markedModelIds: ReadonlyArray<string> = []

/** Exact ID match only. Do not parse dates. Do not assume newer is marked. */
export const isAllowlisted = (model: string, allowlist: ReadonlyArray<string>): boolean =>
  allowlist.includes(model)
