import { createElement, type CSSProperties, type ReactNode } from 'react'
import type { BbcodeNode, GradientConfig } from '../types/editor'
import { generateGradientColors } from './color'

const TAG_PATTERN = /(\[[^\]\n]+\])/g
// Preview the text-formatting tags used by osu!, keeping other markup visible.
const PREVIEW_TAGS = new Set([
  'b', 'i', 'u', 's', 'strike', 'color', 'size', 'url', 'quote',
  'centre', 'left', 'right', 'notice', 'heading', 'list', '*',
])

function toGraphemes(value: string): string[] {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (
      locale: string,
      options: { granularity: 'grapheme' },
    ) => { segment: (text: string) => Iterable<{ segment: string }> }
  }).Segmenter
  if (Segmenter) {
    const segmenter = new Segmenter('zh-CN', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(value), ({ segment }) => segment)
  }
  return Array.from(value)
}

function isTag(token: string): boolean {
  return /^\[\/?(?:\*|[a-z][a-z0-9]*)(?:=[^\]]+)?\]$/i.test(token)
}

export function getVisibleCharacters(value: string): string[] {
  return value
    .split(TAG_PATTERN)
    .filter((token) => !isTag(token))
    .flatMap(toGraphemes)
    .filter((char) => !/\s/u.test(char))
}

export function applyGradientToBbcode(value: string, config: GradientConfig): string {
  const visibleCharacters = getVisibleCharacters(value)
  const colors = generateGradientColors(visibleCharacters.length, config)
  let colorIndex = 0

  return value
    .split(TAG_PATTERN)
    .map((token) => {
      if (isTag(token)) return token

      return toGraphemes(token)
        .map((char) => {
          if (/\s/u.test(char)) return char
          const color = colors[colorIndex++]
          return color ? `[color=${color}]${char}[/color]` : char
        })
        .join('')
    })
    .join('')
}

export function wrapSelection(
  value: string,
  start: number,
  end: number,
  openTag: string,
  closeTag: string,
  placeholder = '文字',
): { value: string; selectionStart: number; selectionEnd: number } {
  const hasSelection = end > start
  const selected = value.slice(start, end)

  // osu! headings cannot span lines, so keep one tag pair per non-empty line.
  if (openTag === '[heading]' && closeTag === '[/heading]' && /[\r\n]/.test(selected)) {
    const lines = selected.split(/(\r\n|\r|\n)/)
    const contentLines = lines.filter((line, index) => index % 2 === 0 && line.trim().length > 0)
    const unwrap = contentLines.every((line) => line.startsWith(openTag) && line.endsWith(closeTag))
    // Existing tags may span lines; a size wrapper preserves their nesting.
    if (!unwrap && selected.split(TAG_PATTERN).some(isTag)) {
      return wrapSelection(value, start, end, '[size=150]', '[/size]', placeholder)
    }
    const replacement = lines.map((line, index) => {
      if (index % 2 !== 0 || !line.trim()) return line
      return unwrap ? line.slice(openTag.length, -closeTag.length) : `${openTag}${line}${closeTag}`
    }).join('')

    return {
      value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
      selectionStart: start,
      selectionEnd: start + replacement.length,
    }
  }

  if (hasSelection && selected.startsWith(openTag) && selected.endsWith(closeTag)) {
    const innerText = selected.slice(openTag.length, -closeTag.length)
    return {
      value: `${value.slice(0, start)}${innerText}${value.slice(end)}`,
      selectionStart: start,
      selectionEnd: start + innerText.length,
    }
  }

  const hasSurroundingTags =
    hasSelection &&
    start >= openTag.length &&
    value.slice(start - openTag.length, start) === openTag &&
    value.slice(end, end + closeTag.length) === closeTag

  if (hasSurroundingTags) {
    const selectionStart = start - openTag.length
    return {
      value: `${value.slice(0, selectionStart)}${selected}${value.slice(end + closeTag.length)}`,
      selectionStart,
      selectionEnd: selectionStart + selected.length,
    }
  }

  const content = selected || placeholder
  const nextValue = `${value.slice(0, start)}${openTag}${content}${closeTag}${value.slice(end)}`
  const selectionStart = start + openTag.length

  return {
    value: nextValue,
    selectionStart,
    selectionEnd: selectionStart + content.length,
  }
}

