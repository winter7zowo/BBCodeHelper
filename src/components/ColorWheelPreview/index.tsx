import { useRef, type PointerEvent } from 'react'
import { motion } from 'framer-motion'
import type { GradientConfig } from '../../types/editor'
import { normalizeHex } from '../../utils/color'
import './styles.css'

type ColorStop = 'start' | 'middle' | 'end'

interface ColorWheelPreviewProps {
  config: GradientConfig
  onColorChange: (stop: ColorStop, color: string) => void
}

interface HsvPoint {
  x: number
  y: number
  hue: number
  saturation: number
  value: number
}

function getHsvPoint(hex: string): HsvPoint {
  const normalized = normalizeHex(hex).slice(1)
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const saturation = max === 0 ? 0 : delta / max
  let hue = 0

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  return {
    x: (hue / 360) * 100,
    y: (1 - saturation) * 100,
    hue,
    saturation,
    value: max,
  }
}

function hsvToHex(hue: number, saturation: number, value: number): string {
  const chroma = value * saturation
  const section = hue / 60
  const secondary = chroma * (1 - Math.abs((section % 2) - 1))
  const offset = value - chroma
  let red = 0
  let green = 0
  let blue = 0

  if (section < 1) [red, green, blue] = [chroma, secondary, 0]
  else if (section < 2) [red, green, blue] = [secondary, chroma, 0]
  else if (section < 3) [red, green, blue] = [0, chroma, secondary]
  else if (section < 4) [red, green, blue] = [0, secondary, chroma]
  else if (section < 5) [red, green, blue] = [secondary, 0, chroma]
  else [red, green, blue] = [chroma, 0, secondary]

  const channel = (number: number) =>
    Math.round((number + offset) * 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${channel(red)}${channel(green)}${channel(blue)}`
}

function PlaneMarker({
  point,
  color,
  label,
  onMove,
}: {
  point: HsvPoint
  color: string
  label: string
  onMove: (clientX: number, clientY: number) => void
}) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    onMove(event.clientX, event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      onMove(event.clientX, event.clientY)
    }
  }

  return (
    <motion.button
      type="button"
      className="color-space__marker"
      aria-label={label}
      animate={{ left: `${point.x}%`, top: `${point.y}%` }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      style={{ backgroundColor: color }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    />
  )
}

function ValueMarker({
  className,
  point,
  color,
  label,
  onMove,
}: {
  className: string
  point: HsvPoint
  color: string
  label: string
  onMove: (clientY: number) => void
}) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    onMove(event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) onMove(event.clientY)
  }

  return (
    <motion.button
      type="button"
      className={`value-space__marker ${className}`}
      aria-label={label}
      animate={{ top: `${(1 - point.value) * 100}%` }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      style={{ backgroundColor: color }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    />
  )
}

export function ColorWheelPreview({ config, onColorChange }: ColorWheelPreviewProps) {
  const colorSpaceRef = useRef<HTMLDivElement>(null)
  const valueSpaceRef = useRef<HTMLDivElement>(null)
  const start = getHsvPoint(config.start)
  const middle = getHsvPoint(config.middle)
  const end = getHsvPoint(config.end)
  const hasMiddle = config.mode === 'three' || config.mode === 'offset'

  const updatePlane = (stop: ColorStop, point: HsvPoint, clientX: number, clientY: number) => {
    const bounds = colorSpaceRef.current?.getBoundingClientRect()
    if (!bounds) return
    const horizontal = Math.min(0.9999, Math.max(0, (clientX - bounds.left) / bounds.width))
    const vertical = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height))
    onColorChange(stop, hsvToHex(horizontal * 360, 1 - vertical, point.value))
  }

  const updateValue = (stop: ColorStop, point: HsvPoint, clientY: number) => {
    const bounds = valueSpaceRef.current?.getBoundingClientRect()
    if (!bounds) return
    const vertical = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height))
    onColorChange(stop, hsvToHex(point.hue, point.saturation, 1 - vertical))
  }

  return (
    <div className="color-space-preview" aria-label="颜色的 HSV 位置">
      <div ref={colorSpaceRef} className="color-space">
        <svg className="color-space__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="color-link-start" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={config.start} />
              <stop offset="1" stopColor={hasMiddle ? config.middle : config.end} />
            </linearGradient>
            <linearGradient id="color-link-end" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={config.middle} />
              <stop offset="1" stopColor={config.end} />
            </linearGradient>
          </defs>
          <motion.line
            animate={{
              x1: start.x,
              y1: start.y,
              x2: hasMiddle ? middle.x : end.x,
              y2: hasMiddle ? middle.y : end.y,
            }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            stroke="url(#color-link-start)"
            strokeWidth="1.6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {hasMiddle && (
            <motion.line
              animate={{ x1: middle.x, y1: middle.y, x2: end.x, y2: end.y }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              stroke="url(#color-link-end)"
              strokeWidth="1.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <PlaneMarker
          point={start}
          color={config.start}
          label="拖动起始颜色"
          onMove={(x, y) => updatePlane('start', start, x, y)}
        />
        {hasMiddle && (
          <PlaneMarker
            point={middle}
            color={config.middle}
            label="拖动中间颜色"
            onMove={(x, y) => updatePlane('middle', middle, x, y)}
          />
        )}
        <PlaneMarker
          point={end}
          color={config.end}
          label="拖动结束颜色"
          onMove={(x, y) => updatePlane('end', end, x, y)}
        />
      </div>

      <div ref={valueSpaceRef} className={`value-space${hasMiddle ? ' has-middle' : ''}`}>
        <span style={{ background: `linear-gradient(to bottom, hsl(${start.hue} 100% 50%), #000)` }} />
        {hasMiddle && (
          <span style={{ background: `linear-gradient(to bottom, hsl(${middle.hue} 100% 50%), #000)` }} />
        )}
        <span style={{ background: `linear-gradient(to bottom, hsl(${end.hue} 100% 50%), #000)` }} />
        <ValueMarker
          className="is-start"
          point={start}
          color={config.start}
          label="拖动起始颜色明度"
          onMove={(y) => updateValue('start', start, y)}
        />
        {hasMiddle && (
          <ValueMarker
            className="is-middle"
            point={middle}
            color={config.middle}
            label="拖动中间颜色明度"
            onMove={(y) => updateValue('middle', middle, y)}
          />
        )}
        <ValueMarker
          className="is-end"
          point={end}
          color={config.end}
          label="拖动结束颜色明度"
          onMove={(y) => updateValue('end', end, y)}
        />
      </div>
    </div>
  )
}