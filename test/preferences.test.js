import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPreferences, DEFAULTS, normalize, preferenceCSS, STORAGE_KEY } from '../src/client/preferences.js'

function environment(saved = null) {
  const values = new Map(saved === null ? [] : [[STORAGE_KEY, saved]])
  const events = new EventTarget()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const notify = value => {
    const event = new Event('storage')
    Object.assign(event, { key: STORAGE_KEY, newValue: value })
    events.dispatchEvent(event)
  }
  return { events, storage, notify, values }
}

test('old, corrupt and untrusted values fall back without injecting CSS', () => {
  for (const value of [null, 'broken JSON', '[]', 'true', '{"motion":"paused;}body{display:none"}']) {
    const env = environment(value)
    const prefs = createPreferences(env.storage, env.events)
    assert.deepEqual(prefs.getSnapshot(), DEFAULTS)
    prefs.dispose()
  }
  assert.deepEqual(normalize({ motion: false, reflection: 1, opaque: true, unwanted: true }), { motion: false, tilt: true, reflection: true, opaque: true })
})

test('settings survive reload and snapshots remain stable until changed', () => {
  const env = environment()
  const prefs = createPreferences(env.storage, env.events)
  const initial = prefs.getSnapshot()
  let updates = 0
  prefs.subscribe(() => updates++)
  prefs.set({ motion: true })
  assert.equal(prefs.getSnapshot(), initial)
  assert.equal(updates, 0)
  prefs.set({ motion: false, tilt: false, opaque: true })
  assert.equal(updates, 1)
  assert.notEqual(prefs.getSnapshot(), initial)
  const second = createPreferences(env.storage, env.events)
  assert.deepEqual(second.getSnapshot(), { motion: false, tilt: false, reflection: true, opaque: true })
  second.reset()
  assert.deepEqual(second.getSnapshot(), DEFAULTS)
  prefs.dispose()
  second.dispose()
})

test('cross-tab updates notify once, and disposing removes the browser listener', () => {
  const env = environment()
  const prefs = createPreferences(env.storage, env.events)
  let updates = 0
  prefs.subscribe(() => updates++)
  env.notify('{"reflection":false}')
  assert.equal(updates, 1)
  assert.equal(prefs.getSnapshot().reflection, false)
  env.notify('{"reflection":false}')
  assert.equal(updates, 1)
  prefs.dispose()
  env.notify(null)
  assert.equal(prefs.getSnapshot().reflection, false)
})

test('privacy modes without writable storage still allow session preferences', () => {
  const storage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  const prefs = createPreferences(storage)
  prefs.set({ opaque: true })
  assert.equal(prefs.getSnapshot().opaque, true)
  prefs.reset()
  assert.deepEqual(prefs.getSnapshot(), DEFAULTS)
  prefs.dispose()
})

test('preference CSS names only the selected theme and can restore translucency', () => {
  const css = preferenceCSS('@author/theme|liuguang', { motion: false, reflection: false, opaque: true })
  assert.match(css, /^:root\[data-llbot-theme="@author\/theme\|liuguang"\]/)
  assert.match(css, /--ll-lg-motion:paused/)
  assert.match(css, /--ll-lg-reflection:0/)
  assert.match(css, /--ll-lg-solid:0\.98/)
  assert.doesNotMatch(preferenceCSS('@author/theme|liuguang', DEFAULTS), /--ll-lg-solid/)
})
