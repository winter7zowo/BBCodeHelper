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
const { renderBbcode, parseBbcode, applyGradientToBbcode, getVisibleCharacters } = module.exports
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

test('headings only render when their tag pair stays on one line', () => {
  for (const source of ['[heading]第一行\n第二行[/heading]', '[heading]第一行\r\n第二行[/heading]', '[heading=1]标题[/heading]', '[heading]未闭合']) {
    assert.equal(render(source), source)
  }
  assert.equal(render('[heading][b]标题[/b][/heading]'), '<h2><strong>标题</strong></h2>')
})

test('a valid heading consumes only its immediately following line break', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    assert.equal(render(`[heading]Title[/heading]${newline}[b]Body[/b]`), '<h2>Title</h2><strong>Body</strong>')
    assert.equal(render(`[heading]Title[/heading]${newline}${newline}Body`), `<h2>Title</h2>${newline}Body`)
  }
  assert.equal(render('[heading]Title[/heading] \nBody'), '<h2>Title</h2> \nBody')
  assert.equal(render('[heading]Title\nBody[/heading]\nNext'), '[heading]Title\nBody[/heading]\nNext')
  assert.equal(render('[heading]Title\nBody'), '[heading]Title\nBody')
  assert.equal(render('[code][heading]Title[/heading]\nBody[/code]'),
    '<pre class="bbcode-code"><code>[heading]Title[/heading]\nBody</code></pre>')
})

test('alignment and nested notices trim only their specified boundary line breaks', () => {
  assert.equal(render('[centre]\r\n[notice]\nA\n[/notice]\r\n[/centre]\r\nB'),
    '<div style="text-align:center" class="bbcode-align"><div class="bbcode-notice">A</div></div>B')
  for (const tag of ['left', 'right', 'centre']) {
    const alignment = tag === 'centre' ? 'center' : tag
    assert.equal(render(`[${tag}]\n\nA\n[/${tag}]\n\nB`),
      `<div style="text-align:${alignment}" class="bbcode-align">\nA\n</div>\nB`)
  }
  assert.equal(render('[notice]\n\nOuter\n[notice]\nInner\n[/notice]\n\nTail\n\n[/notice]\nEnd'),
    '<div class="bbcode-notice">Outer\n<div class="bbcode-notice">Inner</div>\nTail</div>End')
  assert.equal(render('[notice] \nA\n [/notice]'), '<div class="bbcode-notice"> \nA\n </div>')
})

test('quote and list boundary whitespace follows osu! without trimming nested code', () => {
  assert.equal(render('[quote]\t\nA \r\n[/quote]\n\n\nB'), '<blockquote>A</blockquote>\nB')
  assert.equal(render('[quote]\n[code]\n A \n[/code]\n\t[/quote]\n\nB'),
    '<blockquote><pre class="bbcode-code"><code>\n A \n</code></pre></blockquote>B')
  assert.equal(render('[list]\n[*]A \n[*][b]B[/b]\r\n[/list]\n\n\nC'),
    '<ul><li>A</li><li><strong>B</strong></li></ul>\nC')
  assert.equal(render('[list][*][code] X \n[/code]\n[*]Y[/list]'),
    '<ul><li><pre class="bbcode-code"><code> X \n</code></pre></li><li>Y</li></ul>')
  assert.equal(render('[list][*]A\n[list][*]B\n[/list]\n\n[*]C\n[/list]'),
    '<ul><li>A\n<ul><li>B</li></ul></li><li>C</li></ul>')
})

