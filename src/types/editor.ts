export type GradientMode = 'linear' | 'three' | 'rainbow' | 'mirror' | 'offset'

export interface GradientStop {
  id: string
  color: string
  position: number
}

export interface GradientConfig {
  mode: GradientMode
  start: string
  middle: string
  middlePosition: number
  end: string
  nodes?: GradientStop[]
}

export interface ArtPreset {
  id: string
  name: string
  colors: [string, string, string]
  mode: GradientMode
}

export interface BbcodeNode {
  tag: string
  attr?: string
  children: Array<BbcodeNode | string>
}
