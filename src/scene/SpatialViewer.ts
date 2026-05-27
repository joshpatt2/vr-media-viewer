import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { SpatialPhotoLoader, StereoTextures } from '../media/SpatialPhotoLoader'

// Three.js layer assignments for stereo
const LEFT_EYE_LAYER = 1
const RIGHT_EYE_LAYER = 2

export class SpatialViewer {
  private scene: THREE.Scene
  private spatialLoader: SpatialPhotoLoader
  private group: THREE.Group
  private leftPlane: THREE.Mesh | null = null
  private rightPlane: THREE.Mesh | null = null
  private stereoTextures: StereoTextures | null = null

  // Viewing parameters
  private readonly screenDistance = 3
  private readonly screenHeight = 1.8

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.spatialLoader = new SpatialPhotoLoader()
    this.group = new THREE.Group()
    this.group.position.set(0, 1.6, -this.screenDistance)
    this.group.visible = false
    this.scene.add(this.group)
  }

  async loadMedia(item: MediaItem): Promise<void> {
    // Cleanup previous
    this.cleanup()

    try {
      // Load and decode the spatial photo
      this.stereoTextures = await this.spatialLoader.loadSpatialPhoto(item.url)

      // Calculate screen dimensions based on image aspect ratio
      const aspectRatio = this.stereoTextures.width / this.stereoTextures.height
      const screenWidth = this.screenHeight * aspectRatio

      // Create geometry (shared between both planes)
      const geometry = new THREE.PlaneGeometry(screenWidth, this.screenHeight)

      // Create left eye plane
      const leftMaterial = new THREE.MeshBasicMaterial({
        map: this.stereoTextures.left,
        side: THREE.FrontSide,
      })
      this.leftPlane = new THREE.Mesh(geometry, leftMaterial)
      this.leftPlane.layers.set(LEFT_EYE_LAYER) // Only visible to left eye
      this.leftPlane.name = 'spatial-left'
      this.leftPlane.castShadow = true
      this.group.add(this.leftPlane)

      // Create right eye plane
      const rightMaterial = new THREE.MeshBasicMaterial({
        map: this.stereoTextures.right,
        side: THREE.FrontSide,
      })
      this.rightPlane = new THREE.Mesh(geometry.clone(), rightMaterial)
      this.rightPlane.layers.set(RIGHT_EYE_LAYER) // Only visible to right eye
      this.rightPlane.name = 'spatial-right'
      this.rightPlane.castShadow = true
      this.group.add(this.rightPlane)

      // Also create a combined plane for non-VR viewing (shows left eye)
      const monoPlane = new THREE.Mesh(
        geometry.clone(),
        new THREE.MeshBasicMaterial({ map: this.stereoTextures.left })
      )
      monoPlane.layers.set(0) // Default layer for non-VR
      monoPlane.name = 'spatial-mono'
      monoPlane.userData.interactive = true
      monoPlane.castShadow = true
      this.group.add(monoPlane)

      // Add frame
      this.addFrame(screenWidth, this.screenHeight)

      this.group.visible = true

      console.log(`Spatial photo loaded: ${this.stereoTextures.width}x${this.stereoTextures.height}`)
    } catch (error) {
      console.error('Failed to load spatial photo:', error)
      throw error
    }
  }

  private addFrame(width: number, height: number): void {
    const frameWidth = 0.05
    const outerWidth = width + frameWidth * 2
    const outerHeight = height + frameWidth * 2

    const shape = new THREE.Shape()
    shape.moveTo(-outerWidth / 2, -outerHeight / 2)
    shape.lineTo(outerWidth / 2, -outerHeight / 2)
    shape.lineTo(outerWidth / 2, outerHeight / 2)
    shape.lineTo(-outerWidth / 2, outerHeight / 2)
    shape.closePath()

    const hole = new THREE.Path()
    hole.moveTo(-width / 2, -height / 2)
    hole.lineTo(width / 2, -height / 2)
    hole.lineTo(width / 2, height / 2)
    hole.lineTo(-width / 2, height / 2)
    hole.closePath()
    shape.holes.push(hole)

    const geometry = new THREE.ShapeGeometry(shape)
    const material = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
    })

    const frame = new THREE.Mesh(geometry, material)
    frame.position.z = -0.01
    frame.castShadow = true
    this.group.add(frame)
  }

  private cleanup(): void {
    // Remove all children from group
    while (this.group.children.length > 0) {
      const child = this.group.children[0]
      this.group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    }

    // Dispose textures
    if (this.stereoTextures) {
      this.stereoTextures.left.dispose()
      this.stereoTextures.right.dispose()
      this.stereoTextures = null
    }

    this.leftPlane = null
    this.rightPlane = null
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  get isVisible(): boolean {
    return this.group.visible
  }

  handleInteraction(): void {
    // Could toggle info overlay or something
  }

  dispose(): void {
    this.cleanup()
    this.scene.remove(this.group)
  }
}
