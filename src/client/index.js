import { createElement as h, useSyncExternalStore } from 'react'
import { useTheme } from '@luckylillia/plugin-sdk/webui'
import componentCSS from './components.css'
import themeCSS from './theme.css'
import { createTheme, THEME_ID } from './theme.js'
import { createPreferences, preferenceCSS } from './preferences.js'
import { mountThemeScene } from './scene.js'

const options = [
  { key: 'motion', title: '极光流动', copy: '光带、悬浮玻璃与微粒持续流动，鼠标带来轻微视差。' },
  { key: 'tilt', title: '悬停倾斜', copy: '卡片和按钮随鼠标方向倾斜，离开后平滑回正。' },
  { key: 'reflection', title: '水面倒影', copy: '场景映入水中，卡片下方的留白显示内容镜像。' },
  { key: 'opaque', title: '降低透明度', copy: '让卡片更清晰，适合长时间阅读。' },
]

export default function apply(ctx) {
  if (!ctx.theme?.register || !ctx.style) throw new Error('琉光主题需要支持主题插件的新版 LuckyLillia WebUI')
  let storage
  try { storage = window.localStorage } catch { /* Session preferences still work. */ }
  const preferences = createPreferences(storage, window)
  let unsubscribe = () => {}
  let stopScene = () => {}
  let stopLegacyRoute = () => {}
  try {
    const key = `${ctx.plugin.name}|${THEME_ID}`
    const stopTheme = ctx.theme.register(createTheme(ctx.plugin.name, themeCSS))
    stopScene = mountThemeScene(key, preferences)
    const stopStyles = ctx.style('controls', componentCSS, { scope: 'plugin', when: 'loaded' })
    let stopPreferences = ctx.style('preferences', preferenceCSS(key, preferences.getSnapshot()))
    unsubscribe = preferences.subscribe(() => {
      const previous = stopPreferences
      stopPreferences = ctx.style('preferences', preferenceCSS(key, preferences.getSnapshot()))
      previous()
    })

    function AppearanceOptions() {
      const theme = useTheme()
      const value = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot, preferences.getSnapshot)
      if (theme.active !== key) return null
      return h('div', { className: 'lg-inline' }, options.map(option =>
        h('div', { className: 'lg-option', key: option.key },
          h('div', null, h('p', { className: 'lg-option-title' }, option.title), h('p', { className: 'lg-option-copy' }, option.copy)),
          h('button', {
            type: 'button', role: 'switch', 'aria-label': option.title, 'aria-checked': value[option.key],
            className: 'lg-switch', onClick: () => preferences.set({ [option.key]: !value[option.key] }),
          }),
        ),
      ), h('button', { type: 'button', className: 'lg-reset', onClick: () => preferences.reset() }, '恢复琉光外观默认值'))
    }

    ctx.slot('settings.appearance', { id: 'liuguang', label: '琉光外观', component: AppearanceOptions, order: 100 })
    const redirectLegacy = () => {
      if (window.location.hash.slice(1).split('?')[0] === `${ctx.plugin.name}:appearance`) window.location.replace('#webui')
    }
    window.addEventListener('hashchange', redirectLegacy)
    stopLegacyRoute = () => window.removeEventListener('hashchange', redirectLegacy)
    redirectLegacy()
    return () => { stopLegacyRoute(); stopScene(); unsubscribe(); preferences.dispose(); stopPreferences(); stopStyles(); stopTheme() }
  } catch (error) {
    stopLegacyRoute()
    stopScene()
    unsubscribe()
    preferences.dispose()
    throw error
  }
}
