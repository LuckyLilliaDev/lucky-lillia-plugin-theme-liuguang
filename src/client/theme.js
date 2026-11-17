export const THEME_ID = 'liuguang'
export const THEME_TITLE = '琉光'

const shared = {
  '--r-window': '28px', '--r-panel': '24px', '--r-card': '22px', '--r-control': '14px',
  '--r-inner': '10px', '--r-capsule': '999px',
  '--glass-blur-regular': '14px', '--glass-blur-thick': '28px', '--glass-blur-clear': '6px',
  '--glass-saturate': '145%', '--glass-brightness': '1',
  '--ease-glass': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--dur-fast': '170ms', '--dur-base': '280ms', '--dur-slow': '480ms',
}

export const dark = {
  tokens: {
    ...shared,
    '--accent': '#addde4', '--accent-strong': '#c7eef0',
    '--accent-from': '#315d77', '--accent-to': '#5a5c8f',
    '--accent-soft': 'rgba(140, 202, 220, 0.12)', '--accent-ring': 'rgba(155, 206, 223, 0.24)',
    '--text-primary': '#f1f9ff', '--text-secondary': '#d4e3f3', '--text-muted': '#b5cbe0', '--text-hint': '#95b2ca',
    '--glass-tint': '19 29 46',
    '--ll-lg-mirror-alpha': '.42',
    '--glass-alpha-clear': '0.3',
    '--glass-alpha-regular': 'var(--ll-lg-solid, 0.34)',
    '--glass-alpha-card': 'var(--ll-lg-solid, 0.44)',
    '--glass-alpha-thick': 'var(--ll-lg-solid, 0.95)',
    '--glass-alpha-raised': 'var(--ll-lg-solid, 0.48)',
    '--glass-alpha-dense': '0.98', '--glass-alpha-bar': 'var(--ll-lg-solid, 0.56)',
    '--spec-top': 'rgba(207, 248, 255, 0.65)', '--spec-side': 'rgba(163, 220, 239, 0.27)',
    '--spec-bottom': 'rgba(173, 155, 236, 0.3)', '--edge-shade': 'rgba(2, 8, 20, 0.42)',
    '--lens-top': 'rgba(218, 252, 255, 0.3)', '--lens-bottom': 'rgba(139, 201, 217, 0.13)',
    '--lens-depth': 'rgba(0, 4, 14, 0.22)',
    '--shade': '2 6 17', '--shade-alpha-near': '0.2', '--shade-alpha-far': '0.3',
    '--fill-quiet': 'rgba(194, 218, 255, 0.055)', '--fill-quiet-hover': 'rgba(194, 218, 255, 0.1)',
    '--fill-input': 'rgba(176, 204, 242, 0.07)', '--fill-selected': 'rgba(137, 190, 211, 0.13)',
    '--hairline': 'rgba(170, 200, 240, 0.1)',
    '--ll-lg-aurora-a': 'rgba(55, 136, 160, 0.45)',
    '--ll-lg-page-base': '#0d1627',
    '--ll-lg-aurora-b': 'rgba(115, 88, 174, 0.4)',
    '--ll-lg-aurora-c': 'rgba(173, 111, 145, 0.22)',
    '--ll-lg-horizon': 'rgba(96, 130, 180, 0.15)',
    '--ll-lg-wave': 'rgba(151, 194, 229, 0.12)',
  },
  background: 'linear-gradient(150deg, #0b1322 0%, #111b30 48%, #111d2d 100%)',
}

// Liuguang deliberately keeps its night palette in every host mode.
export const light = dark

export function createTheme(owner, css) {
  return {
    id: THEME_ID, title: THEME_TITLE,
    description: '流动光带、折射玻璃与实时水面倒影。亮暗模式统一使用深色极光。',
    light, dark,
    css: `@scope (:root[data-llbot-theme=${JSON.stringify(`${owner}|${THEME_ID}`)}]) {\n${css}\n}`,
  }
}
