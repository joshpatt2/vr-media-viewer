import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { MediaLoader } from '../media/MediaLoader'
import { FlatScreen } from './FlatScreen'
import { Sphere360, StereoMode } from './Sphere360'
import { PanoViewer } from './PanoViewer'

export type ViewerMode = 'flat' | '360' | 'pano'

export class ViewerController {
  private flatScreen: FlatScreen
  private sphere360: Sphere360
  private panoViewer: PanoViewer
  private currentMode: ViewerMode = 'flat'

  constructor(scene: THREE.Scene, mediaLoader: MediaLoader) {
    this.flatScreen = new FlatScreen(scene, mediaLoader)
    this.sphere360 = new Sphere360(scene, mediaLoader)
    this.panoViewer = new PanoViewer(scene, mediaLoader)

    // Start with nothing visible
    this.flatScreen.setVisible(false)
    this.sphere360.setVisible(false)
    this.panoViewer.setVisible(false)
  }

  async loadMedia(item: MediaItem): Promise<void> {
    // Determine mode based on media type
    let newMode: ViewerMode
    if (item.type === 'image-360' || item.type === 'video-360') {
      newMode = '360'
    } else if (item.type === 'image-pano' || item.type === 'video-pano') {
      newMode = 'pano'
    } else {
      newMode = 'flat'
    }

    // Detect stereo format from filename (for 360 content)
    const stereoMode = this.detectStereoMode(item.name)

    // Hide current viewer
    this.hideAll()

    // Load into appropriate viewer
    if (newMode === '360') {
      await this.sphere360.loadMedia(item, stereoMode)
      this.sphere360.setVisible(true)
    } else if (newMode === 'pano') {
      await this.panoViewer.loadMedia(item)
      this.panoViewer.setVisible(true)
    } else {
      await this.flatScreen.loadMedia(item)
      this.flatScreen.setVisible(true)
    }

    this.currentMode = newMode
    console.log(`Loaded ${item.name} in ${newMode} mode`)
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
      return 'side-by-side'
    }

    return 'mono'
  }

  private hideAll(): void {
    this.flatScreen.setVisible(false)
    this.sphere360.setVisible(false)
    this.panoViewer.setVisible(false)
  }

  handleInteraction(object: THREE.Object3D): void {
    if (this.currentMode === 'flat') {
      this.flatScreen.handleInteraction(object)
    } else if (this.currentMode === '360') {
      this.sphere360.handleInteraction()
    } else if (this.currentMode === 'pano') {
      this.panoViewer.handleInteraction()
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

  getPanoViewer(): PanoViewer {
    return this.panoViewer
  }

  dispose(): void {
    this.flatScreen.dispose()
    this.sphere360.dispose()
    this.panoViewer.dispose()
  }
}
