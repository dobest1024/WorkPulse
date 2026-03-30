import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  init: () => void
}

function applyTheme(theme: Theme): void {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'system',

  setTheme: (theme: Theme) => {
    window.api.settings.set('theme', theme)
    applyTheme(theme)
    set({ theme })
  },

  init: async () => {
    const saved = (await window.api.settings.get('theme')) as Theme | null
    const theme = saved || 'system'
    applyTheme(theme)
    set({ theme })

    // Listen for OS theme changes when using 'system'
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = useThemeStore.getState().theme
      if (current === 'system') applyTheme('system')
    })
  }
}))
