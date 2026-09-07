interface Rgb {
  r: number
  g: number
  b: number
}

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

export function mix(from: string, to: string, amount: number): string {
  const start = hexToRgb(from)
  const end = hexToRgb(to)
  const progress = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0))
  const channel = (value: number) => Math.round(value).toString(16).padStart(2, '0').toUpperCase()
  return `#${channel(start.r + (end.r - start.r) * progress)}${channel(start.g + (end.g - start.g) * progress)}${channel(start.b + (end.b - start.b) * progress)}`
}
