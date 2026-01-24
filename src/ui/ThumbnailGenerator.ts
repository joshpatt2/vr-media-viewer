import * as THREE from 'three'
import { MediaItem } from '../media/types'

const THUMB_SIZE = 256

export class ThumbnailGenerator {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = THUMB_SIZE
    this.canvas.height = THUMB_SIZE
    this.ctx = this.canvas.getContext('2d')!
  }

  async generateThumbnail(item: MediaItem): Promise<THREE.Texture> {
    if (item.type === 'video' || item.type === 'video-360') {
      return this.generateVideoThumbnail(item)
    }
    return this.generateImageThumbnail(item)
  }

  private async generateImageThumbnail(item: MediaItem): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.drawCentered(img)
        const texture = new THREE.CanvasTexture(this.canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        resolve(texture)
      }
      img.onerror = reject
      img.src = item.url
    })
  }

  private async generateVideoThumbnail(item: MediaItem): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.preload = 'metadata'

      video.onloadeddata = () => {
        // Seek to 1 second or 10% of duration
        video.currentTime = Math.min(1, video.duration * 0.1)
      }

      video.onseeked = () => {
        this.drawCentered(video)
        // Draw play icon overlay
        this.drawPlayIcon()
        const texture = new THREE.CanvasTexture(this.canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        video.src = '' // Cleanup
        resolve(texture)
      }

      video.onerror = reject
      video.src = item.url
      video.load()
    })
  }

  private drawCentered(source: HTMLImageElement | HTMLVideoElement): void {
    const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width
    const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height

    // Calculate crop to fill square
    const scale = Math.max(THUMB_SIZE / srcWidth, THUMB_SIZE / srcHeight)
    const scaledWidth = srcWidth * scale
    const scaledHeight = srcHeight * scale
    const x = (THUMB_SIZE - scaledWidth) / 2
    const y = (THUMB_SIZE - scaledHeight) / 2

    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE)
    this.ctx.drawImage(source, x, y, scaledWidth, scaledHeight)
  }

  private drawPlayIcon(): void {
    const cx = THUMB_SIZE / 2
    const cy = THUMB_SIZE / 2
    const radius = 30

    // Semi-transparent circle
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.fill()

    // Play triangle
    this.ctx.fillStyle = '#fff'
    this.ctx.beginPath()
    this.ctx.moveTo(cx - 8, cy - 12)
    this.ctx.lineTo(cx - 8, cy + 12)
    this.ctx.lineTo(cx + 12, cy)
    this.ctx.closePath()
    this.ctx.fill()
  }
}
