export interface EditorSelectionResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

function clampSelectionIndex(index: number, length: number): number {
  return Math.min(length, Math.max(0, Number.isNaN(index) ? 0 : Math.trunc(index)))
}

/**
 * Match osu!'s toolbar insertion: an empty caret stays between tags, while an
 * existing selection expands to include the inserted tags. Repeated actions nest.
 * https://github.com/ppy/osu-web/blob/master/resources/js/forum/post-box.coffee#L4-L29
 */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  openTag: string,
  closeTag: string,
): EditorSelectionResult {
  const first = clampSelectionIndex(start, value.length)
  const second = clampSelectionIndex(end, value.length)
  const selectionStart = Math.min(first, second)
  const selectionEnd = Math.max(first, second)
  const selected = value.slice(selectionStart, selectionEnd)
  const replacement = `${openTag}${selected}${closeTag}`
  const nextValue = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`

  if (selectionStart === selectionEnd) {
    const caret = selectionStart + openTag.length
    return { value: nextValue, selectionStart: caret, selectionEnd: caret }
  }

  return {
    value: nextValue,
    selectionStart,
    selectionEnd: selectionStart + replacement.length,
  }
}
