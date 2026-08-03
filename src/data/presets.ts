import type { ArtPreset } from '../types/editor'

export const ART_PRESETS: ArtPreset[] = [
  {
    id: 'aurora',
    name: '极光',
    colors: ['#8B5CF6', '#22D3EE', '#34D399'],
    mode: 'three',
  },
  {
    id: 'sunset',
    name: '日落',
    colors: ['#FF5F6D', '#FF9966', '#FFC371'],
    mode: 'three',
  },
  {
    id: 'ocean',
    name: '深海',
    colors: ['#2563EB', '#06B6D4', '#67E8F9'],
    mode: 'three',
  },
  {
    id: 'candy',
    name: '糖果',
    colors: ['#EC4899', '#A855F7', '#60A5FA'],
    mode: 'three',
  },
  {
    id: 'ember',
    name: '熔岩',
    colors: ['#EF4444', '#F97316', '#FACC15'],
    mode: 'mirror',
  },
  {
    id: 'silver',
    name: '银翼',
    colors: ['#71717A', '#F4F4F5', '#A1A1AA'],
    mode: 'three',
  },
]

export const MODE_OPTIONS = [
  { id: 'linear', label: '双色' },
  { id: 'three', label: '三色' },
  { id: 'offset', label: '偏移' },
  { id: 'mirror', label: '镜像' },
  { id: 'rainbow', label: '彩虹' },
] as const
