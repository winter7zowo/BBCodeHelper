import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { usePreferences } from '../../context/PreferencesContext'
import type { GradientConfig, GradientStop } from '../../types/editor'
import { getCssGradient } from '../../utils/color'
import { useRafCallback } from '../../hooks/useRafCallback'
import './styles.css'

interface GradientTrackProps {
  config: GradientConfig
  stops: GradientStop[]
  selectedId: string
  onSelect: (id: string) => void
  onMove: (id: string, position: number) => void
  onAdd: (position: number) => void
  onRemove: (id: string) => void
}

interface TrackDrag { id: string; pointerId: number; bounds: DOMRect; originX: number; moved: boolean }

export function GradientTrack({ config, stops, selectedId, onSelect, onMove, onAdd, onRemove }: GradientTrackProps) {
  const { t } = usePreferences()
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<TrackDrag | null>(null)
  const isEditable = config.mode === 'offset'
  const move = useRafCallback(onMove)

  const positionAt = (clientX: number, bounds: DOMRect) =>
    Math.round(Math.min(100, Math.max(0, (clientX - bounds.left) / bounds.width * 100)) * 10) / 10

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isEditable || !stops.length || event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-stop-id]')
    const position = positionAt(event.clientX, bounds)
    const nearest = stops.reduce((best, stop) =>
      Math.abs(stop.position - position) < Math.abs(best.position - position) ? stop : best)
    const id = target?.dataset.stopId ?? nearest.id
    onSelect(id)
    target?.focus({ preventScroll: true })
    drag.current = { id, pointerId: event.pointerId, bounds, originX: event.clientX, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    // A double-click adds a node without first moving an existing one.
    if (!current.moved && Math.abs(event.clientX - current.originX) < 2) return
    current.moved = true
    move.schedule(current.id, positionAt(event.clientX, current.bounds))
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    if (event.type === 'pointerup' && current.moved) {
      move.schedule(current.id, positionAt(event.clientX, current.bounds))
    }
    move.flush()
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, stop: GradientStop) => {
    const step = event.shiftKey ? 10 : 1
    const positions: Record<string, number> = {
      ArrowLeft: stop.position - step, ArrowRight: stop.position + step, Home: 0, End: 100,
    }
    if (event.key in positions) {
      event.preventDefault()
      onMove(stop.id, positions[event.key])
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onRemove(stop.id)
    }
  }

  return (
    <div className="gradient-track">
      <div ref={trackRef} className={`gradient-track__bar${isEditable ? ' is-draggable' : ''}`}
        style={{ background: getCssGradient(config) }}
        title={isEditable ? t('gradientTrackHint') : undefined}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
        onDoubleClick={(event) => {
          if (!isEditable || (event.target as HTMLElement).closest('[data-stop-id]')) return
          const bounds = trackRef.current?.getBoundingClientRect()
          if (bounds?.width) onAdd(positionAt(event.clientX, bounds))
        }}>
        {stops.map((stop, index) => isEditable ? (
          <button key={stop.id} type="button" role="slider" data-stop-id={stop.id}
            className={`gradient-stop is-draggable${stop.id === selectedId ? ' is-selected' : ''}`}
            style={{ left: `${stop.position}%`, backgroundColor: stop.color }}
            aria-label={t('nodePosition', { index: index + 1 })} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={stop.position} aria-valuetext={`${stop.position}%`}
            onFocus={() => onSelect(stop.id)} onKeyDown={(event) => handleKeyDown(event, stop)}>
            {stop.id === selectedId && <span>{Math.round(stop.position * 10) / 10}%</span>}
          </button>
        ) : (
          <span key={stop.id} className="gradient-stop" style={{ left: `${stop.position}%`, backgroundColor: stop.color }} />
        ))}
      </div>
      {stops.length > 0 && (
        <div className="gradient-track__values">
          <span>{stops[0].color}</span>
          {stops.length > 1 && <span>{stops[stops.length - 1].color}</span>}
        </div>
      )}
    </div>
  )
}
