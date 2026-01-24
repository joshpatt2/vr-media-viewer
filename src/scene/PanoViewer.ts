import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { MediaLoader } from '../media/MediaLoader'
import { VideoController } from '../media/VideoController'

export class PanoViewer {
  private scene: THREE.Scene
  private mediaLoader: MediaLoader
  private mesh: THREE.Mesh | null = null
  private currentItem: MediaItem | null = null
  private videoController: VideoController | null = null

  // Viewing parameters
  private readonly viewerDistance = 4 // Distance from viewer to center of curve
  private readonly height = 2.5 // Height of the pano in meters

  constructor(scene: THREE.Scene, mediaLoader: MediaLoader) {
    this.scene = scene
    this.mediaLoader = mediaLoader
  }

  async loadMedia(item: MediaItem): Promise<void> {
    // Cleanup previous
    if (this.currentItem) {
      this.mediaLoader.disposeItem(this.currentItem.id)
    }
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      ;(this.mesh.material as THREE.Material).dispose()
      this.mesh = null
    }
    this.videoController = null

    this.currentItem = item
    const texture = await this.mediaLoader.loadTexture(item)

    // Get dimensions to calculate aspect ratio
    let width: number
    let height: number

    if (texture instanceof THREE.VideoTexture) {
      const video = texture.image as HTMLVideoElement
      // Wait for video metadata if needed
      if (video.videoWidth === 0) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve()
        })
      }
      width = video.videoWidth
      height = video.videoHeight
    } else {
      width = texture.image.width
      height = texture.image.height
    }

    const aspectRatio = width / height

    // Create curved geometry based on aspect ratio
    this.mesh = this.createCurvedMesh(aspectRatio, texture)
    this.mesh.name = 'pano-viewer'
    this.mesh.userData.interactive = true
    this.scene.add(this.mesh)

    // Setup video controls if video
    if (item.type === 'video-pano') {
      const video = this.mediaLoader.getVideoElement(item.id)
      if (video) {
        this.videoController = new VideoController(video)
        this.videoController.play()
      }
    }

    console.log(`Pano loaded: ${width}x${height} (${aspectRatio.toFixed(2)}:1)`)
  }

  private createCurvedMesh(aspectRatio: number, texture: THREE.Texture): THREE.Mesh {
    // Calculate arc angle based on aspect ratio
    // aspectRatio 2:1 = ~90° arc, 4:1 = ~180° arc, 6:1 = ~270° arc
    const arcAngle = Math.min(Math.PI * 1.5, Math.max(Math.PI / 2, aspectRatio * (Math.PI / 4)))

    // Calculate dimensions
    const meshHeight = this.height

    // Create curved geometry
    const segments = Math.ceil(aspectRatio * 16) // More segments for wider panos
    const geometry = this.createCylinderSegmentGeometry(
      this.viewerDistance,
      meshHeight,
      arcAngle,
      segments
    )

    // Material
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, meshHeight / 2 + 0.5, 0) // Slightly above ground, centered

    return mesh
  }

  private createCylinderSegmentGeometry(
    radius: number,
    height: number,
    arcAngle: number,
    segments: number
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    const vertices: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    const halfHeight = height / 2
    const startAngle = -arcAngle / 2 + Math.PI // Center the arc, facing viewer
    const angleStep = arcAngle / segments

    // Generate vertices
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep
      const x = Math.sin(angle) * radius
      const z = Math.cos(angle) * radius
      const u = i / segments

      // Bottom vertex
      vertices.push(x, -halfHeight, z)
      uvs.push(u, 0)

      // Top vertex
      vertices.push(x, halfHeight, z)
      uvs.push(u, 1)
    }

    // Generate indices
    for (let i = 0; i < segments; i++) {
      const bottomLeft = i * 2
      const bottomRight = (i + 1) * 2
      const topLeft = i * 2 + 1
      const topRight = (i + 1) * 2 + 1

      // Two triangles per segment (facing inward)
      indices.push(bottomLeft, topLeft, bottomRight)
      indices.push(topLeft, topRight, bottomRight)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
  }

  handleInteraction(): void {
    if (this.videoController) {
      this.videoController.toggle()
    }
  }

  setVisible(visible: boolean): void {
    if (this.mesh) {
      this.mesh.visible = visible
    }
  }

  get isVisible(): boolean {
    return this.mesh?.visible ?? false
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
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      ;(this.mesh.material as THREE.Material).dispose()
    }
  }
}
