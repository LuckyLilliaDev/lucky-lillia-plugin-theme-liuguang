const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const TARGETS = '.card, .glass-interactive, .btn-primary, .btn-glass'
const PROPERTIES = ['--ll-lg-tilt-x', '--ll-lg-tilt-y', '--ll-lg-lift', '--ll-lg-base-transform', '--ll-lg-pointer-x', '--ll-lg-pointer-y']

/** Only active while this theme owns the wallpaper. The mirror is the
 * browser's painted box reflection, so text, images and animation stay in
 * sync without cloning DOM or creating duplicate buttons/accessibility nodes. */
export function mountSurfaces(preferences) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const fine = matchMedia('(hover: hover) and (pointer: fine)')
  const mirrors = new Set(), tilted = new Map()
  let hovered, pointer, frame = 0, layoutFrame = 0, disposed = false
  const canTilt = () => preferences.getSnapshot().tilt && fine.matches && !reduce.matches
  const clearTilt = element => {
    const state = tilted.get(element)
    if (state?.timer) clearTimeout(state.timer)
    element.classList.remove('lg-tilting')
    for (const property of PROPERTIES) element.style.removeProperty(property)
    tilted.delete(element)
  }
  const release = (immediate = false) => {
    const previous = hovered
    hovered = undefined
    if (!previous) return
    if (immediate) { clearTilt(previous); return }
    previous.style.setProperty('--ll-lg-tilt-x', '0deg')
    previous.style.setProperty('--ll-lg-tilt-y', '0deg')
    previous.style.setProperty('--ll-lg-lift', '0px')
    previous.style.removeProperty('--ll-lg-pointer-x')
    previous.style.removeProperty('--ll-lg-pointer-y')
    const state = tilted.get(previous)
    if (state) state.timer = setTimeout(() => clearTilt(previous), 280)
  }
  const clearMirrors = () => {
    for (const element of mirrors) {
      element.classList.remove('lg-card-reflection')
      element.style.removeProperty('--ll-lg-mirror-height')
    }
    mirrors.clear()
  }
  const measure = () => {
    layoutFrame = 0
    clearMirrors()
    if (disposed || !preferences.getSnapshot().reflection) return
    const cards = [...document.querySelectorAll('main .card')].filter(element =>
      !element.parentElement?.closest('.card') && !element.closest('[role=dialog]'),
    )
    const obstacles = [...cards, ...document.querySelectorAll('main footer')].map(element => ({ element, rect: element.getBoundingClientRect() }))
    for (const element of cards) {
      const rect = element.getBoundingClientRect()
      if (rect.width < 80 || rect.height < 60 || rect.bottom < 0 || rect.bottom >= innerHeight - 22) continue
      let room = Math.min(112, innerHeight - rect.bottom - 20)
      for (const obstacle of obstacles) {
        if (obstacle.element === element || obstacle.rect.top < rect.bottom - 2) continue
        if (Math.min(rect.right, obstacle.rect.right) - Math.max(rect.left, obstacle.rect.left) < 12) continue
        room = Math.min(room, obstacle.rect.top - rect.bottom - 12)
      }
      if (room < 12) continue
      element.style.setProperty('--ll-lg-mirror-height', `${Math.floor(room)}px`)
      element.classList.add('lg-card-reflection')
      mirrors.add(element)
    }
  }
  const refresh = () => {
    if (!disposed && !layoutFrame) layoutFrame = requestAnimationFrame(measure)
  }
  const paintPointer = () => {
    frame = 0
    if (disposed || !pointer || !canTilt()) { release(true); return }
    const editing = pointer.target instanceof Element && pointer.target.closest('input, textarea, [contenteditable=true], [role=slider]')
    const target = pointer.target instanceof Element && !editing ? pointer.target.closest(TARGETS) : null
    // Fixed chrome and text editing surfaces should keep their geometry.
    const element = target && !target.closest('nav, [role=dialog]') && !target.matches(':disabled') ? target : null
    if (hovered !== element) {
      release()
      if (element) {
        const old = tilted.get(element)
        if (old?.timer) clearTimeout(old.timer)
        const rect = old?.rect ?? element.getBoundingClientRect()
        const base = old?.base ?? getComputedStyle(element).transform
        tilted.set(element, { rect, base })
        element.style.setProperty('--ll-lg-base-transform', base === 'none' ? 'matrix(1,0,0,1,0,0)' : base)
        element.classList.add('lg-tilting')
        hovered = element
      }
    }
    if (!hovered) return
    const rect = tilted.get(hovered).rect
    const x = clamp((pointer.x - rect.left) / Math.max(1, rect.width), 0, 1)
    const y = clamp((pointer.y - rect.top) / Math.max(1, rect.height), 0, 1)
    const amount = hovered.matches('.card') ? 6.5 : 10
    hovered.style.setProperty('--ll-lg-tilt-x', `${((.5 - y) * amount * 2).toFixed(2)}deg`)
    hovered.style.setProperty('--ll-lg-tilt-y', `${((x - .5) * amount * 2).toFixed(2)}deg`)
    hovered.style.setProperty('--ll-lg-lift', hovered.matches('.card') ? '-4px' : '-2px')
    hovered.style.setProperty('--ll-lg-pointer-x', `${x * rect.width}px`)
    hovered.style.setProperty('--ll-lg-pointer-y', `${y * rect.height}px`)
  }
  const move = event => {
    if (event.pointerType === 'touch') return
    pointer = { x: event.clientX, y: event.clientY, target: event.target }
    if (!frame && canTilt()) frame = requestAnimationFrame(paintPointer)
  }
  const leave = event => { if (!event.relatedTarget) { pointer = undefined; release() } }
  const reset = () => { pointer = undefined; release() }
  const onLayout = () => { reset(); refresh() }
  const onPreferences = () => {
    if (!canTilt()) { release(true); for (const element of [...tilted.keys()]) clearTilt(element) }
    refresh()
  }
  const unsubscribe = preferences.subscribe(onPreferences)
  reduce.addEventListener('change', onPreferences)
  fine.addEventListener('change', onPreferences)
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerout', leave)
  document.addEventListener('pointercancel', reset)
  document.addEventListener('visibilitychange', reset)
  window.addEventListener('blur', reset)
  window.addEventListener('scroll', onLayout, { capture: true, passive: true })
  window.addEventListener('resize', onLayout, { passive: true })
  refresh()
  return {
    refresh,
    dispose() {
      disposed = true
      unsubscribe(); reduce.removeEventListener('change', onPreferences); fine.removeEventListener('change', onPreferences)
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerout', leave)
      document.removeEventListener('pointercancel', reset); document.removeEventListener('visibilitychange', reset)
      window.removeEventListener('blur', reset); window.removeEventListener('scroll', onLayout, true); window.removeEventListener('resize', onLayout)
      if (frame) cancelAnimationFrame(frame)
      if (layoutFrame) cancelAnimationFrame(layoutFrame)
      for (const element of [...tilted.keys()]) clearTilt(element)
      clearMirrors()
    },
  }
}
