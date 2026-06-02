import '@testing-library/jest-dom/vitest'

// jsdom in this environment does not always provide a usable localStorage,
// which the i18n provider reads/writes. Supply a minimal in-memory store.
if (
  typeof window !== 'undefined' &&
  (!window.localStorage || typeof window.localStorage.getItem !== 'function')
) {
  const store = new Map()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
      clear: () => store.clear(),
      key: index => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    },
  })
}
