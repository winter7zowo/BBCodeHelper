import { createElement, type CSSProperties, type ReactNode } from 'react'
import type { BbcodeNode, GradientConfig } from '../types/editor'
import { generateGradientColors } from './color'

const TAG_PATTERN = /(\[[^\]\n]+\])/g

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

export function parseBbcode(value: string): Array<BbcodeNode | string> {
  const root: BbcodeNode = { tag: 'root', children: [] }
  const stack: BbcodeNode[] = [root]
  const tokens = value.split(TAG_PATTERN)

  tokens.forEach((token) => {
    const match = token.match(/^\[(\/)?(\*|[a-z][a-z0-9]*)(?:=([^\]]+))?\]$/i)
    if (!match) {
      stack[stack.length - 1]?.children.push(token)
      return
    }

    const [, closing, rawTag, attr] = match
    const tag = rawTag.toLowerCase()

    if (closing) {
      const matchingIndex = stack.map((node) => node.tag).lastIndexOf(tag)
      if (matchingIndex > 0) stack.splice(matchingIndex)
      else stack[stack.length - 1]?.children.push(token)
      return
    }

    const node: BbcodeNode = { tag, attr, children: [] }
    stack[stack.length - 1]?.children.push(node)
    stack.push(node)
  })

  return root.children
}

const FONT_SIZES: Record<string, string> = {
  '1': '0.75em',
  '2': '0.875em',
  '3': '1em',
  '4': '1.25em',
  '5': '1.5em',
  '6': '1.875em',
  '7': '2.25em',
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
      return createElement('s', props, children)
    case 'color':
      props.style = { color: /^#[\da-f]{3,8}$/i.test(safeAttr ?? '') ? safeAttr : undefined }
      return createElement('span', props, children)
    case 'size':
      props.style = { fontSize: FONT_SIZES[safeAttr ?? ''] ?? safeAttr }
      return createElement('span', props, children)
    case 'font':
      props.style = { fontFamily: safeAttr }
      return createElement('span', props, children)
    case 'url':
      props.href = /^https?:\/\//i.test(safeAttr ?? '') ? safeAttr : undefined
      props.target = '_blank'
      props.rel = 'noreferrer'
      return createElement('a', props, children)
    case 'quote':
      return createElement('blockquote', props, children)
    case 'center':
    case 'left':
    case 'right':
      props.style = { textAlign: node.tag as CSSProperties['textAlign'] }
      props.className = 'bbcode-align'
      return createElement('div', props, children)
    case 'align': {
      const alignment = ['left', 'center', 'right', 'justify'].includes(safeAttr ?? '')
        ? safeAttr as CSSProperties['textAlign']
        : 'left'
      props.style = { textAlign: alignment }
      props.className = 'bbcode-align'
      return createElement('div', props, children)
    }
    case 'notice':
    case 'alert': {
      const variants = ['info', 'success', 'warning', 'error']
      const meaningfulChildren = node.children.filter(
        (child) => typeof child !== 'string' || child.trim().length > 0,
      )
      const nestedNotice =
        meaningfulChildren.length === 1 &&
        typeof meaningfulChildren[0] !== 'string' &&
        ['notice', 'alert'].includes(meaningfulChildren[0].tag)
          ? meaningfulChildren[0]
          : null
      const attributes = [node.attr, nestedNotice?.attr].filter(Boolean) as string[]
      let kind = 'info'
      let title = ''

      attributes.forEach((attribute) => {
        const [first, ...rest] = attribute.split('|')
        if (variants.includes(first.toLowerCase())) {
          kind = first.toLowerCase()
          if (rest.length) title = rest.join('|')
        } else {
          title = attribute
        }
      })

      const noticeSource = nestedNotice?.children ?? node.children
      const noticeBody = noticeSource.map((child, index) =>
        renderNode(child, `${key}-notice-${index}`),
      )
      const noticeContent = title
        ? [
            createElement('strong', { key: `${key}-title`, className: 'bbcode-notice__title' }, title),
            createElement('div', { key: `${key}-body`, className: 'bbcode-notice__body' }, noticeBody),
          ]
        : noticeBody

      props.className = `bbcode-notice bbcode-notice--${kind}`
      return createElement('div', props, noticeContent)
    }
    case 'h1':
    case 'h2':
    case 'h3':
      return createElement(node.tag, props, children)
    case 'list':
      return createElement(safeAttr === '1' ? 'ol' : 'ul', props, children)
    case '*':
      return createElement('li', props, children)
    default:
      return createElement('span', props, children)
  }
}

export function renderBbcode(value: string): ReactNode[] {
  return parseBbcode(value).map((node, index) => renderNode(node, `bbcode-${index}`))
}
