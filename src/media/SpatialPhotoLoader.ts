import * as THREE from 'three'
// @ts-ignore - libheif-js types
import libheif from 'libheif-js'

export interface StereoTextures {
  left: THREE.Texture
  right: THREE.Texture
  width: number
  height: number
}

export class SpatialPhotoLoader {
  private decoder: any = null

  async init(): Promise<void> {
    if (!this.decoder) {
      this.decoder = new libheif.HeifDecoder()
    }
  }

  async loadSpatialPhoto(url: string): Promise<StereoTextures> {
    await this.init()

    // Fetch the HEIC file
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    // Decode HEIC
    const imagesData = this.decoder.decode(data)

    if (!imagesData || imagesData.length === 0) {
      throw new Error('Failed to decode HEIC file')
    }

    console.log(`Spatial photo contains ${imagesData.length} image(s)`)

    // Apple spatial photos should have 2 images (left and right eye)
    // If only 1 image, it might be a regular HEIC - we'll use it for both eyes
    let leftImageData: any
    let rightImageData: any

    if (imagesData.length >= 2) {
      // Stereo pair found
      leftImageData = imagesData[0]
      rightImageData = imagesData[1]
    } else {
      // Single image - use for both eyes (fallback)
      console.warn('Only one image found - using as mono')
      leftImageData = imagesData[0]
      rightImageData = imagesData[0]
    }

    // Convert to textures
    const leftTexture = await this.imageDataToTexture(leftImageData)
    const rightTexture = await this.imageDataToTexture(rightImageData)

    const width = leftImageData.get_width()
    const height = leftImageData.get_height()

    return {
      left: leftTexture,
      right: rightTexture,
      width,
      height,
    }
  }

  private async imageDataToTexture(imageData: any): Promise<THREE.Texture> {
    const width = imageData.get_width()
    const height = imageData.get_height()

    // Create canvas to hold the image
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Get the image data
    const imgData = ctx.createImageData(width, height)

    await new Promise<void>((resolve, reject) => {
      imageData.display(imgData, (displayData: any) => {
        if (!displayData) {
          reject(new Error('Failed to display HEIC image'))
          return
        }
        resolve()
      })
    })

    // Put the image data on the canvas
    ctx.putImageData(imgData, 0, 0)

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true

    return texture
  }

  dispose(): void {
    // libheif cleanup if needed
  }
}
