import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CircleAlert,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from 'lucide-react'
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
  { label: '加粗', icon: Bold, openTag: '[b]', closeTag: '[/b]' },
  { label: '斜体', icon: Italic, openTag: '[i]', closeTag: '[/i]' },
  { label: '下划线', icon: Underline, openTag: '[u]', closeTag: '[/u]' },
  { label: '删除线', icon: Strikethrough, openTag: '[s]', closeTag: '[/s]' },
]

const alignmentTools = [
  { label: '左对齐', icon: AlignLeft, openTag: '[left]', closeTag: '[/left]' },
  { label: '居中', icon: AlignCenter, openTag: '[center]', closeTag: '[/center]' },
  { label: '右对齐', icon: AlignRight, openTag: '[right]', closeTag: '[/right]' },
]

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
      <Icon size={16} strokeWidth={2} />
    </button>
  )
}

export function EditorToolbar({ onFormat }: EditorToolbarProps) {
  const run = (openTag: string, closeTag: string, placeholder?: string) =>
    onFormat({ openTag, closeTag, placeholder })

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="文字格式">
      <select
        className="heading-select"
        aria-label="标题级别"
        defaultValue="body"
        onChange={(event) => {
          const tag = event.target.value
          if (tag !== 'body') run(`[${tag}]`, `[/${tag}]`, '标题')
          event.target.value = 'body'
        }}
      >
        <option value="body">正文</option>
        <option value="h1">标题 1</option>
        <option value="h2">标题 2</option>
        <option value="h3">标题 3</option>
      </select>

      <select
        className="toolbar-select font-select"
        aria-label="字体"
        defaultValue="font"
        onChange={(event) => {
          const font = event.target.value
          if (font !== 'font') run(`[font=${font}]`, '[/font]')
          event.target.value = 'font'
        }}
      >
        <option value="font">字体</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Courier New">等宽</option>
        <option value="Microsoft YaHei">雅黑</option>
      </select>

      <select
        className="toolbar-select size-select"
        aria-label="字号"
        defaultValue="size"
        onChange={(event) => {
          const size = event.target.value
          if (size !== 'size') run(`[size=${size}]`, '[/size]')
          event.target.value = 'size'
        }}
      >
        <option value="size">字号</option>
        {[1, 2, 3, 4, 5, 6, 7].map((size) => <option key={size} value={size}>{size}</option>)}
      </select>

      <span className="tool-divider" />
      {basicTools.map((tool) => (
        <ToolButton
          key={tool.label}
          label={tool.label}
          icon={tool.icon}
          onClick={() => run(tool.openTag, tool.closeTag)}
        />
      ))}
      <span className="tool-divider" />
      {alignmentTools.map((tool) => (
        <ToolButton
          key={tool.label}
          label={tool.label}
          icon={tool.icon}
          onClick={() => run(tool.openTag, tool.closeTag)}
        />
      ))}
      <span className="tool-divider" />
      <ToolButton label="引用" icon={Quote} onClick={() => run('[quote]', '[/quote]', '引用内容')} />
      <ToolButton
        label="提示框"
        icon={CircleAlert}
        onClick={() => run('[notice]', '[/notice]', '提示内容')}
      />
      <ToolButton
        label="链接"
        icon={Link2}
        onClick={() => run('[url=https://example.com]', '[/url]', '链接文字')}
      />
      <ToolButton
        label="无序列表"
        icon={List}
        onClick={() => run('[list]\n[*]', '[/*]\n[*]项目二[/*]\n[/list]', '项目一')}
      />
      <ToolButton
        label="有序列表"
        icon={ListOrdered}
        onClick={() => run('[list=1]\n[*]', '[/*]\n[*]项目二[/*]\n[/list]', '项目一')}
      />
    </div>
  )
}
