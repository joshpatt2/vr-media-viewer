export type MediaType = 'image' | 'video' | 'image-360' | 'video-360'

export interface MediaItem {
  id: string
  name: string
  type: MediaType
  url: string
  file?: File
  thumbnail?: string
}

export interface MediaMetadata {
  width: number
  height: number
  duration?: number // For video
  is360: boolean
  isStereo: boolean
}

export function detectMediaType(file: File): MediaType {
  const name = file.name.toLowerCase()
  const isVideo = file.type.startsWith('video/')

  // Simple 360 detection by filename convention
  const is360 = name.includes('360') || name.includes('equirectangular')

  if (isVideo) {
    return is360 ? 'video-360' : 'video'
  }
  return is360 ? 'image-360' : 'image'
}
