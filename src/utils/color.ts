import type { GradientConfig } from '../types/editor'

interface Rgb {
  r: number
  g: number
  b: number
}

const RAINBOW_STOPS = [
  '#FF5F6D',
  '#FFB86C',
  '#F9F871',
  '#45E0A8',
  '#22D3EE',
  '#6C8CFF',
  '#C084FC',
]

export function normalizeHex(value: string, fallback = '#8B5CF6'): string {
  const clean = value.trim().replace('#', '')
  if (/^[\da-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`.toUpperCase()
  }

  if (/^[\da-fA-F]{6}$/.test(clean)) return `#${clean.toUpperCase()}`
  return fallback
}

function hexToRgb(hex: string): Rgb {
  const safeHex = normalizeHex(hex).slice(1)
  return {
    r: Number.parseInt(safeHex.slice(0, 2), 16),
    g: Number.parseInt(safeHex.slice(2, 4), 16),
    b: Number.parseInt(safeHex.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(value).toString(16).padStart(2, '0').toUpperCase()
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

function mix(from: string, to: string, amount: number): string {
  const start = hexToRgb(from)
  const end = hexToRgb(to)
  return rgbToHex({
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
  })
}

function colorAtStops(stops: string[], progress: number): string {
  if (stops.length === 1) return normalizeHex(stops[0])
  const scaled = Math.min(1, Math.max(0, progress)) * (stops.length - 1)
  const index = Math.min(Math.floor(scaled), stops.length - 2)
  return mix(stops[index], stops[index + 1], scaled - index)
}

function colorAtOffset(config: GradientConfig, progress: number): string {
  const middle = Math.min(0.95, Math.max(0.05, config.middlePosition / 100))
  if (progress <= middle) return mix(config.start, config.middle, progress / middle)
  return mix(config.middle, config.end, (progress - middle) / (1 - middle))
}

export function generateGradientColors(count: number, config: GradientConfig): string[] {
  if (count <= 0) return []

  const getProgress = (index: number) => (count === 1 ? 0 : index / (count - 1))
  const baseStops =
    config.mode === 'rainbow'
      ? RAINBOW_STOPS
      : config.mode === 'three'
        ? [config.start, config.middle, config.end]
        : [config.start, config.end]

  return Array.from({ length: count }, (_, index) => {
    const progress = getProgress(index)

    if (config.mode === 'offset') return colorAtOffset(config, progress)

    if (config.mode === 'mirror') {
      const mirrored = progress <= 0.5 ? progress * 2 : (1 - progress) * 2
      return colorAtStops(baseStops, mirrored)
    }

    return colorAtStops(baseStops, progress)
  })
}

export function getCssGradient(config: GradientConfig): string {
  if (config.mode === 'rainbow') return `linear-gradient(90deg, ${RAINBOW_STOPS.join(', ')})`
  if (config.mode === 'mirror') {
    return `linear-gradient(90deg, ${config.start}, ${config.end}, ${config.start})`
  }
  if (config.mode === 'three') {
    return `linear-gradient(90deg, ${config.start}, ${config.middle}, ${config.end})`
  }
  if (config.mode === 'offset') {
    return `linear-gradient(90deg, ${config.start}, ${config.middle} ${config.middlePosition}%, ${config.end})`
  }
  return `linear-gradient(90deg, ${config.start}, ${config.end})`
}