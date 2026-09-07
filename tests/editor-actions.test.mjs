import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'

const { outputFiles } = await build({
  entryPoints: ['src/utils/editorActions.ts'],
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
const { wrapSelection } = module.exports

test('an empty caret inserts empty tags and remains between them', () => {
  assert.deepEqual(wrapSelection('前后', 1, 1, '[b]', '[/b]'), {
    value: '前[b][/b]后', selectionStart: 4, selectionEnd: 4,
  })
  assert.deepEqual(wrapSelection('', 0, 0, '[url]', '[/url]'), {
    value: '[url][/url]', selectionStart: 5, selectionEnd: 5,
  })
})

test('a selected range expands to include the whole tagged result', () => {
  const result = wrapSelection('前甲乙后', 1, 3, '[size=150]', '[/size]')
  assert.equal(result.value, '前[size=150]甲乙[/size]后')
  assert.equal(result.selectionStart, 1)
  assert.equal(result.selectionEnd, result.value.length - 1)
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), '[size=150]甲乙[/size]')
})

test('repeating a toolbar action nests the selected tags without toggling', () => {
  const first = wrapSelection('前甲后', 1, 2, '[b]', '[/b]')
  const second = wrapSelection(first.value, first.selectionStart, first.selectionEnd, '[b]', '[/b]')
  assert.equal(second.value, '前[b][b]甲[/b][/b]后')
  assert.equal(second.value.slice(second.selectionStart, second.selectionEnd), '[b][b]甲[/b][/b]')
  assert.deepEqual(wrapSelection('[b]甲[/b]', 3, 4, '[b]', '[/b]'), {
    value: '[b][b]甲[/b][/b]', selectionStart: 3, selectionEnd: 11,
  })
})

test('selecting adjacent formatted blocks preserves all original boundaries', () => {
  const selected = '[b]A[/b][b]B[/b]'
  const result = wrapSelection(`前${selected}后`, 1, 1 + selected.length, '[b]', '[/b]')
  assert.equal(result.value, `前[b]${selected}[/b]后`)
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), `[b]${selected}[/b]`)
})

test('block actions preserve selected line endings without rewriting content', () => {
  const selected = '甲\r\n\r\n[b]乙\n丙[/b]'
  for (const tag of ['heading', 'notice', 'quote', 'centre']) {
    const result = wrapSelection(`前${selected}后`, 1, 1 + selected.length, `[${tag}]`, `[/${tag}]`)
    assert.equal(result.value, `前[${tag}]${selected}[/${tag}]后`)
    assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), `[${tag}]${selected}[/${tag}]`)
  }
})

test('list insertion adds one marker without generating extra items or newlines', () => {
  for (const openTag of ['[list]\n[*]', '[list=1]\n[*]']) {
    const empty = wrapSelection('', 0, 0, openTag, '[/list]')
    assert.deepEqual(empty, {
      value: `${openTag}[/list]`, selectionStart: openTag.length, selectionEnd: openTag.length,
    })
    const selected = '甲\n乙\n\n丙'
    const result = wrapSelection(selected, 0, selected.length, openTag, '[/list]')
    assert.equal(result.value, `${openTag}${selected}[/list]`)
    assert.equal(result.value.split('[*]').length - 1, 1)
    assert.equal(result.selectionEnd, result.value.length)
  }
})

test('selection positions use textarea UTF-16 offsets and stay within the value', () => {
  assert.deepEqual(wrapSelection('前😀后', 1, 3, '[i]', '[/i]'), {
    value: '前[i]😀[/i]后', selectionStart: 1, selectionEnd: 10,
  })
  assert.deepEqual(wrapSelection('甲乙', -10, 99, '[b]', '[/b]'), {
    value: '[b]甲乙[/b]', selectionStart: 0, selectionEnd: 9,
  })
  assert.deepEqual(wrapSelection('甲乙', 2, 0, '[b]', '[/b]'), {
    value: '[b]甲乙[/b]', selectionStart: 0, selectionEnd: 9,
  })
  assert.deepEqual(wrapSelection('甲乙', Infinity, Infinity, '[b]', '[/b]'), {
    value: '甲乙[b][/b]', selectionStart: 5, selectionEnd: 5,
  })
  assert.deepEqual(wrapSelection('甲乙', NaN, NaN, '[b]', '[/b]'), {
    value: '[b][/b]甲乙', selectionStart: 3, selectionEnd: 3,
  })
})
