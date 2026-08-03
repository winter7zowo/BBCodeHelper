import { useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileText } from 'lucide-react'
import { getVisibleCharacters, wrapSelection } from '../../utils/bbcode'
import { EditorToolbar, type FormatAction } from '../EditorToolbar'
import './styles.css'

interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
}

export function EditorPanel({ value, onChange }: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const visibleCount = getVisibleCharacters(value).length

  const applyFormat = ({ openTag, closeTag, placeholder }: FormatAction) => {
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
          <h2 id="editor-title">编辑内容</h2>
        </div>
        <span className="character-count">
          <FileText size={13} />
          {visibleCount} 字
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
          aria-label="BBCode 内容"
          placeholder="输入文字，或使用工具栏添加格式…"
        />
      </div>
    </section>
  )
}
