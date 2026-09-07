import { Github, RotateCcw, Sparkles } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'
import './styles.css'

interface HeaderProps {
  onReset: () => void
}

export function Header({ onReset }: HeaderProps) {
  const { t } = usePreferences()
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <Sparkles size={18} strokeWidth={2.2} />
        </span>
        <span className="brand__name">BBCode Helper</span>
        <span className="brand__divider" />
        <span className="brand__product">{t('editorProduct')}</span>
      </div>

      <div className="header-actions">
        <a
          className="header-action header-action--icon"
          href="https://github.com/winter7zowo/BBCodeHelper"
          target="_blank"
          rel="noreferrer noopener"
          aria-label={t('githubRepository')}
          title={t('githubRepository')}
        >
          <Github size={18} aria-hidden="true" />
        </a>
        <button className="header-action" type="button" aria-label={t('reset')} onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          <span>{t('reset')}</span>
        </button>
      </div>
    </header>
  )
}
