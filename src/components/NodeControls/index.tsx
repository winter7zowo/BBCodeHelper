import { useId, useState } from 'react'
import { CircleHelp, Plus, Trash2 } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'
import type { GradientStop } from '../../types/editor'
import { ColorInput } from '../ColorInput'
import './styles.css'

interface NodeControlsProps {
  nodes: GradientStop[]
  selectedId: string
  maxNodes: number
  onSelect: (id: string) => void
  onColorChange: (id: string, color: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function NodeControls({ nodes, selectedId, maxNodes, onSelect, onColorChange, onAdd, onRemove }: NodeControlsProps) {
  const { t } = usePreferences()
  const selectId = useId()
  const helpId = useId()
  const [helpOpen, setHelpOpen] = useState(false)
  const selected = nodes.find((node) => node.id === selectedId)
  const canAdd = nodes.length < maxNodes

  return (
    <div className="node-controls">
      <div className="node-select-field">
        <div className="node-field-heading">
          <label htmlFor={selectId}>{t('nodes')}</label>
          <span className="node-help" onMouseEnter={() => setHelpOpen(true)}
            onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setHelpOpen(false) }}>
            <button type="button" className="node-help-button" aria-label={t('nodeHelp')}
              aria-expanded={helpOpen} aria-controls={helpId} aria-describedby={helpOpen ? helpId : undefined}
              onFocus={() => setHelpOpen(true)} onBlur={() => setHelpOpen(false)}
              onClick={() => setHelpOpen(true)}
              onKeyDown={(event) => { if (event.key === 'Escape') setHelpOpen(false) }}>
              <CircleHelp size={14} aria-hidden="true" />
            </button>
            <span id={helpId} className="node-help-tooltip" role="tooltip" hidden={!helpOpen}>
              {t('nodeHelpText')}
            </span>
          </span>
        </div>
        <select id={selectId} aria-label={t('selectNode')} value={selected?.id ?? ''} disabled={!nodes.length}
          onChange={(event) => onSelect(event.target.value)}>
          {!nodes.length && <option value="">{t('noNodes')}</option>}
          {nodes.map((node, index) => (
            <option key={node.id} value={node.id}>{t('nodeOption', { index: index + 1, position: Math.round(node.position * 10) / 10 })}</option>
          ))}
        </select>
      </div>
      {selected ? (
        <ColorInput label={t('nodeColor')} value={selected.color} onChange={(color) => onColorChange(selected.id, color)} />
      ) : <div />}
      <div className="node-actions">
        <button type="button" aria-label={t('addNode')} title={canAdd ? t('addNodeHint') : t('nodeLimitReached')}
          disabled={!canAdd} onClick={onAdd}><Plus size={15} /></button>
        <button type="button" aria-label={t('deleteNode')} title={t('deleteNodeHint')}
          disabled={nodes.length <= 1} onClick={() => selected && onRemove(selected.id)}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
