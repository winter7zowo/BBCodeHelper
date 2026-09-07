import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'esbuild'

const { outputFiles } = await build({
  entryPoints: ['src/utils/bbcode.tsx'],
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
const { renderBbcode, parseBbcode, applyGradientToBbcode, wrapSelection } = module.exports
const render = (source) => renderToStaticMarkup(renderBbcode(source))

test('osu! heading and centre tags survive gradient export and render correctly', () => {
  const output = applyGradientToBbcode('[centre][heading]标题[/heading][/centre]', {
    mode: 'linear', start: '#FF0000', end: '#0000FF', middle: '#00FF00', middlePosition: 50,
  })
  assert.equal(output, '[centre][heading][color=#FF0000]标[/color][color=#0000FF]题[/color][/heading][/centre]')
  assert.equal(render(output), '<div style="text-align:center" class="bbcode-align"><h2><span style="color:#FF0000">标</span><span style="color:#0000FF">题</span></h2></div>')
})

test('osu! font sizes use percentages with the server bounds', () => {
  for (const [input, size] of [[50, 50], [85, 85], [100, 100], [150, 150], [200, 200], [7, 30], [300, 200]]) {
    assert.equal(render(`[size=${input}]字[/size]`), `<span style="font-size:${size}%">字</span>`)
  }
  for (const invalid of ['1.5', '12px', 'large']) {
    assert.equal(render(`[size=${invalid}]字[/size]`), `[size=${invalid}]字[/size]`)
  }
})

test('multiline heading actions preserve blank lines and toggle within the selected range', () => {
  const selected = '第一行\r\n\r\n  \r\n第二行'
  const source = `前${selected}后`
  const result = wrapSelection(source, 1, 1 + selected.length, '[heading]', '[/heading]')
  const formatted = '[heading]第一行[/heading]\r\n\r\n  \r\n[heading]第二行[/heading]'
  assert.equal(result.value, `前${formatted}后`)
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), formatted)
  assert.deepEqual(wrapSelection(result.value, result.selectionStart, result.selectionEnd, '[heading]', '[/heading]'), {
    value: source, selectionStart: 1, selectionEnd: 1 + selected.length,
  })
  assert.equal((render(formatted).match(/<h2>/g) ?? []).length, 2)
})

test('headings only render when their tag pair stays on one line', () => {
  for (const source of ['[heading]第一行\n第二行[/heading]', '[heading]第一行\r\n第二行[/heading]', '[heading=1]标题[/heading]', '[heading]未闭合']) {
    assert.equal(render(source), source)
  }
  assert.equal(render('[heading][b]标题[/b][/heading]'), '<h2><strong>标题</strong></h2>')
  assert.deepEqual(wrapSelection('前后', 1, 1, '[heading]', '[/heading]', '标题'), {
    value: '前[heading]标题[/heading]后', selectionStart: 10, selectionEnd: 12,
  })
})

test('multiline heading actions preserve existing BBCode nesting with a size wrapper', () => {
  const selected = '[b]第一行\n\n第二行[/b]'
  const source = `前${selected}后`
  const result = wrapSelection(source, 1, 1 + selected.length, '[heading]', '[/heading]')
  assert.equal(result.value, `前[size=150]${selected}[/size]后`)
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), selected)
  assert.equal(render(result.value), '前<span style="font-size:150%"><strong>第一行\n\n第二行</strong></span>后')
  assert.deepEqual(wrapSelection(result.value, result.selectionStart, result.selectionEnd, '[heading]', '[/heading]'), {
    value: source, selectionStart: 1, selectionEnd: 1 + selected.length,
  })
})

test('unsupported toolbar markup remains visible instead of promising formatting', () => {
  for (const tag of ['h1', 'h2', 'h3', 'font=Arial', 'align=right', 'center', 'alert', 'notice=warning']) {
    const source = `[${tag}]文字[/${tag.split('=')[0]}]`
    assert.equal(render(source), source)
  }
  assert.equal(render('[notice]提醒[/notice]'), '<div class="bbcode-notice">提醒</div>')
})

test('consecutive list markers create siblings, including nested lists', () => {
  const list = parseBbcode('[list]\n[*]一\n[*]二\n[list=1][*]内一[*]内二[/list]\n[*]三\n[/list]')
    .find((node) => typeof node !== 'string')
  const items = list.children.filter((child) => typeof child !== 'string')
  assert.equal(items.length, 3)
  assert.ok(items.every((child) => child.tag === '*'))
  const nested = items[1].children.find((child) => typeof child !== 'string')
  assert.equal(nested.tag, 'list')
  assert.equal(nested.children.filter((child) => typeof child !== 'string').length, 2)
  assert.equal(render('[list][*]一[*]二[/list]'), '<ul><li>一</li><li>二</li></ul>')
  assert.equal(render('[list=a][*]一[/*][*]二[/*][/list]'), '<ol><li>一</li><li>二</li></ol>')
})

test('existing osu! formatting stays available and unsafe URLs do not become links', () => {
  assert.equal(render('[left][b][i][u][s]字[/s][/u][/i][/b][/left]'),
    '<div style="text-align:left" class="bbcode-align"><strong><em><u><s>字</s></u></em></strong></div>')
  assert.equal(render('[right][quote]文字[/quote][/right]'), '<div style="text-align:right" class="bbcode-align"><blockquote>文字</blockquote></div>')
  assert.match(render('[url=https://osu.ppy.sh]osu![/url]'), /href="https:\/\/osu\.ppy\.sh"/)
  assert.doesNotMatch(render('[url=javascript:alert(1)]字[/url]'), /href=/)
})
