/**
 * A small shared-state store for a single localStorage-backed preference,
 * readable/writable from anywhere without prop-drilling or a context
 * provider. Reads happen synchronously from a module-level cache (so many
 * components reading the same preference don't hit localStorage
 * repeatedly); writes fan out to every subscriber immediately.
 *
 * Deliberately not React Context: these are simple, independent value
 * preferences (theme, rating precision) with no shared side-effect that
 * needs a single owner component — a context provider would just be
 * boilerplate around the same subscribe/publish this already does.
 */
export function createPersistedPreference<T extends string>(
  storageKey: string,
  defaultValue: T,
  isValid: (value: string) => value is T
) {
  function read(): T {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null && isValid(stored)) return stored
    } catch {
      // localStorage can throw in some sandboxed contexts — fall back silently.
    }
    return defaultValue
  }

  let current = read()
  const listeners = new Set<(value: T) => void>()

  return {
    get(): T {
      return current
    },
    set(value: T): void {
      current = value
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // best-effort persistence only
      }
      listeners.forEach((listener) => listener(value))
    },
    subscribe(listener: (value: T) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}
