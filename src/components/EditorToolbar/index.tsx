import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CircleAlert,
  Heading,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'
import './styles.css'

export interface FormatAction {
  openTag: string
  closeTag: string
  placeholder?: string
}

interface EditorToolbarProps {
  onFormat: (action: FormatAction) => void
}

const basicTools = [
  { labelKey: 'bold', icon: Bold, openTag: '[b]', closeTag: '[/b]' },
  { labelKey: 'italic', icon: Italic, openTag: '[i]', closeTag: '[/i]' },
  { labelKey: 'underline', icon: Underline, openTag: '[u]', closeTag: '[/u]' },
  { labelKey: 'strikethrough', icon: Strikethrough, openTag: '[s]', closeTag: '[/s]' },
] as const

const alignmentTools = [
  { labelKey: 'alignLeft', icon: AlignLeft, openTag: '[left]', closeTag: '[/left]' },
  { labelKey: 'alignCenter', icon: AlignCenter, openTag: '[centre]', closeTag: '[/centre]' },
  { labelKey: 'alignRight', icon: AlignRight, openTag: '[right]', closeTag: '[/right]' },
] as const

function ToolButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Bold
  onClick: () => void
}) {
  return (
    <button className="tool-button" type="button" aria-label={label} title={label} onClick={onClick}>
      <Icon size={18} strokeWidth={2} />
    </button>
  )
}

export function EditorToolbar({ onFormat }: EditorToolbarProps) {
  const { t } = usePreferences()
  const run = (openTag: string, closeTag: string, placeholder?: string) =>
    onFormat({ openTag, closeTag, placeholder })

  return (
    <div className="editor-toolbar" role="toolbar" aria-label={t('textFormatting')}>
      <ToolButton label={t('heading')} icon={Heading} onClick={() => run('[heading]', '[/heading]', t('heading'))} />

      <select
        className="toolbar-select size-select"
        aria-label={t('fontSize')}
        defaultValue="size"
        onChange={(event) => {
          const size = event.target.value
          if (size !== 'size') run(`[size=${size}]`, '[/size]')
          event.target.value = 'size'
        }}
      >
        <option value="size">{t('fontSize')}</option>
        {[50, 85, 100, 150, 200].map((size) => <option key={size} value={size}>{size}%</option>)}
      </select>

      <span className="tool-divider" />
      {basicTools.map((tool) => (
        <ToolButton
          key={tool.labelKey}
          label={t(tool.labelKey)}
          icon={tool.icon}
          onClick={() => run(tool.openTag, tool.closeTag)}
        />
      ))}
      <span className="tool-divider" />
      {alignmentTools.map((tool) => (
        <ToolButton
          key={tool.labelKey}
          label={t(tool.labelKey)}
          icon={tool.icon}
          onClick={() => run(tool.openTag, tool.closeTag)}
        />
      ))}
      <span className="tool-divider" />
      <ToolButton label={t('quote')} icon={Quote} onClick={() => run('[quote]', '[/quote]', t('quoteContent'))} />
      <ToolButton
        label={t('notice')}
        icon={CircleAlert}
        onClick={() => run('[notice]', '[/notice]', t('noticeContent'))}
      />
      <ToolButton
        label={t('link')}
        icon={Link2}
        onClick={() => run('[url=https://example.com]', '[/url]', t('linkText'))}
      />
      <ToolButton
        label={t('unorderedList')}
        icon={List}
        onClick={() => run('[list]\n[*]', `\n[*]${t('secondListItem')}\n[/list]`, t('firstListItem'))}
      />
      <ToolButton
        label={t('orderedList')}
        icon={ListOrdered}
        onClick={() => run('[list=1]\n[*]', `\n[*]${t('secondListItem')}\n[/list]`, t('firstListItem'))}
      />
    </div>
  )
}
