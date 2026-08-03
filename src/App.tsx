import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EditorPanel } from './components/EditorPanel'
import { GradientPanel } from './components/GradientPanel'
import { Header } from './components/Header'
import { PreviewPanel } from './components/PreviewPanel'
import { Toast } from './components/Toast'
import type { ArtPreset, GradientConfig } from './types/editor'
import { applyGradientToBbcode } from './utils/bbcode'
import './App.css'

const DEFAULT_SOURCE = `This is the sample text.`

const DEFAULT_CONFIG: GradientConfig = {
  mode: 'three',
  start: '#8B5CF6',
  middle: '#22D3EE',
  middlePosition: 50,
  end: '#34D399',
}

const STORAGE_KEY = 'chromacode-state-v2'

type StoredEditorState = {
  source?: string
  config?: Omit<Partial<GradientConfig>, 'mode'> & {
    mode?: GradientConfig['mode'] | 'alternate'
  }
  preset?: string | null
}

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredEditorState
  } catch {
    return null
  }
}

function App() {
  const stored = useMemo(loadStoredState, [])
  const [source, setSource] = useState(stored?.source ?? DEFAULT_SOURCE)
  const [config, setConfig] = useState<GradientConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...stored?.config,
    mode: stored?.config?.mode === 'alternate' ? 'offset' : (stored?.config?.mode ?? DEFAULT_CONFIG.mode),
    middlePosition: stored?.config?.middlePosition ?? DEFAULT_CONFIG.middlePosition,
  }))
  const [activePreset, setActivePreset] = useState<string | null>(stored?.preset ?? 'aurora')
  const [toast, setToast] = useState<string | null>(null)

  const output = useMemo(() => applyGradientToBbcode(source, config), [source, config])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ source, config, preset: activePreset }),
    )
  }, [source, config, activePreset])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const handleConfigChange = (nextConfig: GradientConfig) => {
    setConfig(nextConfig)
    setActivePreset(null)
  }

  const handlePreset = (preset: ArtPreset) => {
    setConfig({
      mode: preset.mode,
      start: preset.colors[0],
      middle: preset.colors[1],
      middlePosition: 50,
      end: preset.colors[2],
    })
    setActivePreset(preset.id)
  }

  const resetEditor = () => {
    setSource(DEFAULT_SOURCE)
    setConfig(DEFAULT_CONFIG)
    setActivePreset('aurora')
    setToast('已重置')
  }

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
            <EditorPanel value={source} onChange={setSource} />
            <GradientPanel
              config={config}
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
              onCopied={() => setToast('BBCode 已复制')}
            />
          </motion.div>
        </div>
      </main>
      <Toast message={toast} />
    </div>
  )
}

export default App
