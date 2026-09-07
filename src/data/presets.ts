import type { ArtPreset } from '../types/editor'
import type { TranslationKey } from '../i18n'

export const ART_PRESETS: Array<ArtPreset & { nameKey: TranslationKey }> = [
  {
    id: 'aurora',
    name: '极光',
    nameKey: 'presetAurora',
    colors: ['#8B5CF6', '#22D3EE', '#34D399'],
    mode: 'three',
  },
  {
    id: 'sunset',
    name: '日落',
    nameKey: 'presetSunset',
    colors: ['#FF5F6D', '#FF9966', '#FFC371'],
    mode: 'three',
  },
  {
    id: 'ocean',
    name: '深海',
    nameKey: 'presetOcean',
    colors: ['#2563EB', '#06B6D4', '#67E8F9'],
    mode: 'three',
  },
  {
    id: 'candy',
    name: '糖果',
    nameKey: 'presetCandy',
    colors: ['#EC4899', '#A855F7', '#60A5FA'],
    mode: 'three',
  },
  {
    id: 'ember',
    name: '熔岩',
    nameKey: 'presetEmber',
    colors: ['#EF4444', '#F97316', '#FACC15'],
    mode: 'mirror',
  },
  {
    id: 'silver',
    name: '银翼',
    nameKey: 'presetSilver',
    colors: ['#71717A', '#F4F4F5', '#A1A1AA'],
    mode: 'three',
  },
]

export const MODE_OPTIONS = [
  { id: 'linear', label: '双色', labelKey: 'modeLinear' },
  { id: 'three', label: '三色', labelKey: 'modeThree' },
  { id: 'offset', label: '偏移', labelKey: 'modeOffset' },
  { id: 'mirror', label: '镜像', labelKey: 'modeMirror' },
  { id: 'rainbow', label: '彩虹', labelKey: 'modeRainbow' },
] as const
