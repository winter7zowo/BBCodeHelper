import { normalizeHex } from './colorMath'

export interface HsvPoint {
  x: number
  y: number
  hue: number
  saturation: number
  value: number
}

function normalizeHue(hue: number): number {
  return Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 0
}

function clampUnit(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

/** Hue and saturation map to the horizontal and inverted vertical plane axes. */
export function getHsvPoint(hex: string, fallbackHue = 0): HsvPoint {
  const normalized = normalizeHex(hex).slice(1)
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const saturation = max === 0 ? 0 : delta / max
  let hue = normalizeHue(fallbackHue)

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
    hue = normalizeHue(hue * 60)
  }

  return { x: hue / 360 * 100, y: (1 - saturation) * 100, hue, saturation, value: max }
}

export function hsvToHex(hue: number, saturation: number, value: number): string {
  const brightness = clampUnit(value)
  const chroma = brightness * clampUnit(saturation)
  const section = normalizeHue(hue) / 60
  const secondary = chroma * (1 - Math.abs((section % 2) - 1))
  const offset = brightness - chroma
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
