import { create } from 'zustand'
import {
  interpolate,
  resolveSystemLanguage,
  translations,
  type AppLanguage,
  type ResolvedLanguage,
  type TranslationKey
} from '../lib/i18n'

interface LanguageStore {
  language: AppLanguage
  resolvedLanguage: ResolvedLanguage
  init: () => Promise<void>
  setLanguage: (language: AppLanguage) => Promise<void>
}

function resolveLanguage(language: AppLanguage): ResolvedLanguage {
  return language === 'system' ? resolveSystemLanguage(navigator.language) : language
}

function applyLanguage(language: AppLanguage): ResolvedLanguage {
  const resolved = resolveLanguage(language)
  document.documentElement.lang = resolved === 'zh' ? 'zh-CN' : 'en'
  return resolved
}

export function translate(
  language: ResolvedLanguage,
  key: TranslationKey,
  values?: Record<string, string | number>
): string {
  const template = translations[language][key] ?? translations.en[key]
  return interpolate(template, values)
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: 'system',
  resolvedLanguage: resolveLanguage('system'),

  init: async () => {
    const saved = (await window.api.settings.get('app_language')) as AppLanguage | null
    const language: AppLanguage = saved === 'zh' || saved === 'en' || saved === 'system'
      ? saved
      : 'system'
    const resolvedLanguage = applyLanguage(language)
    set({ language, resolvedLanguage })
  },

  setLanguage: async (language) => {
    await window.api.app.setLanguage(language)
    const resolvedLanguage = applyLanguage(language)
    set({ language, resolvedLanguage })
  }
}))

export function useI18n(): {
  language: AppLanguage
  resolvedLanguage: ResolvedLanguage
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
} {
  const language = useLanguageStore((s) => s.language)
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage)
  return {
    language,
    resolvedLanguage,
    t: (key, values) => translate(resolvedLanguage, key, values)
  }
}
