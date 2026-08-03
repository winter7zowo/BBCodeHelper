import { useEffect, useState, type KeyboardEvent } from 'react'
import { normalizeHex } from '../../utils/color'
import './styles.css'

interface ColorInputProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const commitDraft = () => {
    const normalized = normalizeHex(draft, value)
    setDraft(normalized)
    onChange(normalized)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
  }

  return (
    <label className="color-field">
      <span className="color-field__label">{label}</span>
      <span className="color-field__control">
        <span className="color-swatch" style={{ backgroundColor: value }}>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            aria-label={`${label}色板`}
          />
        </span>
        <input
          className="hex-input"
          value={draft}
          maxLength={7}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          aria-label={`${label}色值`}
          spellCheck={false}
        />
      </span>
    </label>
  )
}
