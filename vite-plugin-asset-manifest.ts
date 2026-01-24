import { Plugin } from 'vite'
import * as fs from 'fs'
import * as path from 'path'

interface AssetEntry {
  path: string
  name: string
  type: 'image' | 'video' | 'image-360' | 'video-360' | 'image-pano' | 'video-pano' | 'image-spatial'
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']
const SPATIAL_EXTENSIONS = ['.heic', '.heif'] // Apple spatial photos

function getMediaType(filePath: string, is360: boolean, isPano: boolean, isSpatial: boolean): AssetEntry['type'] {
  const ext = path.extname(filePath).toLowerCase()
  const isVideo = VIDEO_EXTENSIONS.includes(ext)

  // Spatial photos (HEIC in spatial folder)
  if (isSpatial && SPATIAL_EXTENSIONS.includes(ext)) {
    return 'image-spatial'
  }

  if (isVideo) {
    if (is360) return 'video-360'
    if (isPano) return 'video-pano'
    return 'video'
  }
  if (is360) return 'image-360'
  if (isPano) return 'image-pano'
  return 'image'
}

function scanDirectory(dir: string, baseUrl: string, is360: boolean = false, isPano: boolean = false, isSpatial: boolean = false): AssetEntry[] {
  const entries: AssetEntry[] = []

  if (!fs.existsSync(dir)) {
    return entries
  }

  const files = fs.readdirSync(dir, { withFileTypes: true })

  for (const file of files) {
    if (file.name.startsWith('.')) continue // Skip hidden files

    const fullPath = path.join(dir, file.name)

    if (file.isDirectory()) {
      // Recurse into subdirectories
      const subIs360 = is360 || file.name === '360'
      const subIsPano = isPano || file.name === 'pano'
      const subIsSpatial = isSpatial || file.name === 'spatial'
      entries.push(...scanDirectory(fullPath, `${baseUrl}/${file.name}`, subIs360, subIsPano, subIsSpatial))
    } else {
      const ext = path.extname(file.name).toLowerCase()
      const allExtensions = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...SPATIAL_EXTENSIONS]
      if (allExtensions.includes(ext)) {
        entries.push({
          path: `${baseUrl}/${file.name}`,
          name: file.name,
          type: getMediaType(file.name, is360, isPano, isSpatial),
        })
      }
    }
  }

  return entries
}

export function assetManifestPlugin(): Plugin {
  const virtualModuleId = 'virtual:asset-manifest'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'asset-manifest',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        const assetsDir = path.resolve(__dirname, 'public/assets')
        const entries = scanDirectory(assetsDir, '/assets')

        return `export const manifest = ${JSON.stringify(entries, null, 2)};`
      }
    },

    // Regenerate on file changes in dev mode
    configureServer(server) {
      const assetsDir = path.resolve(__dirname, 'public/assets')

      server.watcher.add(assetsDir)
      server.watcher.on('all', (event, filePath) => {
        if (filePath.startsWith(assetsDir)) {
          const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
          if (module) {
            server.moduleGraph.invalidateModule(module)
            server.ws.send({ type: 'full-reload' })
          }
        }
      })
    },
  }
}
