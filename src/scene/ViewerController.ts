import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { MediaLoader } from '../media/MediaLoader'
import { FlatScreen } from './FlatScreen'
import { Sphere360, StereoMode } from './Sphere360'

export type ViewerMode = 'flat' | '360'

export class ViewerController {
  private flatScreen: FlatScreen
  private sphere360: Sphere360
  private currentMode: ViewerMode = 'flat'
  private currentItem: MediaItem | null = null

  constructor(scene: THREE.Scene, mediaLoader: MediaLoader) {
    this.flatScreen = new FlatScreen(scene, mediaLoader)
    this.sphere360 = new Sphere360(scene, mediaLoader)

    // Start with nothing visible
    this.flatScreen.setVisible(false)
    this.sphere360.setVisible(false)
  }

  async loadMedia(item: MediaItem): Promise<void> {
    this.currentItem = item

    // Determine mode based on media type
    const is360 = item.type === 'image-360' || item.type === 'video-360'
    const newMode: ViewerMode = is360 ? '360' : 'flat'

    // Detect stereo format from filename
    const stereoMode = this.detectStereoMode(item.name)

    // Hide current viewer
    this.hideAll()

    // Load into appropriate viewer
    if (newMode === '360') {
      await this.sphere360.loadMedia(item, stereoMode)
      this.sphere360.setVisible(true)
    } else {
      await this.flatScreen.loadMedia(item)
      this.flatScreen.setVisible(true)
    }

    this.currentMode = newMode
    console.log(`Loaded ${item.name} in ${newMode} mode (stereo: ${stereoMode})`)
  }

  private detectStereoMode(filename: string): StereoMode {
    const lower = filename.toLowerCase()

    if (lower.includes('_sbs') || lower.includes('-sbs') || lower.includes('sbs')) {
      return 'side-by-side'
    }
    if (lower.includes('_ou') || lower.includes('-ou') || lower.includes('_tb') || lower.includes('-tb')) {
      return 'over-under'
    }
    if (lower.includes('3d')) {
      // Default 3D to side-by-side
      return 'side-by-side'
    }

    return 'mono'
  }

  private hideAll(): void {
    this.flatScreen.setVisible(false)
    this.sphere360.setVisible(false)
  }

  handleInteraction(object: THREE.Object3D): void {
    if (this.currentMode === 'flat') {
      this.flatScreen.handleInteraction(object)
    } else {
      this.sphere360.handleInteraction()
    }
  }

  toggleMode(): void {
    // Manual toggle between flat and 360 for same content
    if (!this.currentItem) return

    if (this.currentMode === 'flat') {
      this.currentMode = '360'
      this.flatScreen.setVisible(false)
      // Would need to reload texture into sphere
    } else {
      this.currentMode = 'flat'
      this.sphere360.setVisible(false)
      this.flatScreen.setVisible(true)
    }
  }

  getMode(): ViewerMode {
    return this.currentMode
  }

  getFlatScreen(): FlatScreen {
    return this.flatScreen
  }

  getSphere360(): Sphere360 {
    return this.sphere360
  }

  dispose(): void {
    this.flatScreen.dispose()
    this.sphere360.dispose()
  }
}
