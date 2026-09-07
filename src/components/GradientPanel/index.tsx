import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Palette } from 'lucide-react'
import clsx from 'clsx'
import { usePreferences } from '../../context/PreferencesContext'
import { ART_PRESETS, MODE_OPTIONS } from '../../data/presets'
import type { ArtPreset, GradientConfig, GradientStop } from '../../types/editor'
import { addNode, appendNode, getOffsetNodes, limitNodes, moveNode, removeNode } from '../../utils/gradientNodes'
import { ColorInput } from '../ColorInput'
import { ColorWheelPreview } from '../ColorWheelPreview'
import { GradientTrack } from '../GradientTrack'
import { NodeControls } from '../NodeControls'
import './styles.css'

interface GradientPanelProps {
  config: GradientConfig
  activePreset: string | null
  maxNodes: number
  onChange: (config: GradientConfig) => void
  onPreset: (preset: ArtPreset) => void
}

type VisualTab = 'space' | 'gradient'

export function GradientPanel({ config, activePreset, maxNodes, onChange, onPreset }: GradientPanelProps) {
  const { t } = usePreferences()
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [visualTab, setVisualTab] = useState<VisualTab>('gradient')
  const [selection, setSelection] = useState('')
  const hasMiddle = config.mode === 'three' || config.mode === 'offset'
  const showColorSpace = !['rainbow', 'mirror'].includes(config.mode)
  const stops = useMemo<GradientStop[]>(() => {
    if (config.mode === 'offset') return limitNodes(getOffsetNodes(config), maxNodes)
    if (config.mode === 'rainbow') return []
    const result = [{ id: 'start', position: 0, color: config.start }]
    if (config.mode === 'three') result.push({ id: 'middle', position: 50, color: config.middle })
    if (config.mode === 'mirror') result.push({ id: 'middle', position: 50, color: config.end })
    result.push({ id: 'end', position: 100, color: config.mode === 'mirror' ? config.start : config.end })
    return result
  }, [config, maxNodes])
  const selectedId = stops.some((stop) => stop.id === selection) ? selection : (stops[0]?.id ?? '')

  useEffect(() => {
    if (!showColorSpace) setVisualTab('gradient')
  }, [showColorSpace])
  const update = <Key extends keyof GradientConfig>(key: Key, value: GradientConfig[Key]) =>
    onChange({ ...config, [key]: value })

  const updateColor = (id: string, color: string) => {
    if (config.mode === 'offset') {
      update('nodes', stops.map((stop) => stop.id === id ? { ...stop, color } : stop))
    } else if (id === 'start' || id === 'middle' || id === 'end') {
      update(id, color)
    }
  }

  const addStop = (position?: number) => {
    if (config.mode !== 'offset' || stops.length >= maxNodes) return
    const id = crypto.randomUUID()
    const nodes = position === undefined
      ? appendNode(stops, maxNodes, id, config.start)
      : addNode(stops, position, maxNodes, id, config.start)
    if (nodes.length === stops.length) return
    update('nodes', nodes)
    setSelection(nodes.find((node) => !stops.some((stop) => stop.id === node.id))?.id ?? '')
  }

  const deleteStop = (id: string) => {
    if (config.mode !== 'offset') return
    const index = stops.findIndex((stop) => stop.id === id)
    const nodes = removeNode(stops, id)
    update('nodes', nodes)
    setSelection(nodes[Math.max(0, index - 1)]?.id ?? '')
  }

  return (
    <section className="gradient-card surface-card" aria-labelledby="gradient-title">
      <div className="section-heading compact-heading">
        <h2 id="gradient-title">{t('gradientStyle')}</h2>
        <Palette size={16} className="section-icon" />
      </div>

      <div className="control-group">
        <span className="control-label">{t('colorMode')}</span>
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
              <span>{t(mode.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {config.mode === 'offset' ? (
        <NodeControls nodes={stops} selectedId={selectedId} maxNodes={maxNodes}
          onSelect={setSelection} onColorChange={updateColor} onAdd={() => addStop()} onRemove={deleteStop} />
      ) : <div className={clsx('color-controls', hasMiddle && 'has-middle')}>
        <ColorInput label={t('startColor')} value={config.start} onChange={(value) => update('start', value)} />
        {hasMiddle && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <ColorInput
              label={t('middleColor')}
              value={config.middle}
              onChange={(value) => update('middle', value)}
            />
          </motion.div>
        )}
        <ColorInput label={t('endColor')} value={config.end} onChange={(value) => update('end', value)} />
      </div>}

      <div className="visualizer-card">
        <div
          className={clsx('visualizer-tabs', !showColorSpace && 'has-single-tab')}
          role="tablist"
          aria-label={t('colorPreview')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={visualTab === 'gradient'}
            className={clsx(visualTab === 'gradient' && 'is-active')}
            onClick={() => setVisualTab('gradient')}
          >
            {t('gradient')}
          </button>
          {showColorSpace && (
            <button
              type="button"
              role="tab"
              aria-selected={visualTab === 'space'}
              className={clsx(visualTab === 'space' && 'is-active')}
              onClick={() => setVisualTab('space')}
            >
              {t('colorSpace')}
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
                stops={stops}
                selectedId={selectedId}
                onSelect={setSelection}
                onColorChange={updateColor}
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
                stops={stops}
                selectedId={selectedId}
                onSelect={setSelection}
                onMove={(id, position) => update('nodes', moveNode(stops, id, position))}
                onAdd={addStop}
                onRemove={deleteStop}
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
          <span>{t('colorPresets')}</span>
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
              <div className="preset-grid" aria-label={t('colorPresets')}>
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
                    <span className="preset-card__name">{t(preset.nameKey)}</span>
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
