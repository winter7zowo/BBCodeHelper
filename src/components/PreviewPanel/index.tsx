import { memo, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Code2, Copy, Eye } from 'lucide-react'
import clsx from 'clsx'
import { usePreferences } from '../../context/PreferencesContext'
import { renderBbcode } from '../../utils/bbcode'
import './styles.css'

interface PreviewPanelProps {
  output: string
  onCopied: () => void
  getCopyOutput: () => string
}

type PreviewTab = 'preview' | 'code'

export const PreviewPanel = memo(function PreviewPanel({ output, onCopied, getCopyOutput }: PreviewPanelProps) {
  const { t } = usePreferences()
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview')
  const [copied, setCopied] = useState(false)
  const renderedOutput = useMemo(
    () => activeTab === 'preview' && output ? renderBbcode(output) : null,
    [activeTab, output],
  )

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const copyOutput = async () => {
    const latestOutput = getCopyOutput()
    try {
      await navigator.clipboard.writeText(latestOutput)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = latestOutput
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(true)
    onCopied()
  }

  return (
    <aside className="preview-card surface-card" aria-labelledby="preview-title">
      <div className="preview-card__head">
        <div>
          <h2 id="preview-title">{t('liveResult')}</h2>
        </div>
        <button className={clsx('copy-button', copied && 'is-copied')} type="button" onClick={copyOutput}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? t('copyDone') : t('copyCode')}</span>
        </button>
      </div>

      <div className="preview-tabs" role="tablist" aria-label={t('resultView')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          className={clsx(activeTab === 'preview' && 'is-active')}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={14} />
          {t('preview')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'code'}
          className={clsx(activeTab === 'code' && 'is-active')}
          onClick={() => setActiveTab('code')}
        >
          <Code2 size={14} />
          BBCode
        </button>
      </div>

      <div className="preview-content">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'preview' ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="forum-preview"
            >
              <div className="forum-post">
                <div className="forum-post__content">
                  <div className="rendered-bbcode">
                    {renderedOutput ?? <span className="empty-preview">{t('emptyPreview')}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="code-output-wrap"
            >
              <textarea className="code-output" value={output} readOnly spellCheck={false} aria-label={t('generatedBbcode')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
})
