import { memo, useMemo, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileText } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'
import { getVisibleCharacters, wrapSelection } from '../../utils/bbcode'
import { EditorToolbar, type FormatAction } from '../EditorToolbar'
import './styles.css'

interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
}

export const EditorPanel = memo(function EditorPanel({ value, onChange }: EditorPanelProps) {
  const { t } = usePreferences()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const visibleCount = useMemo(() => getVisibleCharacters(value).length, [value])

  const applyFormat = ({ openTag, closeTag, placeholder = t('text') }: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const result = wrapSelection(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      openTag,
      closeTag,
      placeholder,
    )
    onChange(result.value)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return
    const shortcut = event.key.toLowerCase()
    const actions: Record<string, FormatAction> = {
      b: { openTag: '[b]', closeTag: '[/b]' },
      i: { openTag: '[i]', closeTag: '[/i]' },
      u: { openTag: '[u]', closeTag: '[/u]' },
    }
    if (!actions[shortcut]) return
    event.preventDefault()
    applyFormat(actions[shortcut])
  }

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)

  return (
    <section className="editor-card surface-card" aria-labelledby="editor-title">
      <div className="section-heading editor-heading">
        <div>
          <h2 id="editor-title">{t('editContent')}</h2>
        </div>
        <span className="character-count">
          <FileText size={13} />
          {t('characterCount', { count: visibleCount })}
        </span>
      </div>

      <div className="editor-shell">
        <EditorToolbar onFormat={applyFormat} />
        <textarea
          ref={textareaRef}
          className="source-editor"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          aria-label={t('bbcodeContent')}
          placeholder={t('editorPlaceholder')}
        />
      </div>
    </section>
  )
})
