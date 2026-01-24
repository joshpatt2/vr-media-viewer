/// <reference types="vite/client" />

declare module 'virtual:asset-manifest' {
  interface AssetEntry {
    path: string
    name: string
    type: 'image' | 'video' | 'image-360' | 'video-360' | 'image-pano' | 'video-pano' | 'image-spatial'
  }
  export const manifest: AssetEntry[]
}
