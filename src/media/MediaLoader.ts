import * as THREE from 'three'
import { MediaItem, detectMediaType } from './types'

export class MediaLoader {
  private textureLoader: THREE.TextureLoader
  private videoElements: Map<string, HTMLVideoElement> = new Map()

  constructor() {
    this.textureLoader = new THREE.TextureLoader()
  }

  createMediaItemFromFile(file: File): MediaItem {
    const url = URL.createObjectURL(file)
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: detectMediaType(file),
      url,
      file,
    }
  }

  async loadTexture(item: MediaItem): Promise<THREE.Texture> {
    if (item.type === 'video' || item.type === 'video-360') {
      return this.loadVideoTexture(item)
    }
    return this.loadImageTexture(item)
  }

  private loadImageTexture(item: MediaItem): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        item.url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          resolve(texture)
        },
        undefined,
        reject
      )
    })
  }

  private async loadVideoTexture(item: MediaItem): Promise<THREE.VideoTexture> {
    const video = document.createElement('video')
    video.src = item.url
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = false
    video.playsInline = true
    video.preload = 'auto'

    // Store reference for control
    this.videoElements.set(item.id, video)

    return new Promise((resolve, reject) => {
      video.onloadeddata = () => {
        const texture = new THREE.VideoTexture(video)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        resolve(texture)
      }
      video.onerror = () => reject(new Error(`Failed to load video: ${item.name}`))
      video.load()
    })
  }

  getVideoElement(itemId: string): HTMLVideoElement | undefined {
    return this.videoElements.get(itemId)
  }

  disposeItem(itemId: string): void {
    const video = this.videoElements.get(itemId)
    if (video) {
      video.pause()
      video.src = ''
      this.videoElements.delete(itemId)
    }
  }

  disposeAll(): void {
    this.videoElements.forEach((_, id) => this.disposeItem(id))
  }
}
