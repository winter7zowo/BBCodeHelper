import { RotateCcw, Sparkles } from 'lucide-react'
import './styles.css'

interface HeaderProps {
  onReset: () => void
}

export function Header({ onReset }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <Sparkles size={18} strokeWidth={2.2} />
        </span>
        <span className="brand__name">ChromaCode</span>
        <span className="brand__divider" />
        <span className="brand__product">BBCode 编辑器</span>
      </div>

      <button className="header-action" type="button" onClick={onReset}>
        <RotateCcw size={15} />
        <span>重置</span>
      </button>
    </header>
  )
}
