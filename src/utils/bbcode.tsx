import { createElement, type CSSProperties, type ReactNode } from 'react'
import type { BbcodeNode, GradientConfig } from '../types/editor'
import { generateGradientColors } from './color'

const TAG_PATTERN = /(\[[^\]\n]+\])/g
// Preview the text-formatting tags used by osu!, keeping other markup visible.
const PREVIEW_TAGS = new Set([
  'b', 'i', 'u', 's', 'strike', 'color', 'size', 'url', 'email', 'quote',
  'centre', 'left', 'right', 'notice', 'heading', 'c', 'list', '*',
])
const PROTECTED_TAGS = new Set(['img', 'audio', 'youtube', 'imagemap', 'code', 'url', 'email'])
const RAW_PREVIEW_TAGS = new Set(['img', 'code', 'url', 'email'])

interface ScannedToken {
  value: string
  protectedContent?: { tag: string; content: string }
}

function appendTextTokens(value: string, tokens: ScannedToken[]): void {
  const linkPattern = /\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"'\[\]，。！？；：、…“”‘’（）【】《》「」『』]+|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
  let start = 0
  for (const match of value.matchAll(linkPattern)) {
    const index = match.index ?? 0
    let content = match[0].replace(/[.,!?;:]+$/u, '')
    // A wrapping sentence's closing parenthesis is not part of the address.
    let extraClosings = (content.match(/\)/g)?.length ?? 0) - (content.match(/\(/g)?.length ?? 0)
    let contentEnd = content.length
    while (content[contentEnd - 1] === ')' && extraClosings-- > 0) contentEnd--
    content = content.slice(0, contentEnd)
    const tag = /^(?:https?:\/\/|ftp:\/\/|www\.)/i.test(content) ? 'url' : 'email'
    if (!(tag === 'url' ? safeLinkUrl(content) : safeEmailUrl(content))) continue
    if (index > start) tokens.push({ value: value.slice(start, index) })
    tokens.push({ value: content, protectedContent: { tag, content } })
    start = index + content.length
  }
  if (start < value.length) tokens.push({ value: value.slice(start) })
}

/** Keep paired media, literal code, and implicit link targets out of the colour stream. */
function scanBbcode(value: string): ScannedToken[] {
  const parts = value.split(TAG_PATTERN)
  const matchingCloses = new Map<number, number>()
  const nextCloses = new Map<string, number>()

  // Looking up closing tags once also keeps incomplete input linear in size.
  for (let index = parts.length - 1; index >= 0; index--) {
    const match = parts[index].match(/^\[(\/)?([a-z]+)\]$/i)
    if (!match) continue
    const tag = match[2].toLowerCase()
    if (!PROTECTED_TAGS.has(tag)) continue
    if (match[1]) nextCloses.set(tag, index)
    else {
      const closeIndex = nextCloses.get(tag)
      if (closeIndex !== undefined) matchingCloses.set(index, closeIndex)
    }
  }

  const tokens: ScannedToken[] = []
  let linkDepth = 0
  for (let index = 0; index < parts.length; index++) {
    const closeIndex = matchingCloses.get(index)
    if (closeIndex === undefined) {
      const part = parts[index]
      const linkTag = part.match(/^\[(\/)?(?:url|email)(?:=[^\]]+)?\]$/i)
      if (linkTag) linkDepth = Math.max(0, linkDepth + (linkTag[1] ? -1 : 1))
      if (linkDepth > 0 || isTag(part)) tokens.push({ value: part })
      else appendTextTokens(part, tokens)
      continue
    }
    tokens.push({
      value: parts.slice(index, closeIndex + 1).join(''),
      protectedContent: {
        tag: parts[index].slice(1, -1).toLowerCase(),
        content: parts.slice(index + 1, closeIndex).join(''),
      },
    })
    index = closeIndex
  }
  return tokens
}

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

function getColorableCharacters(tokens: ScannedToken[]): string[] {
  return tokens
    .filter((token) => !token.protectedContent && !isTag(token.value))
    .flatMap((token) => toGraphemes(token.value))
    .filter((char) => !/\s/u.test(char))
}

export function getVisibleCharacters(value: string): string[] {
  return getColorableCharacters(scanBbcode(value))
}

export function applyGradientToBbcode(value: string, config: GradientConfig): string {
  const tokens = scanBbcode(value)
  const visibleCharacters = getColorableCharacters(tokens)
  const colors = generateGradientColors(visibleCharacters.length, config)
  let colorIndex = 0

  return tokens
    .map((token) => {
      if (token.protectedContent || isTag(token.value)) return token.value

      return toGraphemes(token.value)
        .map((char) => {
          if (/\s/u.test(char)) return char
          const color = colors[colorIndex++]
          return color ? `[color=${color}]${char}[/color]` : char
        })
        .join('')
    })
    .join('')
}

function hasCloseOnSameLine(tokens: string[], start: number, tag: string): boolean {
  for (let index = start + 1; index < tokens.length; index += 1) {
    if (/[\r\n]/.test(tokens[index])) return false
    if (tokens[index].toLowerCase() === `[/${tag}]`) return true
  }
  return false
}

function trimNodeTextBoundary(node: BbcodeNode, side: 'start' | 'end', pattern: RegExp): void {
  const step = side === 'start' ? 1 : -1
  let index = side === 'start' ? 0 : node.children.length - 1
  while (index >= 0 && index < node.children.length) {
    const child = node.children[index]
    if (typeof child !== 'string') return
    if (child.length) {
      node.children[index] = child.replace(pattern, '')
      return
    }
    index += step
  }
}

