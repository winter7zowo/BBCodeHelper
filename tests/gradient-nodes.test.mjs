import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'

// Bundle TypeScript in memory with the project's existing Vite dependency.
const { outputFiles } = await build({
  stdin: {
    contents: `
      export * from './src/utils/gradientNodes.ts'
      export * from './src/utils/color.ts'
      export { getVisibleCharacters, applyGradientToBbcode } from './src/utils/bbcode.tsx'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  packages: 'external',
})
const module = { exports: {} }
new Function('require', 'module', 'exports', outputFiles[0].text)(
  createRequire(import.meta.url), module, module.exports,
)
const {
  normalizeNodes, getOffsetNodes, limitNodes, addNode, appendNode, moveNode, removeNode,
  sampleNodeColor, generateGradientColors, getCssGradient,
  getVisibleCharacters, applyGradientToBbcode,
} = module.exports

const legacy = {
  mode: 'offset', start: '#000000', middle: '#808080', middlePosition: 40, end: '#FFFFFF',
}
const node = (id, color, position) => ({ id, color, position })
const endpoints = [node('start', '#000000', 0), node('end', '#FFFFFF', 100)]

test('legacy offset palettes migrate, while an explicit empty palette stays empty', () => {
  assert.deepEqual(getOffsetNodes(legacy).map(({ color, position }) => [color, position]), [
    ['#000000', 0], ['#808080', 40], ['#FFFFFF', 100],
  ])
  assert.deepEqual(getOffsetNodes({ ...legacy, nodes: [] }), [])
  assert.equal(getOffsetNodes({ ...legacy, middlePosition: 0 })[1].position, 5)
  assert.equal(getOffsetNodes({ ...legacy, middlePosition: 100 })[1].position, 95)
})

test('normalization sanitizes persisted values, keeps sorted unique IDs and positions', () => {
  const normalized = normalizeNodes([
    null, { color: '#f00', position: 105 },
    { id: 'same', color: '#fff', position: 40 },
    { id: 'same', color: 'invalid', position: 20 },
    { id: 'not-finite', color: '#123456', position: Number.NaN },
    { id: 'duplicate-position', color: '#000000', position: 40 },
  ])
  assert.deepEqual(normalized.map(({ position }) => position), [20, 40, 100])
  assert.equal(new Set(normalized.map(({ id }) => id)).size, normalized.length)
  assert.ok(normalized.every(({ color }) => /^#[\dA-F]{6}$/.test(color)))
  assert.deepEqual(normalizeNodes(null), [])
})

test('sampling handles zero/one nodes, endpoint extension, overlaps, and piecewise RGB', () => {
  assert.equal(sampleNodeColor([], 40), '#8B5CF6')
  assert.equal(sampleNodeColor([], 40, '#0f0'), '#00FF00')
  assert.equal(sampleNodeColor([node('only', '#f00', 50)], 10), '#FF0000')
  const stops = [node('a', '#FF0000', 20), node('b', '#00FF00', 40), node('c', '#0000FF', 80)]
  assert.equal(sampleNodeColor(stops, 0), '#FF0000')
  assert.equal(sampleNodeColor(stops, 100), '#0000FF')
  assert.equal(sampleNodeColor(stops, 30), '#808000')
  assert.equal(sampleNodeColor(stops, 60), '#008080')
  assert.match(sampleNodeColor([node('a', '#000000', 20), node('b', '#FFFFFF', 20)], 20), /^#[\dA-F]{6}$/)
})

test('adding samples the existing gradient and does not visibly change its rendered samples', () => {
  const before = [node('a', '#000000', 0), node('b', '#C8C8C8', 100)]
  const inserted = addNode(before, 40, 4, 'new')
  assert.deepEqual(inserted[1], node('new', '#505050', 40))
  for (let position = 0; position <= 100; position += 5) {
    assert.equal(sampleNodeColor(inserted, position), sampleNodeColor(before, position))
  }
  assert.deepEqual(before, [node('a', '#000000', 0), node('b', '#C8C8C8', 100)])
  assert.deepEqual(addNode(before, 40, 2, 'blocked'), before)
  assert.deepEqual(addNode(before, 100, 5, 'duplicate'), before)
  assert.deepEqual(addNode([], 200, 1, 'first', '#0f0'), [node('first', '#00FF00', 100)])
  assert.deepEqual(addNode([], 50, 0, 'blocked'), [])
})

test('node limits cover empty and single-character text and evenly preserve endpoints', () => {
  const nodes = Array.from({ length: 7 }, (_, index) => node(`n${index}`, '#FFFFFF', index * 15))
  assert.deepEqual(limitNodes(nodes, 0), [])
  assert.deepEqual(limitNodes(nodes, 1), [nodes[0]])
  assert.deepEqual(limitNodes(nodes, 2), [nodes[0], nodes[6]])
  assert.deepEqual(limitNodes(nodes, 4), [nodes[0], nodes[2], nodes[4], nodes[6]])
  assert.deepEqual(limitNodes([...nodes].reverse(), 9), nodes)
  assert.equal(nodes.length, 7)
})

test('appending adds at the end and preserves existing colors, order, and spacing ratios', () => {
  const before = [node('a', '#000000', 0), node('b', '#FF0000', 40), node('c', '#FFFFFF', 100)]
  const appended = appendNode(before, 4, 'new')
  assert.deepEqual(appended.map(({ id }) => id), ['a', 'b', 'c', 'new'])
  assert.deepEqual(appended.map(({ color }) => color), ['#000000', '#FF0000', '#FFFFFF', '#FFFFFF'])
  assert.equal(appended[0].position, 0)
  assert.ok(Math.abs(appended[1].position - 80 / 3) < 1e-10)
  assert.ok(Math.abs(appended[2].position - 200 / 3) < 1e-10)
  assert.equal(appended[3].position, 100)
  assert.equal(new Set(appended.map(({ position }) => position)).size, 4)
  assert.deepEqual(before.map(({ position }) => position), [0, 40, 100])

  const openEnd = [node('a', '#000000', 20), node('b', '#FF0000', 75)]
  assert.deepEqual(appendNode(openEnd, 3, 'new'), [...openEnd, node('new', '#FF0000', 100)])
})

test('appending handles empty palettes, a single endpoint, unique IDs, and text limits', () => {
  const first = appendNode([], 2, 'first', '#0f0')
  assert.deepEqual(first, [node('first', '#00FF00', 0)])
  assert.deepEqual(appendNode(first, 2, 'first'), [...first, node('first-2', '#00FF00', 100)])
  assert.deepEqual(appendNode([node('only', '#FFFFFF', 100)], 2, 'new'), [
    node('only', '#FFFFFF', 0), node('new', '#FFFFFF', 100),
  ])
  assert.deepEqual(appendNode(endpoints, 2, 'blocked'), endpoints)
  assert.deepEqual(appendNode(endpoints, 1, 'blocked'), [endpoints[0]])
  assert.deepEqual(appendNode([], 0, 'blocked'), [])
})

test('repeated appends keep the newly added node last and all positions distinct', () => {
  let nodes = endpoints
  for (let count = 3; count <= 50; count++) {
    nodes = appendNode(nodes, 50, `n${count}`)
    assert.equal(nodes.length, count)
    assert.equal(nodes[count - 1].id, `n${count}`)
    assert.equal(nodes[count - 1].position, 100)
    assert.equal(new Set(nodes.map(({ position }) => position)).size, count)
    assert.ok(nodes.every((node, index) => index === 0 || node.position > nodes[index - 1].position))
  }
})

test('moving nodes crosses neighbors without mutating input or creating duplicate positions', () => {
  const nodes = [...endpoints, node('middle', '#FF0000', 40)].sort((a, b) => a.position - b.position)
  assert.deepEqual(moveNode(nodes, 'start', 60).map(({ id }) => id), ['middle', 'start', 'end'])
  assert.equal(moveNode(nodes, 'middle', 150).find(({ id }) => id === 'middle').position, 40)
  assert.equal(moveNode(nodes, 'middle', -5).find(({ id }) => id === 'middle').position, 40)
  assert.equal(nodes[0].position, 0)
  assert.deepEqual(moveNode(nodes, 'missing', 30), nodes)
})

test('deletion keeps a final node and leaves unrelated nodes untouched', () => {
  assert.deepEqual(removeNode(endpoints, 'start'), [endpoints[1]])
  assert.deepEqual(removeNode([endpoints[0]], 'start'), [endpoints[0]])
  assert.deepEqual(removeNode([], 'none'), [])
  assert.deepEqual(removeNode(endpoints, 'missing'), endpoints)
})

test('offset character colors and CSS share the same positioned nodes', () => {
  const nodes = [node('a', '#FF0000', 25), node('b', '#00FF00', 50), node('c', '#0000FF', 75)]
  const config = { ...legacy, nodes }
  assert.deepEqual(generateGradientColors(5, config), ['#FF0000', '#FF0000', '#00FF00', '#0000FF', '#0000FF'])
  assert.equal(getCssGradient(config), 'linear-gradient(90deg, #FF0000 25%, #00FF00 50%, #0000FF 75%)')
  assert.deepEqual(generateGradientColors(0, config), [])
  assert.deepEqual(generateGradientColors(1, config), ['#FF0000'])
  assert.deepEqual(generateGradientColors(1, { ...legacy, nodes: [] }), ['#000000'])
  assert.equal(getCssGradient({ ...legacy, nodes: [] }), 'linear-gradient(90deg, #000000, #000000)')
})

test('other modes ignore custom nodes and preserve their colors', () => {
  const config = { ...legacy, start: '#FF0000', middle: '#00FF00', end: '#0000FF', nodes: [] }
  assert.deepEqual(generateGradientColors(3, { ...config, mode: 'linear' }), ['#FF0000', '#800080', '#0000FF'])
  assert.deepEqual(generateGradientColors(3, { ...config, mode: 'three' }), ['#FF0000', '#00FF00', '#0000FF'])
  assert.deepEqual(generateGradientColors(3, { ...config, mode: 'mirror' }), ['#FF0000', '#0000FF', '#FF0000'])
  assert.deepEqual(generateGradientColors(7, { ...config, mode: 'rainbow' }), [
    '#FF5F6D', '#FFB86C', '#F9F871', '#45E0A8', '#22D3EE', '#6C8CFF', '#C084FC',
  ])
})

test('count limits use visible Unicode graphemes, excluding BBCode and whitespace', () => {
  const source = '[b]中 A 👨‍👩‍👧‍👦 e\u0301[/b]\n[quote="标题"]好[/quote]'
  const characters = getVisibleCharacters(source)
  assert.deepEqual(characters, ['中', 'A', '👨‍👩‍👧‍👦', 'e\u0301', '好'])
  assert.deepEqual(getVisibleCharacters('[b] \n\t[/b]'), [])
  const nodes = limitNodes(getOffsetNodes(legacy), characters.length)
  const output = applyGradientToBbcode(source, { ...legacy, nodes })
  assert.equal((output.match(/\[color=/g) ?? []).length, characters.length)
  assert.ok(output.includes('[quote="标题"]'))
})
