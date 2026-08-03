import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { GradientConfig } from '../../types/editor'
import { getCssGradient } from '../../utils/color'
import './styles.css'

interface GradientTrackProps {
  config: GradientConfig
  onMiddlePositionChange: (position: number) => void
}

const clampPosition = (position: number) => Math.min(95, Math.max(5, Math.round(position)))

export function GradientTrack({ config, onMiddlePositionChange }: GradientTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const hasMiddle = config.mode === 'three' || config.mode === 'offset'
  const isMirror = config.mode === 'mirror'
  const isRainbow = config.mode === 'rainbow'
  const middlePosition = config.mode === 'offset' ? config.middlePosition : 50

  const updateFromPointer = (clientX: number) => {
    const bounds = trackRef.current?.getBoundingClientRect()
    if (!bounds) return
    onMiddlePositionChange(clampPosition(((clientX - bounds.left) / bounds.width) * 100))
  }

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (config.mode !== 'offset' || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event.clientX)
  }

  const handleTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (config.mode === 'offset' && event.currentTarget.hasPointerCapture(event.pointerId)) {
      updateFromPointer(event.clientX)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    onMiddlePositionChange(
      clampPosition(config.middlePosition + (event.key === 'ArrowLeft' ? -1 : 1)),
    )
  }

  return (
    <div className="gradient-track">
      <div
        ref={trackRef}
        className={`gradient-track__bar${config.mode === 'offset' ? ' is-draggable' : ''}`}
        style={{ background: getCssGradient(config) }}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
      >
        {!isRainbow && (
          <span
            className="gradient-stop is-start"
            style={{ backgroundColor: config.start }}
            aria-label="起始颜色"
          />
        )}
        {isMirror && (
          <span
            className="gradient-stop is-middle"
            style={{ left: '50%', backgroundColor: config.end }}
            aria-label="镜像中心颜色"
          />
        )}
        {!isMirror && hasMiddle &&
          (config.mode === 'offset' ? (
            <button
              type="button"
              className="gradient-stop is-middle is-draggable"
              style={{ left: `${middlePosition}%`, backgroundColor: config.middle }}
              aria-label={`中间颜色位置 ${middlePosition}%`}

              onKeyDown={handleKeyDown}
            >
              <span>{middlePosition}%</span>
            </button>
          ) : (
            <span
              className="gradient-stop is-middle"
              style={{ left: '50%', backgroundColor: config.middle }}
              aria-label="中间颜色"
            />
          ))}
        {!isRainbow && (
          <span
            className="gradient-stop is-end"
            style={{ backgroundColor: isMirror ? config.start : config.end }}
            aria-label="结束颜色"
          />
        )}
      </div>
      {!isRainbow && (
        <div className={`gradient-track__values${isMirror ? ' has-three' : ''}`}>
          <span>{config.start}</span>
          {isMirror && <span>{config.end}</span>}
          <span>{isMirror ? config.start : config.end}</span>
        </div>
      )}
    </div>
  )
}
