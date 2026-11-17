/* Original Canvas 2D scene. The water samples the rendered scene, including
 * the glass objects; it is not a second gradient or a set of decorative lines. */
import { mountSurfaces } from './surfaces.js'

const TAU = Math.PI * 2
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))
const rgba = (color, alpha) => `rgba(${color},${alpha})`

function gradient(ctx, x0, y0, x1, y1, stops) {
  const value = ctx.createLinearGradient(x0, y0, x1, y1)
  stops.forEach(([position, color]) => value.addColorStop(position, color))
  return value
}

function glow(ctx, x, y, radius, color, alpha) {
  const value = ctx.createRadialGradient(x, y, 0, x, y, radius)
  value.addColorStop(0, rgba(color, alpha))
  value.addColorStop(.38, rgba(color, alpha * .5))
  value.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = value
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

function atmosphere(ctx, w, h, t, dark, compact, pointer) {
  ctx.fillStyle = gradient(ctx, 0, 0, w, h, dark
    ? [[0, '#071122'], [.55, '#112844'], [1, '#101a33']]
    : [[0, '#dce9f5'], [.55, '#b9d9e5'], [1, '#d4caeb']])
  ctx.fillRect(0, 0, w, h)
  const spread = Math.max(w * .52, h * .6)
  glow(ctx, w * (.22 + Math.sin(t * .19) * .15) + pointer.x * 12, h * .25, spread, dark ? '22,165,182' : '78,180,198', dark ? .33 : .3)
  glow(ctx, w * (.76 + Math.cos(t * .15) * .15), h * (.18 + Math.sin(t * .22) * .1), spread * .9, dark ? '134,73,213' : '163,113,208', dark ? .38 : .3)
  glow(ctx, w * .57, h * .56, spread * .6, dark ? '218,92,171' : '238,156,187', .16)

  // Several widths of the same curved ribbon form a bloom without an
  // expensive full-screen blur/readback on every frame.
  const ribbon = (index) => {
    const phase = t * .38 + index * 1.7
    ctx.beginPath()
    ctx.moveTo(-w * .15, h * (.46 + Math.sin(phase) * .09))
    ctx.bezierCurveTo(w * .18, h * (-.1 + Math.cos(phase * .8) * .18), w * .34, h * (.72 + Math.sin(phase) * .16), w * .61, h * (.28 + Math.sin(phase * .7) * .16))
    ctx.bezierCurveTo(w * .83, h * (-.08 + Math.sin(phase * .9) * .15), w * 1.01, h * (.47 + Math.cos(phase) * .15), w * 1.17, h * .08)
  }
  ctx.save()
  ctx.globalCompositeOperation = dark ? 'screen' : 'source-over'
  const band = compact ? h * .11 : h * .1
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = gradient(ctx, 0, h * .2, w, h * .5, [
      [0, dark ? '#22bcca' : '#56acb6'], [.35, '#79e5d6'], [.62, '#8795f0'], [.82, '#cb8ce3'], [1, '#ffb3d0'],
    ])
    for (const [width, alpha] of [[2.5, .025], [1.6, .035], [.8, .06], [.28, .13], [.025, .6]]) {
      ctx.lineWidth = Math.max(.6, band * width)
      ctx.globalAlpha = alpha * (dark ? 1 : .66) * (i ? .55 : 1)
      ribbon(i)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function glass(ctx, sky, x, y, size, t, dark, back = false) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * .7) * size * .045)
  ctx.rotate((back ? .17 : -.17) + Math.sin(t * .27) * .07)
  ctx.transform(1, -.08, -.16 + Math.cos(t * .32) * .035, 1, 0, 0)
  const w = size, h = size * 1.1, r = size * .2, depth = size * .045
  // The back and side faces make a solid slab rather than an outlined tile.
  ctx.fillStyle = gradient(ctx, -w / 2, -h / 2, w / 2, h / 2, [[0, 'rgba(205,255,255,.55)'], [.45, 'rgba(102,172,213,.08)'], [1, 'rgba(171,142,255,.48)']])
  ctx.beginPath()
  ctx.roundRect(-w / 2 + depth, -h / 2 + depth, w, h, r)
  ctx.fill()
  ctx.strokeStyle = 'rgba(183,229,253,.5)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, r)
  ctx.clip()
  // Optical magnification: the scene behind the slab is actually sampled,
  // shifted and enlarged. The object never contains an external image.
  ctx.globalAlpha = back ? .35 : .8
  ctx.drawImage(sky, Math.max(0, x - size * .58), Math.max(0, y - size * .64), Math.min(size, sky.width - x + size * .58), Math.min(size * 1.1, sky.height - y + size * .64), -w / 2, -h / 2, w, h)
  ctx.globalAlpha = 1
  ctx.fillStyle = gradient(ctx, -w / 2, -h / 2, w / 2, h / 2, [[0, 'rgba(224,251,255,.28)'], [.36, 'rgba(152,216,244,.03)'], [.62, 'rgba(152,216,244,.06)'], [1, 'rgba(142,128,232,.25)']])
  ctx.fillRect(-w / 2, -h / 2, w, h)
  // A narrow travelling reflection across the face.
  const sweep = Math.sin(t * .45) * w * .9
  ctx.fillStyle = gradient(ctx, sweep - w * .25, 0, sweep + w * .25, 0, [[0, 'transparent'], [.5, 'rgba(235,255,255,.19)'], [1, 'transparent']])
  ctx.transform(1, 0, -.35, 1, 0, 0)
  ctx.fillRect(-w, -h, w * 2, h * 2)
  ctx.restore()
  ctx.strokeStyle = gradient(ctx, -w / 2, -h / 2, w / 2, h / 2, [[0, 'rgba(236,255,255,.95)'], [.25, 'rgba(198,255,255,.48)'], [.55, 'rgba(139,179,228,.12)'], [1, 'rgba(218,187,255,.7)']])
  ctx.lineWidth = Math.max(1, size * .009)
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, r)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(228,255,255,.12)'
  ctx.lineWidth = size * .018
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(2, r - 4))
  ctx.stroke()
  if (!back) {
    glow(ctx, 0, 0, size * .49, '160,248,246', dark ? .4 : .26)
    ctx.strokeStyle = dark ? 'rgba(211,255,255,.57)' : 'rgba(57,136,157,.5)'
    ctx.lineWidth = Math.max(.6, size * .004)
    ctx.beginPath()
    ctx.ellipse(0, 0, size * .29, size * .13, -.5 + t * .08, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = dark ? '#c8fff4' : '#367f96'
    ctx.shadowColor = '#b4fff0'
    ctx.shadowBlur = size * .15
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2 + Math.sin(t * .3) * .15
      const radius = size * (i % 2 ? .044 : .19)
      const px = Math.cos(a) * radius, py = Math.sin(a) * radius
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function particles(ctx, w, h, t, dark, compact) {
  ctx.save()
  const count = compact ? 16 : 42
  for (let i = 0; i < count; i++) {
    const x = ((i * .6180339 + t * .006 * (i % 3 + 1)) % 1) * w
    const y = ((i * .38211) % .61) * h + Math.sin(t * .6 + i) * h * .025
    const alpha = .15 + (Math.sin(t * 1.1 + i * 1.7) + 1) * .2
    ctx.fillStyle = dark ? rgba('183,248,255', alpha) : rgba('72,117,158', alpha * .6)
    ctx.beginPath()
    ctx.arc(x, y, (i % 4 === 0 ? 1.5 : .7) * (compact ? .7 : 1), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function water(ctx, scene, w, h, horizon, t, dark, enabled) {
  if (!enabled) return
  // Each scanline reads from the SAME upper scene, upside down. Waves
  // perturb the reflected coordinates; distance increases the roughness.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, horizon, w, h - horizon)
  ctx.clip()
  for (let y = horizon; y < h; y += 2) {
    const distance = (y - horizon) / (h - horizon)
    const sourceY = horizon - (y - horizon) * 1.15
    if (sourceY < 0) continue
    const shift = (Math.sin(distance * 52 - t * 1.9) + Math.sin(distance * 93 + t * 1.3) * .45) * (1 + distance * 8)
    ctx.globalAlpha = (dark ? .88 : .83) * (1 - distance * .48)
    ctx.drawImage(scene, 0, Math.max(0, sourceY - 2), w, 2, shift - 16, y, w + 32, 2.5)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = gradient(ctx, 0, horizon, 0, h, [[0, 'transparent'], [1, dark ? 'rgba(4,15,31,.28)' : 'rgba(205,218,239,.17)']])
  ctx.fillRect(0, horizon, w, h - horizon)
  // Broken, perspective-spaced caustics, never a horizontal grid.
  for (let i = 0; i < 16; i++) {
    const d = ((i / 16 + t * .012) % 1) ** 2
    const y = horizon + d * (h - horizon)
    const x = w * (.5 + Math.sin(i * 2.4 + t * .18) * .43)
    const width = w * (.015 + d * .09)
    ctx.strokeStyle = rgba(dark ? '132,234,242' : '255,255,255', (1 - d) * .11)
    ctx.lineWidth = .7
    ctx.beginPath()
    ctx.ellipse(x, y, width, 1 + d * 2, 0, .08, Math.PI - .08)
    ctx.stroke()
  }
  ctx.restore()
}

/** One renderer owns its loop, media listeners and buffers. No hidden-page
 * rendering, no work when still, and no animation is left after dispose. */
export function createScene(canvas, preferences, { compact = false, onFrame } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return () => {}
  const sky = document.createElement('canvas'), scene = document.createElement('canvas')
  const skyCtx = sky.getContext('2d', { alpha: false }), sceneCtx = scene.getContext('2d', { alpha: false })
  if (!skyCtx || !sceneCtx) return () => {}
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const contrast = matchMedia('(forced-colors: active)')
  let width = 1, height = 1, animation = 0, last = 0, time = 7, disposed = false
  let pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 }, dirty = true
  const moving = () => preferences.getSnapshot().motion && !reduce.matches
  const paint = () => {
    const dark = true // The theme's scene stays dark in light/auto host modes too.
    atmosphere(skyCtx, width, height, time, dark, compact, pointer)
    sceneCtx.drawImage(sky, 0, 0)
    const size = compact ? width * .35 : Math.min(width * .18, height * .28)
    const x = width * (compact ? .53 : .84) + pointer.x * 10
    const y = height * (compact ? .34 : .35) + pointer.y * 7
    glass(sceneCtx, sky, x + size * .25, y - size * .05, size * .88, time + 1.5, dark, true)
    glass(sceneCtx, sky, x - size * .07, y, size, time, dark)
    particles(sceneCtx, width, height, time, dark, compact)
    ctx.drawImage(scene, 0, 0)
    water(ctx, scene, width, height, height * (compact ? .62 : .57), time, dark, preferences.getSnapshot().reflection)
    canvas.dataset.motion = moving() ? 'running' : 'still'
    canvas.dataset.reflection = String(preferences.getSnapshot().reflection)
    onFrame?.(canvas)
    dirty = false
  }
  const loop = now => {
    animation = 0
    if (disposed || document.hidden || contrast.matches) return
    const elapsed = last ? Math.min(100, now - last) : 34
    if (elapsed < 1000 / (compact ? 24 : 30) && !dirty) { animation = requestAnimationFrame(loop); return }
    last = now
    if (moving()) {
      time += elapsed / 1000
      pointer.x += (target.x - pointer.x) * .07
      pointer.y += (target.y - pointer.y) * .07
    }
    paint()
    if (moving()) animation = requestAnimationFrame(loop)
  }
  const invalidate = () => {
    dirty = true
    last = 0
    if (!animation && !disposed && !document.hidden) animation = requestAnimationFrame(loop)
  }
  const resize = () => {
    const box = canvas.getBoundingClientRect()
    const scale = Math.min(devicePixelRatio || 1, compact ? 1.5 : 1, 1440 / Math.max(1, box.width))
    width = Math.max(1, Math.round(box.width * scale))
    height = Math.max(1, Math.round(box.height * scale))
    if (canvas.width === width && canvas.height === height) return
    for (const buffer of [canvas, sky, scene]) { buffer.width = width; buffer.height = height }
    // Resizing clears a canvas. Paint in the ResizeObserver turn so CSS
    // layout transitions and mobile rotation never expose a black frame.
    if (!document.hidden && !contrast.matches) paint()
    invalidate()
  }
  const onVisibility = () => {
    if (animation) cancelAnimationFrame(animation)
    animation = 0
    if (!document.hidden) invalidate()
  }
  const onPointer = event => {
    if (!moving()) return
    target = { x: clamp(event.clientX / innerWidth * 2 - 1, -1, 1), y: clamp(event.clientY / innerHeight * 2 - 1, -1, 1) }
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  const mode = new MutationObserver(invalidate)
  mode.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  const unsubscribe = preferences.subscribe(invalidate)
  reduce.addEventListener('change', invalidate)
  contrast.addEventListener('change', invalidate)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('scroll', invalidate, { capture: true, passive: true })
  if (!compact) window.addEventListener('pointermove', onPointer, { passive: true })
  resize()
  const dispose = () => {
    disposed = true
    if (animation) cancelAnimationFrame(animation)
    observer.disconnect(); mode.disconnect(); unsubscribe()
    reduce.removeEventListener('change', invalidate)
    contrast.removeEventListener('change', invalidate)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('scroll', invalidate, true)
    if (!compact) window.removeEventListener('pointermove', onPointer)
    sky.width = sky.height = scene.width = scene.height = 1
  }
  dispose.invalidate = invalidate
  return dispose
}

/** Effects exist only while the active theme owns the host's background.
 * Observe replacement too: fullscreen, login and shell transitions remount it.
 * All inserted nodes and classes belong to this instance and are removed. */
export function mountThemeScene(key, preferences) {
  const root = document.documentElement
  let surface, canvas, stopScene, surfaces, pending = 0, disposed = false
  const sheets = new Map()
  const clearSheets = () => {
    for (const [element, lens] of sheets) {
      lens.remove(); element.classList.remove('lg-refracted')
      element.style.removeProperty('--ll-lg-pointer-x'); element.style.removeProperty('--ll-lg-pointer-y')
    }
    sheets.clear()
  }
  const discover = () => {
    let changed = false
    for (const [element, lens] of sheets) if (!element.isConnected) {
      lens.remove(); element.classList.remove('lg-refracted'); sheets.delete(element)
    }
    for (const element of document.querySelectorAll('.card, .glass-regular')) {
      if (sheets.has(element) || element.parentElement?.closest('.card, .glass-regular, .bg-popup') || element.closest('[role=dialog]')) continue
      if (sheets.size >= 24) break
      const lens = document.createElement('canvas')
      lens.className = 'lg-optics'
      lens.setAttribute('aria-hidden', 'true')
      element.classList.add('lg-refracted')
      element.prepend(lens)
      sheets.set(element, lens)
      changed = true
    }
    if (changed) stopScene?.invalidate?.()
    surfaces?.refresh()
  }
  const refract = source => {
    const scale = source.width / Math.max(1, source.clientWidth)
    for (const [element, lens] of sheets) {
      const rect = element.getBoundingClientRect()
      if (!element.isConnected || rect.bottom < 0 || rect.top > innerHeight || rect.width < 10 || rect.height < 10) continue
      const w = Math.round(rect.width), h = Math.round(rect.height), band = Math.min(10, h / 5)
      if (lens.width !== w || lens.height !== h) { lens.width = w; lens.height = h }
      const c = lens.getContext('2d')
      if (!c) continue
      c.clearRect(0, 0, w, h)
      c.globalAlpha = preferences.getSnapshot().opaque ? .04 : .42
      // Magnified edges only. The centre remains normal DOM backdrop glass;
      // drawing wallpaper there would cover content behind nested sheets.
      const strip = (sx, sy, sw, sh, dx, dy, dw, dh) => c.drawImage(source, sx * scale, sy * scale, sw * scale, sh * scale, dx, dy, dw, dh)
      strip(rect.left, rect.top + band * .55, w, band * .45, 0, 0, w, band)
      strip(rect.left, rect.bottom - band, w, band * .45, 0, h - band, w, band)
      strip(rect.left + band * .55, rect.top + band, band * .45, h - band * 2, 0, band, band, h - band * 2)
      strip(rect.right - band, rect.top + band, band * .45, h - band * 2, w - band, band, band, h - band * 2)
    }
  }
  const sync = () => {
    pending = 0
    if (disposed) return
    const next = root.dataset.llbotTheme === key ? document.querySelector('[data-theme-background]') : null
    if (next !== surface) {
      stopScene?.(); stopScene = undefined
      surfaces?.dispose(); surfaces = undefined
      canvas?.remove(); canvas = undefined
      clearSheets(); surface = next
      if (surface) {
        surfaces = mountSurfaces(preferences)
        canvas = document.createElement('canvas')
        canvas.className = 'lg-wallpaper'
        canvas.setAttribute('aria-hidden', 'true')
        canvas.dataset.liuguangScene = 'wallpaper'
        surface.append(canvas)
        discover()
        stopScene = createScene(canvas, preferences, { onFrame: refract })
      }
    } else if (surface) discover()
  }
  const schedule = () => { if (!pending && !disposed) pending = requestAnimationFrame(sync) }
  const observer = new MutationObserver(schedule)
  observer.observe(root, { attributes: true, attributeFilter: ['data-llbot-theme'], childList: true, subtree: true })
  schedule()
  return () => {
    disposed = true
    observer.disconnect()
    if (pending) cancelAnimationFrame(pending)
    stopScene?.(); surfaces?.dispose(); canvas?.remove(); clearSheets()
  }
}