function trimClosedBlock(node: BbcodeNode): number {
  switch (node.tag) {
    case 'centre':
    case 'left':
    case 'right':
      trimNodeTextBoundary(node, 'start', /^(?:\r\n|\r|\n)/)
      return 1
    case 'notice':
      trimNodeTextBoundary(node, 'start', /^[\r\n]+/)
      trimNodeTextBoundary(node, 'end', /[\r\n]+$/)
      return 1
    case 'quote':
      trimNodeTextBoundary(node, 'start', /^\s+/)
      trimNodeTextBoundary(node, 'end', /\s+$/)
      return 2
    case 'list':
      return 2
    case 'heading':
      return 1
    default:
      return 0
  }
}

export function parseBbcode(value: string): Array<BbcodeNode | string> {
  const root: BbcodeNode = { tag: 'root', children: [] }
  const stack: BbcodeNode[] = [root]
  const scannedTokens = scanBbcode(value)
  const tokens = scannedTokens.map((token) => token.value)
  let lineBreaksToConsume = 0
  const listBoundaries = new WeakMap<BbcodeNode, Array<{ parent: BbcodeNode; index: number }>>()

  const rememberListBoundary = (list: BbcodeNode) => {
    const parent = stack[stack.length - 1]
    let index = parent.children.length - 1
    while (index >= 0 && parent.children[index] === '') index--
    if (typeof parent.children[index] !== 'string') return
    const boundaries = listBoundaries.get(list) ?? []
    boundaries.push({ parent, index })
    listBoundaries.set(list, boundaries)
  }

  scannedTokens.forEach(({ value: originalToken, protectedContent }, tokenIndex) => {
    let token = originalToken
    if (lineBreaksToConsume) {
      if (!protectedContent) {
        for (let count = 0; count < lineBreaksToConsume; count++) token = token.replace(/^(?:\r\n|\r|\n)/, '')
      }
      lineBreaksToConsume = 0
    }
    if (protectedContent) {
      const { tag, content } = protectedContent
      const node = RAW_PREVIEW_TAGS.has(tag)
        ? { tag, children: [content], raw: token }
        : token
      stack[stack.length - 1]?.children.push(node)
      return
    }
    const match = token.match(/^\[(\/)?(\*|[a-z][a-z0-9]*)(?:=([^\]]+))?\]$/i)
    if (!match) {
      stack[stack.length - 1]?.children.push(token)
      return
    }

    const [, closing, rawTag, attr] = match
    const tag = rawTag.toLowerCase()

    if (!PREVIEW_TAGS.has(tag) || (!closing && (
      (tag === 'notice' && attr !== undefined) ||
      ((tag === 'heading' || tag === 'c') && (attr !== undefined || !hasCloseOnSameLine(tokens, tokenIndex, tag))) ||
      ((tag === 'url' || tag === 'email') && attr === undefined) ||
      (tag === 'size' && !/^\d+$/.test(attr ?? ''))
    ))) {
      stack[stack.length - 1]?.children.push(token)
      return
    }

    if (closing) {
      const matchingIndex = stack.map((node) => node.tag).lastIndexOf(tag)
      if (matchingIndex > 0) {
        const node = stack[matchingIndex]
        if (tag === 'list') {
          rememberListBoundary(node)
          for (const { parent, index } of listBoundaries.get(node) ?? []) {
            const child = parent.children[index]
            if (typeof child === 'string') parent.children[index] = child.replace(/\s+$/, '')
          }
        }
        lineBreaksToConsume = trimClosedBlock(node)
        stack.splice(matchingIndex)
      }
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
      rememberListBoundary(stack[listIndex])
      stack.splice(listIndex + 1)
    }

    const node: BbcodeNode = { tag, attr, children: [] }
    stack[stack.length - 1]?.children.push(node)
    stack.push(node)
  })

  return root.children
}

function safeLinkUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  const candidate = trimmed?.match(/^www\./i) ? `https://${trimmed}` : trimmed
  if (!candidate || !/^(?:https?|ftp):\/\//i.test(candidate) || /[\s<>"\[\]]/.test(candidate)) return undefined
  try {
    return new URL(candidate).hostname ? candidate : undefined
  } catch {
    return undefined
  }
}

function safeHttpUrl(value: string | undefined): string | undefined {
  return /^https?:\/\//i.test(value?.trim() ?? '') ? safeLinkUrl(value) : undefined
}

function safeEmailUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim()
  return candidate && /^[^\s@<>"\[\]:]+@[^\s@<>"\[\]:]+\.[^\s@<>"\[\]:]+$/.test(candidate)
    ? `mailto:${candidate}`
    : undefined
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
      props.href = safeLinkUrl(safeAttr ?? node.children.filter((child) => typeof child === 'string').join(''))
      props.target = '_blank'
      props.rel = 'noreferrer'
      return createElement('a', props, children)
    case 'email':
      props.href = safeEmailUrl(safeAttr ?? node.children.filter((child) => typeof child === 'string').join(''))
      return createElement('a', props, children)
    case 'img': {
      const src = safeHttpUrl(node.children.filter((child) => typeof child === 'string').join(''))
      return src
        ? createElement('img', { ...props, src, alt: '', loading: 'lazy', className: 'bbcode-image' })
        : node.raw ?? children
    }
    case 'c':
      return createElement('code', { ...props, className: 'bbcode-inline-code' }, children)
    case 'code':
      return createElement('pre', { ...props, className: 'bbcode-code' }, createElement('code', null, children))
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
