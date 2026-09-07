import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { usePreferences } from '../../context/PreferencesContext'
import type { GradientStop } from '../../types/editor'
import { getHsvPoint, hsvToHex, type HsvPoint } from '../../utils/hsv'
import { useRafCallback } from '../../hooks/useRafCallback'
import './styles.css'

interface ColorWheelPreviewProps {
  stops: GradientStop[]
  selectedId: string
  onSelect: (id: string) => void
  onColorChange: (id: string, color: string) => void
}

interface ColorDrag { id: string; pointerId: number; kind: 'plane' | 'value'; bounds: DOMRect; point: HsvPoint; moved: boolean }
interface ColorDraft { id: string; color: string; point: HsvPoint }

export function ColorWheelPreview({ stops, selectedId, onSelect, onColorChange }: ColorWheelPreviewProps) {
  const { t } = usePreferences()
  const gradientId = useId().replace(/:/g, '')
  const drag = useRef<ColorDrag | null>(null)
  // Preserve exact HSV while dragging, including hue/saturation hidden by black or white.
  const [draft, setDraft] = useState<ColorDraft | null>(null)
  const points = stops.map((stop) => ({
    ...stop,
    point: draft?.id === stop.id && draft.color === stop.color ? draft.point : getHsvPoint(stop.color),
  }))
  const selected = points.find((stop) => stop.id === selectedId) ?? points[0]

  const commitPoint = (id: string, point: HsvPoint) => {
    const color = hsvToHex(point.hue, point.saturation, point.value)
    setDraft({ id, point, color })
    onColorChange(id, color)
  }

  const move = useRafCallback((clientX: number, clientY: number) => {
    const current = drag.current
    if (!current) return
    const { bounds, point } = current
    const y = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height))
    if (current.kind === 'value') {
      commitPoint(current.id, { ...point, value: 1 - y })
    } else {
      const x = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width))
      commitPoint(current.id, { ...point, x: x * 100, y: y * 100, hue: x * 360, saturation: 1 - y })
    }
  })

  const startDrag = (event: PointerEvent<HTMLDivElement>, kind: ColorDrag['kind']) => {
    if (!selected || event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-color-id]')
    const stop = points.find((item) => item.id === target?.dataset.colorId) ?? selected
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    onSelect(stop.id)
    target?.focus({ preventScroll: true })
    drag.current = { id: stop.id, pointerId: event.pointerId, kind, bounds, point: stop.point, moved: !target }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!target) move.schedule(event.clientX, event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current.moved = true
      move.schedule(event.clientX, event.clientY)
    }
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    // Release can include a newer sample than pointermove; a handle click must not shift its color.
    if (event.type === 'pointerup' && drag.current.moved) move.schedule(event.clientX, event.clientY)
    move.flush()
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handlePlaneKey = (event: KeyboardEvent<HTMLButtonElement>, id: string, point: HsvPoint) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const step = event.shiftKey ? 10 : 1
    const hue = Math.min(360, Math.max(0, point.hue + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)))
    const saturation = Math.min(1, Math.max(0, point.saturation + (event.key === 'ArrowUp' ? step / 100 : event.key === 'ArrowDown' ? -step / 100 : 0)))
    commitPoint(id, { ...point, hue, saturation, x: hue / 360 * 100, y: (1 - saturation) * 100 })
  }

  return (
    <div className="color-space-preview" aria-label={t('hsvPosition')}>
      <div className="color-space" onPointerDown={(event) => startDrag(event, 'plane')}
        onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
        <svg className="color-space__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {points.slice(1).map((stop, index) => {
            const from = points[index]
            const id = `${gradientId}-${index}`
            return (
              <g key={`${from.id}-${stop.id}`}>
                <defs>
                  <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={from.point.x} y1={from.point.y} x2={stop.point.x} y2={stop.point.y}>
                    <stop offset="0" stopColor={from.color} /><stop offset="1" stopColor={stop.color} />
                  </linearGradient>
                </defs>
                <line x1={from.point.x} y1={from.point.y} x2={stop.point.x} y2={stop.point.y}
                  stroke={`url(#${id})`} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
            )
          })}
        </svg>
        {points.map((stop, index) => (
          <button key={stop.id} type="button" data-color-id={stop.id}
            className={`color-space__marker${selected?.id === stop.id ? ' is-selected' : ''}`}
            aria-label={t('indexedNodeColor', { index: index + 1 })} aria-pressed={selected?.id === stop.id}
            style={{ left: `${stop.point.x}%`, top: `${stop.point.y}%`, backgroundColor: stop.color }}
            onFocus={() => onSelect(stop.id)} onKeyDown={(event) => handlePlaneKey(event, stop.id, stop.point)} />
        ))}
      </div>
      <div className="value-space" style={{ background: selected ? `linear-gradient(to bottom, ${hsvToHex(selected.point.hue, selected.point.saturation, 1)}, #000)` : '#181820' }}
        onPointerDown={(event) => startDrag(event, 'value')}
        onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
        {selected && (
          <button type="button" className="value-space__marker" data-color-id={selected.id}
            role="slider" aria-label={t('selectedNodeBrightness')} aria-orientation="vertical"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(selected.point.value * 100)}
            style={{ top: `${(1 - selected.point.value) * 100}%`, backgroundColor: selected.color }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 0.1 : 0.01
              const values: Record<string, number> = { ArrowUp: selected.point.value + step, ArrowDown: selected.point.value - step, Home: 0, End: 1 }
              if (!(event.key in values)) return
              event.preventDefault()
              commitPoint(selected.id, { ...selected.point, value: Math.min(1, Math.max(0, values[event.key])) })
            }} />
        )}
      </div>
    </div>
  )
}
