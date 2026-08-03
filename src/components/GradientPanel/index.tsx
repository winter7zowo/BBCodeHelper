import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Palette } from 'lucide-react'
import clsx from 'clsx'
import { ART_PRESETS, MODE_OPTIONS } from '../../data/presets'
import type { ArtPreset, GradientConfig } from '../../types/editor'
import { ColorInput } from '../ColorInput'
import { ColorWheelPreview } from '../ColorWheelPreview'
import { GradientTrack } from '../GradientTrack'
import './styles.css'

interface GradientPanelProps {
  config: GradientConfig
  activePreset: string | null
  onChange: (config: GradientConfig) => void
  onPreset: (preset: ArtPreset) => void
}

type VisualTab = 'space' | 'gradient'

export function GradientPanel({ config, activePreset, onChange, onPreset }: GradientPanelProps) {
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [visualTab, setVisualTab] = useState<VisualTab>('gradient')
  const hasMiddle = config.mode === 'three' || config.mode === 'offset'
  const showColorSpace = !['rainbow', 'mirror'].includes(config.mode)

  useEffect(() => {
    if (!showColorSpace) setVisualTab('gradient')
  }, [showColorSpace])
  const update = <Key extends keyof GradientConfig>(key: Key, value: GradientConfig[Key]) =>
    onChange({ ...config, [key]: value })

  return (
    <section className="gradient-card surface-card" aria-labelledby="gradient-title">
      <div className="section-heading compact-heading">
        <h2 id="gradient-title">渐变样式</h2>
        <Palette size={16} className="section-icon" />
      </div>

      <div className="control-group">
        <span className="control-label">染色方式</span>
        <div className="mode-selector">
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={clsx('mode-option', config.mode === mode.id && 'is-active')}
              onClick={() => {
                update('mode', mode.id)
                if (mode.id === 'offset') setVisualTab('gradient')
              }}
            >
              {config.mode === mode.id && (
                <motion.span className="mode-option__active" layoutId="active-gradient-mode" />
              )}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={clsx('color-controls', hasMiddle && 'has-middle')}>
        <ColorInput label="起始颜色" value={config.start} onChange={(value) => update('start', value)} />
        {hasMiddle && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <ColorInput
              label="中间颜色"
              value={config.middle}
              onChange={(value) => update('middle', value)}
            />
          </motion.div>
        )}
        <ColorInput label="结束颜色" value={config.end} onChange={(value) => update('end', value)} />
      </div>

      <div className="visualizer-card">
        <div
          className={clsx('visualizer-tabs', !showColorSpace && 'has-single-tab')}
          role="tablist"
          aria-label="颜色预览"
        >
          <button
            type="button"
            role="tab"
            aria-selected={visualTab === 'gradient'}
            className={clsx(visualTab === 'gradient' && 'is-active')}
            onClick={() => setVisualTab('gradient')}
          >
            渐变
          </button>
          {showColorSpace && (
            <button
              type="button"
              role="tab"
              aria-selected={visualTab === 'space'}
              className={clsx(visualTab === 'space' && 'is-active')}
              onClick={() => setVisualTab('space')}
            >
              色域
            </button>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {visualTab === 'space' && showColorSpace ? (
            <motion.div
              key="space"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
            >
              <ColorWheelPreview
                config={config}
                onColorChange={(stop, color) => update(stop, color)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="gradient"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
            >
              <GradientTrack
                config={config}
                onMiddlePositionChange={(position) => update('middlePosition', position)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="preset-disclosure">
        <button
          type="button"
          className="preset-toggle"
          aria-expanded={presetsOpen}
          onClick={() => setPresetsOpen((open) => !open)}
        >
          <span>推荐配色</span>
          <ChevronDown size={15} className={clsx(presetsOpen && 'is-open')} />
        </button>
        <AnimatePresence initial={false}>
          {presetsOpen && (
            <motion.div
              className="preset-grid-wrap"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="preset-grid" aria-label="推荐配色">
                {ART_PRESETS.map((preset) => (
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    key={preset.id}
                    type="button"
                    className={clsx('preset-card', activePreset === preset.id && 'is-active')}
                    onClick={() => onPreset(preset)}
                  >
                    <span
                      className="preset-card__preview"
                      style={{ background: `linear-gradient(120deg, ${preset.colors.join(', ')})` }}
                    />
                    <span className="preset-card__name">{preset.name}</span>
                    {activePreset === preset.id && (
                      <span className="preset-check">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}