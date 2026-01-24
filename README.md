# VR Media Viewer

A WebXR photo and video viewer for Meta Quest. Browse your media in a virtual gallery, view flat content on a virtual screen, or immerse yourself in 360° photos, panoramas, and Apple Spatial Photos.

## Features

- **Gallery View**: Thumbnail grid with pagination, auto-loads from assets folder
- **Flat Viewer**: Photos and videos displayed on a virtual screen with transport controls
- **360° Viewer**: Immersive equirectangular content wraps around you
- **Panorama Viewer**: Wide photos displayed on a curved surface (curve adapts to aspect ratio)
- **Spatial Photos**: Apple Spatial Photos (iPhone 15 Pro) with true stereoscopic 3D
- **Stereo 3D**: Side-by-side and over-under format support
- **Desktop Mode**: Orbit controls + mouse interaction for development without a headset
- **Auto-loading**: Drop files in `public/assets/`, they appear in gallery automatically

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (HTTPS required for WebXR)
npm run dev
```

Open on Quest Browser: `https://<your-computer-ip>:5173`

> Accept the self-signed certificate warning on first visit.

## Asset Folders

Drop media into these folders - the viewer auto-detects the type:

```
public/assets/
├── images/        # Flat photos (JPG, PNG, WebP, GIF)
├── videos/        # Flat videos (MP4, WebM)
├── 360/
│   ├── images/    # 360° equirectangular photos
│   └── videos/    # 360° videos
├── pano/
│   ├── images/    # Wide panoramas (curved display)
│   └── videos/    # Panoramic videos
└── spatial/       # Apple Spatial Photos (.HEIC from iPhone 15 Pro)
```

## Controls

### Desktop (Development)
| Action | Control |
|--------|---------|
| Orbit camera | Left-drag |
| Zoom | Scroll |
| Interact | Click |
| Play/Pause | Spacebar |
| Navigate gallery | Arrow Left/Right |
| Open selected | Enter |
| Back to gallery | Escape |

### VR (Controllers)
| Action | Control |
|--------|---------|
| Point | Aim controller |
| Select | Trigger |
| Play/Pause video | Click screen |

## Stereo 3D Naming Convention

For 360° content, add these suffixes to filenames:

| Suffix | Format |
|--------|--------|
| `_sbs` or `-sbs` | Side-by-side stereo |
| `_ou` or `-ou` or `_tb` | Over-under stereo |
| `3d` | Side-by-side (default) |

Examples:
- `concert_360_sbs.mp4` → 360° side-by-side 3D
- `underwater_360_ou.jpg` → 360° over-under 3D

## Panorama Aspect Ratio

Panoramas automatically curve based on image width:
- **2:1** → ~90° arc
- **4:1** → ~180° arc
- **6:1** → ~270° arc

## Apple Spatial Photos

Spatial Photos from iPhone 15 Pro are supported:
1. AirDrop the `.HEIC` file to your Mac
2. Drop it in `public/assets/spatial/`
3. The stereo pair is extracted client-side using libheif-js
4. In VR, each eye sees its own image for true 3D depth

> Desktop shows left eye only. The 3D effect requires a VR headset.

## Project Structure

```
vr-media-viewer/
├── src/
│   ├── main.ts                    # App entry point
│   ├── vr/
│   │   ├── XRSessionManager.ts    # VR session lifecycle
│   │   └── XRInputManager.ts      # Controller input & raycasting
│   ├── input/
│   │   └── DesktopControls.ts     # Orbit camera + mouse for dev
│   ├── scene/
│   │   ├── Environment.ts         # Floor, lighting
│   │   ├── FlatScreen.ts          # 2D media display
│   │   ├── Sphere360.ts           # 360° sphere viewer
│   │   ├── PanoViewer.ts          # Curved panorama viewer
│   │   ├── SpatialViewer.ts       # Apple Spatial Photo viewer
│   │   └── ViewerController.ts    # Routes to appropriate viewer
│   ├── media/
│   │   ├── types.ts               # MediaItem types
│   │   ├── MediaLoader.ts         # Texture loading
│   │   ├── VideoController.ts     # Playback control
│   │   └── SpatialPhotoLoader.ts  # HEIC decoding for spatial photos
│   └── ui/
│       ├── Gallery.ts             # Thumbnail grid
│       └── ThumbnailGenerator.ts  # Creates thumbnails
├── vite-plugin-asset-manifest.ts  # Auto-scans assets folder
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Supported Formats

| Type | Formats |
|------|---------|
| Images | JPG, PNG, WebP, GIF |
| Videos | MP4 (H.264), WebM |
| 360° | Equirectangular projection |
| Spatial | HEIC (Apple Spatial Photos) |

> For best Quest performance, keep videos at 4K or below.

## Development

```bash
# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing on Quest

1. Ensure Quest and dev machine are on same network
2. Run `npm run dev`
3. Find your machine's IP (e.g., `192.168.1.100`)
4. Open Quest Browser → `https://192.168.1.100:5173`
5. Accept certificate warning
6. Click "Enter VR"

## Tech Stack

- [Three.js](https://threejs.org/) - 3D rendering
- [WebXR](https://immersiveweb.dev/) - VR API
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [libheif-js](https://github.com/nicola-nicola/libheif-js) - HEIC decoding for Spatial Photos

---

## Development Notes

### What I Learned Building This

**WebXR is surprisingly accessible.** Three.js abstracts most of the complexity. Getting a basic VR scene running took minutes, not hours. The `renderer.xr.enabled = true` flag does a lot of heavy lifting.

**Stereo rendering via layers is elegant.** Three.js layers let you assign objects to specific eyes without custom shaders. Set a mesh to layer 1 for left eye, layer 2 for right eye, and WebXR handles the rest.

**HEIC decoding in the browser is possible but heavy.** libheif-js works, but it's a ~2MB WASM bundle. For a media viewer it's acceptable. For a lightweight app, you'd want server-side conversion.

**Apple Spatial Photos are just HEIF containers with two images.** No special magic - the stereo pair is stored as primary + auxiliary image. Once you know the structure, extraction is straightforward.

**Curved geometry for panoramas is satisfying.** Calculating arc angle from aspect ratio and generating cylinder segments felt like the right abstraction. The math is simple but the result looks good.

**Desktop mode is essential for iteration.** Building VR-only would have been 10x slower. OrbitControls + mouse raycasting let you test everything without putting on a headset.

**Vite plugins are powerful for asset pipelines.** The virtual module pattern for the asset manifest means zero config for users - just drop files in folders. Hot reload on file changes makes it feel native.

### What's Next

- Hand tracking support for Quest
- Video scrubbing UI
- Folder organization in gallery
- Spatial video support (when Apple releases the format details)
- Performance profiling for large galleries

---

## License

MIT
