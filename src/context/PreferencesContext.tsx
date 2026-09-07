import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { translate, type Language, type TranslationKey } from '../i18n'

export type Theme = 'dark' | 'light'
interface Preferences { theme: Theme; language: Language }
interface PreferencesValue extends Preferences {
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'chromacode-preferences-v1'
const PreferencesContext = createContext<PreferencesValue | null>(null)

export function parsePreferences(raw: string | null): Preferences {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const saved = value as Record<string, unknown>
      return {
        theme: saved.theme === 'light' ? 'light' : 'dark',
        language: saved.language === 'en' ? 'en' : 'zh',
      }
    }
  } catch { /* A damaged preference should not prevent opening a draft. */ }
  return { theme: 'dark', language: 'zh' }
}

function loadPreferences(): Preferences {
  try { return parsePreferences(localStorage.getItem(STORAGE_KEY)) }
  catch { return parsePreferences(null) }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadPreferences)
  const { theme, language } = preferences
  const setTheme = useCallback((next: Theme) => setPreferences((current) => ({ ...current, theme: next })), [])
  const setLanguage = useCallback((next: Language) => setPreferences((current) => ({ ...current, language: next })), [])
  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) =>
    translate(language, key, values), [language])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = translate(language, 'pageTitle')
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)) }
    catch { /* Preferences still work when browser storage is unavailable. */ }
  }, [preferences, theme, language])

  const value = useMemo(() => ({ theme, language, setTheme, setLanguage, t }), [theme, language, setTheme, setLanguage, t])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences requires PreferencesProvider')
  return value
}
