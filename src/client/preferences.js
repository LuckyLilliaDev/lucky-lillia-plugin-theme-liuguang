export const STORAGE_KEY = 'llbot-theme-liuguang-v1'
export const DEFAULTS = Object.freeze({ motion: true, tilt: true, reflection: true, opaque: false })

/** Accept only known booleans; old/corrupt storage never becomes arbitrary CSS. */
export function normalize(input) {
  return Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [
    key, typeof input?.[key] === 'boolean' ? input[key] : fallback,
  ]))
}

function parse(value) {
  try { return normalize(JSON.parse(value)) } catch { return { ...DEFAULTS } }
}

export function createPreferences(storage, events) {
  let current
  try { current = parse(storage?.getItem(STORAGE_KEY)) } catch { current = { ...DEFAULTS } }
  const listeners = new Set()
  const update = (next) => {
    if (Object.keys(DEFAULTS).every(key => current[key] === next[key])) return false
    current = Object.freeze(next)
    listeners.forEach(listener => listener())
    return true
  }
  const onStorage = event => {
    if (event.key === STORAGE_KEY || event.key === null) update(parse(event.newValue))
  }
  events?.addEventListener('storage', onStorage)
  return {
    getSnapshot: () => current,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    set(patch) {
      if (!update(normalize({ ...current, ...patch }))) return
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(current)) } catch { /* Session settings still work. */ }
    },
    reset() { this.set(DEFAULTS) },
    dispose() { events?.removeEventListener('storage', onStorage); listeners.clear() },
  }
}

export function preferenceCSS(themeKey, settings) {
  const { motion, reflection, opaque } = normalize(settings)
  return `:root[data-llbot-theme=${JSON.stringify(themeKey)}] {\n`
    + `--ll-lg-motion:${motion ? 'running' : 'paused'};\n`
    + `--ll-lg-reflection:${reflection ? '1' : '0'};\n`
    + (opaque ? '--ll-lg-solid:0.98;\n' : '') + '}'
}
