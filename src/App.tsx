import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { EditorPanel } from './components/EditorPanel'
import { GradientPanel } from './components/GradientPanel'
import { Header } from './components/Header'
import { PreviewPanel } from './components/PreviewPanel'
import { Toast } from './components/Toast'
import { SettingsPanel } from './components/SettingsPanel'
import { usePreferences } from './context/PreferencesContext'
import type { TranslationKey } from './i18n'
import { useDebouncedStorage } from './hooks/useDebouncedStorage'
import type { ArtPreset, GradientConfig } from './types/editor'
import { applyGradientToBbcode, getVisibleCharacters } from './utils/bbcode'
import { normalizeHex } from './utils/color'
import { getOffsetNodes, limitNodes, normalizeNodes } from './utils/gradientNodes'
import './App.css'

const DEFAULT_SOURCE = `This is the sample text.`

const DEFAULT_CONFIG: GradientConfig = {
  mode: 'linear',
  start: '#8B5CF6',
  middle: '#22D3EE',
  middlePosition: 50,
  end: '#34D399',
}

const STORAGE_KEY = 'chromacode-state-v2'

interface EditorState {
  source: string
  config: GradientConfig
  preset: string | null
}

function constrainNodes(config: GradientConfig, maxNodes: number): GradientConfig {
  if (config.mode !== 'offset' && config.nodes === undefined) return config
  const nodes = config.nodes ?? getOffsetNodes(config)
  if (maxNodes > 0 && nodes.length === 0) {
    return { ...config, nodes: [{ id: 'start', color: config.start, position: 0 }] }
  }
  if (config.nodes === nodes && nodes.length <= maxNodes) return config
  return { ...config, nodes: limitNodes(nodes, maxNodes) }
}

function loadStoredState(): EditorState {
  const defaults: EditorState = {
    source: DEFAULT_SOURCE,
    config: DEFAULT_CONFIG,
    preset: null,
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const stored: unknown = JSON.parse(raw)
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults
    const saved = stored as Record<string, unknown>
    const source = typeof saved.source === 'string' ? saved.source : DEFAULT_SOURCE
    const rawConfig = saved.config && typeof saved.config === 'object' && !Array.isArray(saved.config)
      ? saved.config as Record<string, unknown>
      : {}
    const savedColor = (key: 'start' | 'middle' | 'end') => typeof rawConfig[key] === 'string'
      ? normalizeHex(rawConfig[key], DEFAULT_CONFIG[key])
      : DEFAULT_CONFIG[key]
    const config: GradientConfig = {
      // Every new visit opens the two-colour tab, including saved drafts.
      mode: DEFAULT_CONFIG.mode,
      start: savedColor('start'),
      middle: savedColor('middle'),
      end: savedColor('end'),
      middlePosition: typeof rawConfig.middlePosition === 'number' && Number.isFinite(rawConfig.middlePosition)
        ? Math.min(95, Math.max(5, rawConfig.middlePosition))
        : DEFAULT_CONFIG.middlePosition,
      ...(Array.isArray(rawConfig.nodes) ? { nodes: normalizeNodes(rawConfig.nodes) } : {}),
    }
    return {
      source,
      config: constrainNodes(config, getVisibleCharacters(source).length),
      preset: null,
    }
  } catch {
    return defaults
  }
}

function App() {
  const { t } = usePreferences()
  const [editor, setEditor] = useState<EditorState>(loadStoredState)
  const { source, config, preset: activePreset } = editor
  const [toast, setToast] = useState<TranslationKey | null>(null)
  const maxNodes = useMemo(() => getVisibleCharacters(source).length, [source])
  const previewInput = useMemo(() => ({ source, config }), [source, config])
  const deferredPreview = useDeferredValue(previewInput)
  const output = useMemo(
    () => applyGradientToBbcode(deferredPreview.source, deferredPreview.config),
    [deferredPreview],
  )
  const latestInput = useRef(previewInput)

  useLayoutEffect(() => {
    latestInput.current = previewInput
  }, [previewInput])

  useDebouncedStorage(STORAGE_KEY, editor)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const handleSourceChange = useCallback((nextSource: string) => {
    const nextMaxNodes = getVisibleCharacters(nextSource).length
    setEditor((current) => ({
      ...current,
      source: nextSource,
      config: constrainNodes(current.config, nextMaxNodes),
    }))
  }, [])

  const handleConfigChange = useCallback((nextConfig: GradientConfig) => {
    setEditor((current) => ({
      ...current,
      config: constrainNodes(nextConfig, maxNodes),
      preset: null,
    }))
  }, [maxNodes])

  const handlePreset = useCallback((preset: ArtPreset) => {
    setEditor((current) => ({
      ...current,
      config: constrainNodes({
        mode: preset.mode,
        start: preset.colors[0],
        middle: preset.colors[1],
        middlePosition: 50,
        end: preset.colors[2],
      }, maxNodes),
      preset: preset.id,
    }))
  }, [maxNodes])

  const resetEditor = useCallback(() => {
    setEditor({ source: DEFAULT_SOURCE, config: DEFAULT_CONFIG, preset: null })
    setToast('resetDone')
  }, [])

  const handleCopied = useCallback(() => setToast('copied'), [])
  const getCopyOutput = useCallback(() => {
    const latest = latestInput.current
    return applyGradientToBbcode(latest.source, latest.config)
  }, [])

  return (
    <div className="app min-h-screen">
      <Header onReset={resetEditor} />
      <main className="workspace">
        <div className="workspace-grid">
          <motion.div
            className="work-column"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.06 }}
          >
            <EditorPanel value={source} onChange={handleSourceChange} />
            <GradientPanel
              config={config}
              maxNodes={maxNodes}
              activePreset={activePreset}
              onChange={handleConfigChange}
              onPreset={handlePreset}
            />
          </motion.div>

          <motion.div
            className="preview-column"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.12 }}
          >
            <PreviewPanel
              output={output}
              onCopied={handleCopied}
              getCopyOutput={getCopyOutput}
            />
          </motion.div>
        </div>
      </main>
      <Toast message={toast ? t(toast) : null} />
      <SettingsPanel />
    </div>
  )
}

export default App
