import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { MediaLoader } from '../media/MediaLoader'
import { VideoController, VideoState } from '../media/VideoController'

export class FlatScreen {
  private scene: THREE.Scene
  private mediaLoader: MediaLoader
  private group: THREE.Group
  private screen: THREE.Mesh
  private frame: THREE.Mesh
  private controls: ScreenControls | null = null
  private currentItem: MediaItem | null = null
  private videoController: VideoController | null = null

  // Screen dimensions
  private readonly baseWidth = 3.2 // meters (roughly 16:9 at 1.8m height)
  private readonly baseHeight = 1.8
  private readonly screenDistance = 4 // meters from origin

  constructor(scene: THREE.Scene, mediaLoader: MediaLoader) {
    this.scene = scene
    this.mediaLoader = mediaLoader
    this.group = new THREE.Group()
    this.group.position.set(0, 1.6, -this.screenDistance)

    // Create screen mesh
    this.screen = this.createScreen()
    this.group.add(this.screen)

    // Create frame
    this.frame = this.createFrame()
    this.group.add(this.frame)

    this.scene.add(this.group)
  }

  private createScreen(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.baseWidth, this.baseHeight)
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.FrontSide,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = 'flat-screen'
    mesh.userData.interactive = true
    mesh.castShadow = true

    return mesh
  }

  private createFrame(): THREE.Mesh {
    const frameWidth = 0.05
    const outerWidth = this.baseWidth + frameWidth * 2
    const outerHeight = this.baseHeight + frameWidth * 2

    const shape = new THREE.Shape()
    shape.moveTo(-outerWidth / 2, -outerHeight / 2)
    shape.lineTo(outerWidth / 2, -outerHeight / 2)
    shape.lineTo(outerWidth / 2, outerHeight / 2)
    shape.lineTo(-outerWidth / 2, outerHeight / 2)
    shape.closePath()

    const hole = new THREE.Path()
    hole.moveTo(-this.baseWidth / 2, -this.baseHeight / 2)
    hole.lineTo(this.baseWidth / 2, -this.baseHeight / 2)
    hole.lineTo(this.baseWidth / 2, this.baseHeight / 2)
    hole.lineTo(-this.baseWidth / 2, this.baseHeight / 2)
    hole.closePath()
    shape.holes.push(hole)

    const geometry = new THREE.ShapeGeometry(shape)
    const material = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.z = -0.01
    mesh.castShadow = true

    return mesh
  }

  async loadMedia(item: MediaItem): Promise<void> {
    // Cleanup previous
    if (this.currentItem) {
      this.mediaLoader.disposeItem(this.currentItem.id)
    }
    this.videoController = null
    this.removeControls()

    this.currentItem = item
    const texture = await this.mediaLoader.loadTexture(item)

    // Update screen material
    const material = this.screen.material as THREE.MeshBasicMaterial
    material.map = texture
    material.color.setHex(0xffffff)
    material.needsUpdate = true

    // Adjust aspect ratio
    this.adjustAspectRatio(texture)

    // Setup video controls if video
    if (item.type === 'video' || item.type === 'video-360') {
      const video = this.mediaLoader.getVideoElement(item.id)
      if (video) {
        this.videoController = new VideoController(video)
        this.createControls()
      }
    }
  }

  private adjustAspectRatio(texture: THREE.Texture): void {
    let width: number
    let height: number

    if (texture instanceof THREE.VideoTexture) {
      const video = texture.image as HTMLVideoElement
      width = video.videoWidth
      height = video.videoHeight
    } else {
      width = texture.image.width
      height = texture.image.height
    }

    const aspectRatio = width / height
    const screenAspect = this.baseWidth / this.baseHeight

    let newWidth = this.baseWidth
    let newHeight = this.baseHeight

    if (aspectRatio > screenAspect) {
      // Wider than screen - fit width
      newHeight = this.baseWidth / aspectRatio
    } else {
      // Taller than screen - fit height
      newWidth = this.baseHeight * aspectRatio
    }

    this.screen.geometry.dispose()
    this.screen.geometry = new THREE.PlaneGeometry(newWidth, newHeight)
  }

  private createControls(): void {
    if (!this.videoController) return

    this.controls = new ScreenControls(
      this.videoController,
      this.baseWidth,
      this.baseHeight
    )
    this.controls.group.position.y = -this.baseHeight / 2 - 0.15
    this.group.add(this.controls.group)
  }

  private removeControls(): void {
    if (this.controls) {
      this.group.remove(this.controls.group)
      this.controls.dispose()
      this.controls = null
    }
  }

  handleInteraction(object: THREE.Object3D): void {
    if (object === this.screen && this.videoController) {
      this.videoController.toggle()
    } else if (this.controls) {
      this.controls.handleInteraction(object)
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  get isVideoPlaying(): boolean {
    return this.videoController?.getState().playing ?? false
  }

  dispose(): void {
    if (this.currentItem) {
      this.mediaLoader.disposeItem(this.currentItem.id)
    }
    this.removeControls()
    this.scene.remove(this.group)
  }
}

class ScreenControls {
  group: THREE.Group
  private videoController: VideoController
  private playButton: THREE.Mesh
  private progressBar: THREE.Mesh
  private progressFill: THREE.Mesh
  private progressWidth = 2

  constructor(videoController: VideoController, screenWidth: number, _screenHeight: number) {
    this.videoController = videoController
    this.group = new THREE.Group()

    // Play/Pause button
    this.playButton = this.createButton(0.15, 0x4a9eff)
    this.playButton.position.x = -screenWidth / 2 + 0.15
    this.playButton.name = 'play-button'
    this.playButton.userData.interactive = true
    this.group.add(this.playButton)

    // Progress bar background
    this.progressBar = this.createProgressBar(this.progressWidth, 0.05, 0x333333)
    this.progressBar.position.x = 0.2
    this.progressBar.name = 'progress-bar'
    this.progressBar.userData.interactive = true
    this.group.add(this.progressBar)

    // Progress fill
    this.progressFill = this.createProgressBar(0, 0.04, 0x4a9eff)
    this.progressFill.position.x = 0.2 - this.progressWidth / 2
    this.progressFill.position.z = 0.001
    this.group.add(this.progressFill)

    // Listen to video state changes
    this.videoController.onState((state) => this.updateUI(state))
  }

  private createButton(radius: number, color: number): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(radius, 32)
    const material = new THREE.MeshBasicMaterial({ color })
    return new THREE.Mesh(geometry, material)
  }

  private createProgressBar(width: number, height: number, color: number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.MeshBasicMaterial({ color })
    return new THREE.Mesh(geometry, material)
  }

  private updateUI(state: VideoState): void {
    // Update progress bar fill
    const fillWidth = this.progressWidth * state.progress
    this.progressFill.geometry.dispose()
    this.progressFill.geometry = new THREE.PlaneGeometry(fillWidth, 0.04)
    this.progressFill.position.x = 0.2 - this.progressWidth / 2 + fillWidth / 2

    // Update play button color
    const buttonMaterial = this.playButton.material as THREE.MeshBasicMaterial
    buttonMaterial.color.setHex(state.playing ? 0xff6b6b : 0x4a9eff)
  }

  handleInteraction(object: THREE.Object3D): void {
    if (object === this.playButton) {
      this.videoController.toggle()
    } else if (object === this.progressBar) {
      // Could implement seek on click with intersection point
    }
  }

  dispose(): void {
    this.playButton.geometry.dispose()
    ;(this.playButton.material as THREE.Material).dispose()
    this.progressBar.geometry.dispose()
    ;(this.progressBar.material as THREE.Material).dispose()
    this.progressFill.geometry.dispose()
    ;(this.progressFill.material as THREE.Material).dispose()
  }
}
