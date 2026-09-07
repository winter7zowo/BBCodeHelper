import type { GradientConfig } from '../types/editor'
import { mix, normalizeHex } from './colorMath'
import { getOffsetNodes, sampleNodeColor } from './gradientNodes'

export { normalizeHex } from './colorMath'

const RAINBOW_STOPS = [
  '#FF5F6D',
  '#FFB86C',
  '#F9F871',
  '#45E0A8',
  '#22D3EE',
  '#6C8CFF',
  '#C084FC',
]

function colorAtStops(stops: string[], progress: number): string {
  if (stops.length === 1) return normalizeHex(stops[0])
  const scaled = Math.min(1, Math.max(0, progress)) * (stops.length - 1)
  const index = Math.min(Math.floor(scaled), stops.length - 2)
  return mix(stops[index], stops[index + 1], scaled - index)
}

export function generateGradientColors(count: number, config: GradientConfig): string[] {
  if (count <= 0) return []

  const getProgress = (index: number) => (count === 1 ? 0 : index / (count - 1))
  const offsetNodes = config.mode === 'offset' ? getOffsetNodes(config) : []
  const baseStops =
    config.mode === 'rainbow'
      ? RAINBOW_STOPS
      : config.mode === 'three'
        ? [config.start, config.middle, config.end]
        : [config.start, config.end]

  return Array.from({ length: count }, (_, index) => {
    const progress = getProgress(index)

    if (config.mode === 'offset') return sampleNodeColor(offsetNodes, progress * 100, config.start)

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
    const nodes = getOffsetNodes(config)
    if (nodes.length <= 1) {
      const color = sampleNodeColor(nodes, 0, config.start)
      return `linear-gradient(90deg, ${color}, ${color})`
    }
    return `linear-gradient(90deg, ${nodes.map((node) => `${node.color} ${node.position}%`).join(', ')})`
  }
  return `linear-gradient(90deg, ${config.start}, ${config.end})`
}
