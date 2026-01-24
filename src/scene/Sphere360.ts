import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { MediaLoader } from '../media/MediaLoader'
import { VideoController } from '../media/VideoController'

export type StereoMode = 'mono' | 'side-by-side' | 'over-under'

export class Sphere360 {
  private scene: THREE.Scene
  private mediaLoader: MediaLoader
  private sphere: THREE.Mesh
  private currentItem: MediaItem | null = null
  private videoController: VideoController | null = null
  private stereoMode: StereoMode = 'mono'

  // For stereo rendering
  private leftEyeMaterial: THREE.MeshBasicMaterial
  private rightEyeMaterial: THREE.MeshBasicMaterial

  constructor(scene: THREE.Scene, mediaLoader: MediaLoader) {
    this.scene = scene
    this.mediaLoader = mediaLoader

    // Create inverted sphere (viewer is inside)
    const geometry = new THREE.SphereGeometry(500, 60, 40)
    geometry.scale(-1, 1, 1) // Invert normals

    this.leftEyeMaterial = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0x000000,
    })
    this.rightEyeMaterial = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0x000000,
    })

    this.sphere = new THREE.Mesh(geometry, this.leftEyeMaterial)
    this.sphere.name = 'sphere-360'
    this.sphere.userData.interactive = true
    this.sphere.visible = false
    this.sphere.layers.enable(1) // Left eye
    this.sphere.layers.enable(2) // Right eye

    this.scene.add(this.sphere)
  }

  async loadMedia(item: MediaItem, stereoMode: StereoMode = 'mono'): Promise<void> {
    // Cleanup previous
    if (this.currentItem) {
      this.mediaLoader.disposeItem(this.currentItem.id)
    }
    this.videoController = null

    this.currentItem = item
    this.stereoMode = stereoMode

    const texture = await this.mediaLoader.loadTexture(item)
    texture.colorSpace = THREE.SRGBColorSpace

    // Apply texture based on stereo mode
    this.applyTexture(texture)

    // Setup video controls if video
    if (item.type === 'video-360') {
      const video = this.mediaLoader.getVideoElement(item.id)
      if (video) {
        this.videoController = new VideoController(video)
        // Auto-play 360 videos
        this.videoController.play()
      }
    }

    this.sphere.visible = true
  }

  private applyTexture(texture: THREE.Texture): void {
    if (this.stereoMode === 'mono') {
      // Same texture for both eyes
      this.leftEyeMaterial.map = texture
      this.rightEyeMaterial.map = texture
    } else if (this.stereoMode === 'side-by-side') {
      // Left half for left eye, right half for right eye
      this.leftEyeMaterial.map = this.createStereoTexture(texture, 'left', 'horizontal')
      this.rightEyeMaterial.map = this.createStereoTexture(texture, 'right', 'horizontal')
    } else if (this.stereoMode === 'over-under') {
      // Top half for left eye, bottom half for right eye
      this.leftEyeMaterial.map = this.createStereoTexture(texture, 'left', 'vertical')
      this.rightEyeMaterial.map = this.createStereoTexture(texture, 'right', 'vertical')
    }

    this.leftEyeMaterial.color.setHex(0xffffff)
    this.rightEyeMaterial.color.setHex(0xffffff)
    this.leftEyeMaterial.needsUpdate = true
    this.rightEyeMaterial.needsUpdate = true
  }

  private createStereoTexture(
    source: THREE.Texture,
    eye: 'left' | 'right',
    layout: 'horizontal' | 'vertical'
  ): THREE.Texture {
    const texture = source.clone()
    texture.needsUpdate = true

    if (layout === 'horizontal') {
      // Side-by-side: left eye = left half, right eye = right half
      texture.repeat.set(0.5, 1)
      texture.offset.set(eye === 'left' ? 0 : 0.5, 0)
    } else {
      // Over-under: left eye = top half, right eye = bottom half
      texture.repeat.set(1, 0.5)
      texture.offset.set(0, eye === 'left' ? 0.5 : 0)
    }

    return texture
  }

  handleInteraction(): void {
    // Toggle video playback on sphere click
    if (this.videoController) {
      this.videoController.toggle()
    }
  }

  setVisible(visible: boolean): void {
    this.sphere.visible = visible
  }

  get isVisible(): boolean {
    return this.sphere.visible
  }

  get isVideoPlaying(): boolean {
    return this.videoController?.getState().playing ?? false
  }

  getVideoController(): VideoController | null {
    return this.videoController
  }

  dispose(): void {
    if (this.currentItem) {
      this.mediaLoader.disposeItem(this.currentItem.id)
    }
    this.sphere.geometry.dispose()
    this.leftEyeMaterial.dispose()
    this.rightEyeMaterial.dispose()
    this.scene.remove(this.sphere)
  }
}
