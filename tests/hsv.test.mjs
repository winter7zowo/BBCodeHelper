import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'

const { outputFiles } = await build({
  entryPoints: ['src/utils/hsv.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})
const { getHsvPoint, hsvToHex } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
)

test('primary and secondary RGB colors map to their HSV coordinates and round-trip', () => {
  const colors = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF']
  colors.forEach((color, index) => {
    const point = getHsvPoint(color)
    assert.equal(point.hue, index * 60)
    assert.equal(point.saturation, 1)
    assert.equal(point.value, 1)
    assert.equal(point.x, (point.hue / 360) * 100)
    assert.equal(point.y, 0)
    assert.equal(hsvToHex(point.hue, point.saturation, point.value), color)
  })
})

test('grayscale and black retain fallback hue without changing their colors', () => {
  for (const color of ['#FFFFFF', '#808080', '#000000']) {
    const point = getHsvPoint(color, 240)
    assert.equal(point.hue, 240)
    assert.equal(point.x, 240 / 360 * 100)
    assert.equal(point.y, 100)
    assert.equal(point.saturation, 0)
    assert.equal(hsvToHex(point.hue, point.saturation, point.value), color)
  }
  assert.equal(getHsvPoint('#000000').hue, 0)
  assert.equal(getHsvPoint('#808080', -120).hue, 240)
  assert.equal(getHsvPoint('#808080', Number.NaN).hue, 0)
  assert.equal(getHsvPoint('#FF0000', 240).hue, 0)
})

test('hue wraps around at either end and 360 degrees is red', () => {
  assert.equal(hsvToHex(360, 1, 1), '#FF0000')
  assert.equal(hsvToHex(720, 1, 1), '#FF0000')
  assert.equal(hsvToHex(-120, 1, 1), '#0000FF')
  assert.equal(hsvToHex(420, 1, 1), '#FFFF00')
  assert.equal(hsvToHex(-360, 1, 1), '#FF0000')
})

test('invalid HSV inputs remain finite and saturation/value are clamped', () => {
  assert.equal(hsvToHex(0, 2, 2), '#FF0000')
  assert.equal(hsvToHex(0, -1, 1), '#FFFFFF')
  assert.equal(hsvToHex(0, 1, -1), '#000000')
  assert.equal(hsvToHex(Number.NaN, 1, 1), '#FF0000')
  assert.equal(hsvToHex(Number.POSITIVE_INFINITY, 1, 1), '#FF0000')
  assert.equal(hsvToHex(120, Number.NaN, 1), '#FFFFFF')
  assert.equal(hsvToHex(120, 1, Number.NaN), '#000000')
})

test('arbitrary RGB samples and short hex values round-trip without losing channel precision', () => {
  assert.equal(getHsvPoint('#abc').value, 204 / 255)
  for (let red = 0; red <= 255; red += 51) {
    for (let green = 0; green <= 255; green += 51) {
      for (let blue = 0; blue <= 255; blue += 51) {
        const color = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
        const point = getHsvPoint(color)
        assert.equal(hsvToHex(point.hue, point.saturation, point.value), color)
      }
    }
  }
})
