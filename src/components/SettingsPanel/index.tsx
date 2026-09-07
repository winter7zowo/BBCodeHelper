import { useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Contrast, Settings } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'
import './styles.css'

export function SettingsPanel() {
  const { theme, language, setTheme, setLanguage, t } = usePreferences()
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const controlsId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const languageLabel = t(language === 'zh' ? 'switchToEnglish' : 'switchToChinese')
  const themeLabel = t(theme === 'dark' ? 'switchToLight' : 'switchToDark')

  return (
    <div className="settings-rail" role="group" aria-label={t('settings')}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          setOpen(false)
          triggerRef.current?.focus()
        }
      }}>
      <div id={controlsId} className={`settings-shortcuts${open ? ' is-open' : ''}`}
        aria-hidden={!open}>
        <button type="button" className="settings-rail__button settings-language"
          aria-label={languageLabel} title={languageLabel} tabIndex={open ? 0 : -1}
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}>
          <span lang={language === 'zh' ? 'en' : 'zh-CN'} aria-hidden="true">{language === 'zh' ? 'EN' : '中'}</span>
        </button>
        <button type="button" className="settings-rail__button" aria-label={themeLabel} title={themeLabel}
          tabIndex={open ? 0 : -1} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Contrast size={20} aria-hidden="true" />
        </button>
      </div>
      <button ref={triggerRef} type="button" className="settings-rail__button settings-trigger"
        aria-label={t('settings')} title={t(open ? 'closeSettings' : 'settings')}
        aria-expanded={open} aria-controls={controlsId} onClick={() => setOpen((current) => !current)}>
        <motion.span className="settings-gear" animate={{ rotate: reduceMotion ? 0 : open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeInOut' }}>
          <Settings size={21} aria-hidden="true" />
        </motion.span>
      </button>
    </div>
  )
}
