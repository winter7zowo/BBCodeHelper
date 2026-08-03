import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Code2, Copy, Eye } from 'lucide-react'
import clsx from 'clsx'
import { renderBbcode } from '../../utils/bbcode'
import './styles.css'

interface PreviewPanelProps {
  output: string
  onCopied: () => void
}

type PreviewTab = 'preview' | 'code'

export function PreviewPanel({ output, onCopied }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = output
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
          <h2 id="preview-title">实时结果</h2>
        </div>
        <button className={clsx('copy-button', copied && 'is-copied')} type="button" onClick={copyOutput}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? '已复制' : '复制代码'}</span>
        </button>
      </div>

      <div className="preview-tabs" role="tablist" aria-label="结果视图">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          className={clsx(activeTab === 'preview' && 'is-active')}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={14} />
          预览
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
                    {output ? renderBbcode(output) : <span className="empty-preview">预览将在这里显示</span>}
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
              <textarea className="code-output" value={output} readOnly spellCheck={false} aria-label="生成的 BBCode" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
