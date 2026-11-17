import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transform } from 'esbuild'
import { createTheme, light, dark } from '../src/client/theme.js'

const hex = value => value.match(/[a-f\d]{2}/gi).map(pair => parseInt(pair, 16))
const luminance = rgb => rgb.map(value => {
  const s = value / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (first, second) => {
  const a = luminance(first), b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

for (const [name, variant] of Object.entries({ light, dark })) {
  test(`${name}: ordinary text stays readable on translucent cards`, () => {
    const tokens = variant.tokens
    const tint = tokens['--glass-tint'].split(' ').map(Number)
    const alpha = Number(tokens['--glass-alpha-card'].match(/, ([\d.]+)\)/)[1])
    const backgrounds = [...variant.background.matchAll(/#[a-f\d]{6}/gi)].map(match => hex(match[0]))
    backgrounds.push(...['#376782', '#615b88'].map(hex))
    for (const background of backgrounds) {
      const surface = background.map((value, i) => value * (1 - alpha) + tint[i] * alpha)
      for (const field of ['--text-primary', '--text-secondary', '--text-muted', '--accent']) {
        assert.ok(contrast(hex(tokens[field]), surface) >= 4.5, `${field} needs at least 4.5:1 contrast`)
      }
    }
    for (const field of ['--accent-from', '--accent-to']) assert.ok(contrast(hex(tokens[field]), [255, 255, 255]) >= 4.5)
  })
}

test('all theme values satisfy the host contract without rule injection', () => {
  for (const variant of [light, dark]) {
    for (const [key, value] of Object.entries(variant.tokens)) {
      assert.match(key, /^--[a-zA-Z][\w-]*$/)
      assert.equal(typeof value, 'string')
      assert.doesNotMatch(value, /[;{}<>]/)
    }
    assert.doesNotMatch(variant.background, /[;{}<>]/)
  }
  const theme = createTheme('@author/liuguang', '.card{color:red}')
  assert.match(theme.css, /^@scope \(:root\[data-llbot-theme="@author\/liuguang\|liuguang"\]/)
})

test('styles parse and respect the reduced-motion preference', async () => {
  for (const file of ['theme.css', 'components.css']) {
    const css = readFileSync(new URL(`../src/client/${file}`, import.meta.url), 'utf8')
    const result = await transform(css, { loader: 'css', minify: true })
    assert.equal(result.warnings.length, 0)
    assert.match(css, /prefers-reduced-motion: reduce/)
    assert.doesNotMatch(css, /@import|https?:\/\//)
  }
})
