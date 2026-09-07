import type { GradientConfig, GradientStop } from '../types/editor'
import { mix, normalizeHex } from './colorMath'

const DEFAULT_COLOR = '#8B5CF6'

function clampPosition(position: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(position) ? position : 0))
}

function nodeLimit(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
}

function sortedNodes(nodes: readonly GradientStop[]): GradientStop[] {
  return [...nodes].sort((left, right) => left.position - right.position)
}

function uniqueId(requestedId: string, used: Set<string>): string {
  const base = requestedId.trim() || 'node'
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

/** Validate persisted data at the state boundary, not inside pointer events. */
export function normalizeNodes(raw: unknown): GradientStop[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set<string>()
  const positions = new Set<number>()
  const nodes: GradientStop[] = []

  raw.forEach((entry: unknown, index) => {
    if (typeof entry !== 'object' || entry === null) return
    const value = entry as Record<string, unknown>
    if (typeof value.position !== 'number' || !Number.isFinite(value.position)) return
    const position = clampPosition(value.position)
    if (positions.has(position)) return
    const id = uniqueId(typeof value.id === 'string' ? value.id : `node-${index}`, ids)
    const color = normalizeHex(typeof value.color === 'string' ? value.color : DEFAULT_COLOR)
    ids.add(id)
    positions.add(position)
    nodes.push({ id, color, position })
  })

  return sortedNodes(nodes)
}

export function getOffsetNodes(config: GradientConfig): GradientStop[] {
  if (Array.isArray(config.nodes)) return normalizeNodes(config.nodes)
  const middlePosition = Number.isFinite(config.middlePosition) ? config.middlePosition : 50
  return [
    { id: 'start', color: normalizeHex(config.start), position: 0 },
    { id: 'middle', color: normalizeHex(config.middle), position: Math.min(95, Math.max(5, middlePosition)) },
    { id: 'end', color: normalizeHex(config.end), position: 100 },
  ]
}

/** Keep the endpoints and evenly retain interiors when shorter text lowers the limit. */
export function limitNodes(nodes: readonly GradientStop[], maxCount: number): GradientStop[] {
  const count = nodeLimit(maxCount)
  if (count === 0) return []
  const sorted = sortedNodes(nodes)
  if (sorted.length <= count) return sorted
  if (count === 1) return [sorted[0]]
  return Array.from({ length: count }, (_, index) =>
    sorted[Math.round(index * (sorted.length - 1) / (count - 1))],
  )
}

/** Nodes from this module are sorted. Binary lookup keeps long text O(chars × log(nodes)). */
export function sampleNodeColor(
  nodes: readonly GradientStop[],
  position: number,
  fallbackColor = DEFAULT_COLOR,
): string {
  if (nodes.length === 0) return normalizeHex(fallbackColor)
  const progress = clampPosition(position)
  if (nodes.length === 1 || progress <= nodes[0].position) return normalizeHex(nodes[0].color)
  const last = nodes[nodes.length - 1]
  if (progress >= last.position) return normalizeHex(last.color)

  let low = 0
  let high = nodes.length - 1
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2)
    if (nodes[middle].position <= progress) low = middle
    else high = middle
  }

  const left = nodes[low]
  const right = nodes[high]
  const distance = right.position - left.position
  return distance <= 0
    ? normalizeHex(right.color)
    : mix(left.color, right.color, (progress - left.position) / distance)
}

export function addNode(
  nodes: readonly GradientStop[],
  position: number,
  maxCount: number,
  id: string,
  fallbackColor = DEFAULT_COLOR,
): GradientStop[] {
  const limited = limitNodes(nodes, maxCount)
  const nextPosition = clampPosition(position)
  if (limited.length >= nodeLimit(maxCount) || limited.some((node) => node.position === nextPosition)) {
    return limited
  }
  const next = {
    id: uniqueId(id, new Set(limited.map((node) => node.id))),
    color: sampleNodeColor(limited, nextPosition, fallbackColor),
    position: nextPosition,
  }
  return sortedNodes([...limited, next])
}

/** Append a final stop, compressing the existing positions only when the end is occupied. */
export function appendNode(
  nodes: readonly GradientStop[],
  maxCount: number,
  id: string,
  fallbackColor = DEFAULT_COLOR,
): GradientStop[] {
  const limited = limitNodes(nodes, maxCount)
  if (limited.length >= nodeLimit(maxCount)) return limited
  const last = limited[limited.length - 1]
  const scale = last?.position === 100 ? (limited.length - 1) / limited.length : 1
  const next = {
    id: uniqueId(id, new Set(limited.map((node) => node.id))),
    color: sampleNodeColor(limited, 100, fallbackColor),
    position: last ? 100 : 0,
  }
  return [...limited.map((node) => ({ ...node, position: node.position * scale })), next]
}

export function moveNode(nodes: readonly GradientStop[], id: string, position: number): GradientStop[] {
  const nextPosition = clampPosition(position)
  if (nodes.some((node) => node.id !== id && node.position === nextPosition)) return sortedNodes(nodes)
  return sortedNodes(nodes.map((node) => node.id === id ? { ...node, position: nextPosition } : node))
}

export function removeNode(nodes: readonly GradientStop[], id: string): GradientStop[] {
  return sortedNodes(nodes.length <= 1 ? nodes : nodes.filter((node) => node.id !== id))
}