test('block boundary cleanup requires closing tags and never changes exported whitespace', () => {
  assert.equal(render('[notice]\nA\n'), '<div class="bbcode-notice">\nA\n</div>')
  assert.equal(render('[left]\nA\n'), '<div style="text-align:left" class="bbcode-align">\nA\n</div>')
  assert.equal(render('[quote]\nA \n'), '<blockquote>\nA \n</blockquote>')
  assert.equal(render('[list]\n[*]A \n'), '<ul><li>A \n</li></ul>')
  const source = '[centre]\n[notice]\nA\n[/notice]\n[/centre]\n'
  assert.equal(applyGradientToBbcode(source, gradient),
    '[centre]\n[notice]\n[color=#FF0000]A[/color]\n[/notice]\n[/centre]\n')
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

const gradient = { mode: 'linear', start: '#FF0000', end: '#0000FF', middle: '#00FF00', middlePosition: 50 }

test('media payloads and literal code stay intact and do not consume gradient colours', () => {
  for (const raw of [
    '[img]https://example.com/a.png[/img]',
    '[IMG]https://example.com/a.png[/IMG]',
    '[audio]https://example.com/a.mp3[/audio]',
    '[youtube]a1b2c3d4e5f[/youtube]',
    '[imagemap]https://example.com/a.png\n0 0 10 10 https://osu.ppy.sh title[/imagemap]',
    '[code][b]literal[/b]\n<em>source</em>[/code]',
    '[url]https://osu.ppy.sh[/url]',
    '[email]hello@example.com[/email]',
  ]) {
    const source = `[notice]A${raw}B[/notice]`
    assert.deepEqual(getVisibleCharacters(source), ['A', 'B'])
    assert.equal(applyGradientToBbcode(source, gradient),
      `[notice][color=#FF0000]A[/color]${raw}[color=#0000FF]B[/color][/notice]`)
    assert.equal(applyGradientToBbcode(raw, gradient), raw)
  }
})

test('explicit links colour their labels while implicit URL and email targets stay clickable', () => {
  const source = '[url=https://osu.ppy.sh]AB[/url]'
  const output = applyGradientToBbcode(source, gradient)
  assert.equal(output, '[url=https://osu.ppy.sh][color=#FF0000]A[/color][color=#0000FF]B[/color][/url]')
  assert.match(render(output), /href="https:\/\/osu\.ppy\.sh"/)
  assert.match(render('[url]https://osu.ppy.sh[/url]'), /href="https:\/\/osu\.ppy\.sh"/)
  assert.match(render('[email]hello@example.com[/email]'), /href="mailto:hello@example\.com"/)
  assert.match(render(applyGradientToBbcode('[email=hello@example.com]AB[/email]', gradient)),
    /href="mailto:hello@example\.com".*<span style="color:#FF0000">A<\/span>/)
  for (const source of ['[url]javascript:alert(1)[/url]', '[email]javascript:alert(1)[/email]']) {
    assert.doesNotMatch(render(source), /href=/)
  }
})

test('image previews keep nested notices and only load safe HTTP images', () => {
  assert.equal(render('[notice][img]https://example.com/a.png[/img]Caption[/notice]'),
    '<div class="bbcode-notice"><img src="https://example.com/a.png" alt="" loading="lazy" class="bbcode-image"/>Caption</div>')
  for (const target of ['javascript:alert(1)', 'data:image/svg+xml,test', 'https://', 'https://example.com/[b]x[/b]']) {
    const source = `[img]${target}[/img]`
    assert.doesNotMatch(render(source), /<img/)
    assert.equal(render(source), source)
  }
})

test('code previews escape HTML and never interpret nested BBCode', () => {
  assert.equal(render('[code][b]A[/b]\n<img src=x onerror=alert(1)>[/code]'),
    '<pre class="bbcode-code"><code>[b]A[/b]\n&lt;img src=x onerror=alert(1)&gt;</code></pre>')
  assert.equal(render('[c][i]A[/i][/c]'), '<code class="bbcode-inline-code"><em>A</em></code>')
  assert.equal(render('[c]A\nB[/c]'), '[c]A\nB[/c]')
  assert.equal(render('[unknown]<script>alert(1)</script>[/unknown]'),
    '[unknown]&lt;script&gt;alert(1)&lt;/script&gt;[/unknown]')
})

test('single-line inline code supports formatting and gradient colours like osu!', () => {
  const source = '[c][b]AB[/b][/c]'
  assert.deepEqual(getVisibleCharacters(source), ['A', 'B'])
  const output = applyGradientToBbcode(source, gradient)
  assert.equal(output, '[c][b][color=#FF0000]A[/color][color=#0000FF]B[/color][/b][/c]')
  assert.equal(render(output), '<code class="bbcode-inline-code"><strong><span style="color:#FF0000">A</span><span style="color:#0000FF">B</span></strong></code>')
})

test('incomplete raw tags preserve their markers and following text', () => {
  for (const tag of ['img', 'code', 'c', 'audio', 'youtube', 'imagemap', 'url', 'email']) {
    const source = `[${tag}]A`
    assert.equal(render(source), source)
    assert.deepEqual(getVisibleCharacters(source), ['A'])
    assert.equal(applyGradientToBbcode(source, gradient), `[${tag}][color=#FF0000]A[/color]`)
  }
  assert.equal(render('[code]A[/code]B[code]C'), '<pre class="bbcode-code"><code>A</code></pre>B[code]C')
})

test('plain URLs and email addresses survive export as contiguous clickable text', () => {
  for (const [text, target] of [
    ['https://osu.ppy.sh/users/1', 'https://osu.ppy.sh/users/1'],
    ['http://example.com/a?b=1&c=2', 'http://example.com/a?b=1&amp;c=2'],
    ['www.example.com/path', 'https://www.example.com/path'],
    ['ftp://files.example.com/a.zip', 'ftp://files.example.com/a.zip'],
    ['user+tag@example.com', 'mailto:user+tag@example.com'],
  ]) {
    const source = `A ${text} B`
    assert.deepEqual(getVisibleCharacters(source), ['A', 'B'])
    const output = applyGradientToBbcode(source, gradient)
    assert.equal(output, `[color=#FF0000]A[/color] ${text} [color=#0000FF]B[/color]`)
    assert.ok(render(output).includes(`href="${target}"`))
    assert.equal((render(output).match(/<a /g) ?? []).length, 1)
  }
})

test('automatic links leave sentence punctuation outside the link target', () => {
  for (const punctuation of ['.', ',', '!', '?', ';', ':', '，', '。', '！', '？', '；', '：', '、']) {
    const source = `https://osu.ppy.sh${punctuation}`
    assert.deepEqual(getVisibleCharacters(source), [punctuation])
    assert.equal(applyGradientToBbcode(source, gradient), `https://osu.ppy.sh[color=#FF0000]${punctuation}[/color]`)
    assert.equal(render(source), `<a href="https://osu.ppy.sh" target="_blank" rel="noreferrer">https://osu.ppy.sh</a>${punctuation}`)
  }
  assert.equal(render('(https://example.com/Foo_(bar)).'),
    '(<a href="https://example.com/Foo_(bar)" target="_blank" rel="noreferrer">https://example.com/Foo_(bar)</a>).')
  assert.equal(render('hello@example.com，继续'), '<a href="mailto:hello@example.com">hello@example.com</a>，继续')
})

test('automatic links never nest inside explicit links or escape literal code', () => {
  for (const source of [
    '[url=https://osu.ppy.sh]https://example.com user@example.com[/url]',
    '[url=https://osu.ppy.sh][b]www.example.com[/b][/url]',
    '[email=user@example.com]https://example.com[/email]',
  ]) {
    const output = applyGradientToBbcode(source, gradient)
    assert.ok(getVisibleCharacters(source).length > 2)
    assert.equal((render(source).match(/<a /g) ?? []).length, 1)
    assert.equal((render(output).match(/<a /g) ?? []).length, 1)
  }
  assert.equal(render('[code]https://osu.ppy.sh user@example.com[/code]'),
    '<pre class="bbcode-code"><code>https://osu.ppy.sh user@example.com</code></pre>')
  assert.doesNotMatch(render('[img]ftp://files.example.com/a.png[/img]'), /<img/)
  for (const source of ['javascript:alert(1)', 'data:text/html,hello', 'ftps://files.example.com/a.zip']) {
    assert.doesNotMatch(render(source), /href=/)
  }
})
