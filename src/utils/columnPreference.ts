export interface StoredColumnPreference {
  version: 1
  visible: string[]
  /** The columns known when the preference was written, used to safely add new defaults. */
  known?: string[]
}

function uniqueKnown(value: unknown, allowed: Set<string>) {
  return Array.isArray(value)
    ? [...new Set(value.filter((key): key is string => typeof key === 'string' && allowed.has(key)))]
    : []
}

export function normalizeColumnPreference(value: unknown, allowed: string[], required: string[], defaults: string[], known?: unknown) {
  const allowedKeys = new Set(allowed)
  const selected = uniqueKnown(value, allowedKeys)
  const previousKnown = uniqueKnown(known, allowedKeys)
  // Preferences written by the current implementation remember which columns existed.
  // Newly introduced default columns should be visible, while a previously hidden
  // column remains hidden. Legacy v1 entries have no known list and remain compatible.
  const newlyIntroducedDefaults = previousKnown.length
    ? defaults.filter(key => !previousKnown.includes(key))
    : []
  const normalized = [...new Set([...selected, ...newlyIntroducedDefaults, ...required])]
  return normalized.length ? normalized : defaults
}

export function readColumnPreference(raw: string | null, allowed: string[], required: string[], defaults: string[]) {
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw) as StoredColumnPreference
    if (parsed?.version !== 1 || !Array.isArray(parsed.visible)) return defaults
    return normalizeColumnPreference(parsed.visible, allowed, required, defaults, parsed.known)
  } catch {
    return defaults
  }
}

export function isValidColumnPreference(raw: string | null): boolean {
  if (!raw) return true
  try {
    const parsed = JSON.parse(raw) as StoredColumnPreference
    return parsed?.version === 1 && Array.isArray(parsed.visible)
  } catch {
    return false
  }
}

export function serializeColumnPreference(visible: string[], known?: string[]): string {
  return JSON.stringify({ version: 1, visible, ...(known?.length ? { known } : {}) } satisfies StoredColumnPreference)
}
