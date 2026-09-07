import { memo, useMemo, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileText } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'
import { getVisibleCharacters } from '../../utils/bbcode'
import { wrapSelection } from '../../utils/editorActions'
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

  const applyFormat = ({ openTag, closeTag }: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const currentValue = textarea.value
    const scrollTop = textarea.scrollTop
    const result = wrapSelection(
      currentValue,
      textarea.selectionStart,
      textarea.selectionEnd,
      openTag,
      closeTag,
    )

    // Replace only the changed range through the browser's editing command,
    // so formatting is one native undo step alongside normal typing.
    let start = 0
    let suffix = 0
    while (start < currentValue.length && start < result.value.length && currentValue[start] === result.value[start]) start++
    while (suffix < currentValue.length - start && suffix < result.value.length - start &&
      currentValue[currentValue.length - suffix - 1] === result.value[result.value.length - suffix - 1]) suffix++
    const replacement = result.value.slice(start, result.value.length - suffix)
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(start, currentValue.length - suffix)
    try { document.execCommand('insertText', false, replacement) }
    catch { /* Fall back to standard textarea editing when this command is unavailable. */ }
    if (textarea.value !== result.value) {
      textarea.setRangeText(result.value, 0, textarea.value.length, 'end')
    }
    onChange(result.value)
    requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
      textarea.scrollTop = scrollTop
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.nativeEvent.isComposing) return
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