function hasHeadingCloseOnSameLine(tokens: string[], start: number): boolean {
  for (let index = start + 1; index < tokens.length; index += 1) {
    if (/[\r\n]/.test(tokens[index])) return false
    if (/^\[\/heading\]$/i.test(tokens[index])) return true
  }
  return false
}

export function parseBbcode(value: string): Array<BbcodeNode | string> {
  const root: BbcodeNode = { tag: 'root', children: [] }
  const stack: BbcodeNode[] = [root]
  const tokens = value.split(TAG_PATTERN)

  tokens.forEach((token, tokenIndex) => {
    const match = token.match(/^\[(\/)?(\*|[a-z][a-z0-9]*)(?:=([^\]]+))?\]$/i)
    if (!match) {
      stack[stack.length - 1]?.children.push(token)
      return
    }

    const [, closing, rawTag, attr] = match
    const tag = rawTag.toLowerCase()

    if (!PREVIEW_TAGS.has(tag) || (!closing && (
      (tag === 'notice' && attr !== undefined) ||
      (tag === 'heading' && (attr !== undefined || !hasHeadingCloseOnSameLine(tokens, tokenIndex))) ||
      (tag === 'size' && !/^\d+$/.test(attr ?? ''))
    ))) {
      stack[stack.length - 1]?.children.push(token)
      return
    }

    if (closing) {
      const matchingIndex = stack.map((node) => node.tag).lastIndexOf(tag)
      if (matchingIndex > 0) stack.splice(matchingIndex)
      else stack[stack.length - 1]?.children.push(token)
      return
    }

    // osu! list items end implicitly at the next [*] in the same list.
    if (tag === '*') {
      const listIndex = stack.map((node) => node.tag).lastIndexOf('list')
      if (listIndex === -1) {
        stack[stack.length - 1]?.children.push(token)
        return
      }
      stack.splice(listIndex + 1)
    }

    const node: BbcodeNode = { tag, attr, children: [] }
    stack[stack.length - 1]?.children.push(node)
    stack.push(node)
  })

  return root.children
}

function renderNode(node: BbcodeNode | string, key: string): ReactNode {
  if (typeof node === 'string') return node

  const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`))
  const safeAttr = node.attr?.replace(/^['"]|['"]$/g, '')
  const props: { key: string; style?: CSSProperties; className?: string; href?: string; target?: string; rel?: string } = { key }

  switch (node.tag) {
    case 'b':
      return createElement('strong', props, children)
    case 'i':
      return createElement('em', props, children)
    case 'u':
      return createElement('u', props, children)
    case 's':
    case 'strike':
      return createElement('s', props, children)
    case 'color':
      props.style = { color: /^#[\da-f]{3,8}$/i.test(safeAttr ?? '') ? safeAttr : undefined }
      return createElement('span', props, children)
    case 'size':
      props.style = { fontSize: `${Math.min(200, Math.max(30, Number(safeAttr)))}%` }
      return createElement('span', props, children)
    case 'url':
      props.href = /^https?:\/\//i.test(safeAttr ?? '') ? safeAttr : undefined
      props.target = '_blank'
      props.rel = 'noreferrer'
      return createElement('a', props, children)
    case 'quote':
      return createElement('blockquote', props, children)
    case 'centre':
    case 'left':
    case 'right':
      props.style = { textAlign: node.tag === 'centre' ? 'center' : node.tag as CSSProperties['textAlign'] }
      props.className = 'bbcode-align'
      return createElement('div', props, children)
    case 'notice':
      props.className = 'bbcode-notice'
      return createElement('div', props, children)
    case 'heading':
      return createElement('h2', props, children)
    case 'list':
      return createElement(safeAttr ? 'ol' : 'ul', props, children.filter(
        (child) => typeof child !== 'string' || child.trim().length > 0,
      ))
    case '*':
      return createElement('li', props, children)
    default:
      return createElement('span', props, children)
  }
}

export function renderBbcode(value: string): ReactNode[] {
  return parseBbcode(value).map((node, index) => renderNode(node, `bbcode-${index}`))
}
