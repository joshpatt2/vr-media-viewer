# VR Media Viewer

A WebXR photo and video viewer for Meta Quest. Browse your media in a virtual gallery, view flat content on a virtual screen, or immerse yourself in 360° photos and videos.

## Features

- **Gallery View**: Thumbnail grid with pagination for browsing your media
- **Flat Viewer**: Photos and videos displayed on a virtual screen
- **360° Viewer**: Immersive equirectangular content wraps around you
- **Stereo 3D**: Side-by-side and over-under format support
- **Video Controls**: Play/pause with spatial UI
- **Controller Support**: Point-and-click interaction with laser pointer
- **Keyboard Navigation**: Arrow keys, Enter, Escape for desktop testing

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (HTTPS required for WebXR)
npm run dev
```

Open on Quest Browser: `https://<your-computer-ip>:5173`

> Accept the self-signed certificate warning on first visit.

## Usage

1. **Select Media**: Click "Select Photos/Videos" and pick files
2. **Browse Gallery**: Thumbnails appear in a grid - click to view
3. **Enter VR**: Click "Enter VR" button
4. **Navigate**: Point controller at thumbnails, pull trigger to select
5. **Return to Gallery**: Click "Back to Gallery" or press B button

## Controls

### VR (Controllers)
| Action | Control |
|--------|---------|
| Point | Aim controller |
| Select | Trigger |
| Play/Pause video | Click screen |

### Desktop (Keyboard)
| Action | Key |
|--------|-----|
| Navigate gallery | Arrow Left/Right |
| Open selected | Enter |
| Back to gallery | Escape |

## File Naming for 360° Content

The viewer auto-detects 360° and stereo content by filename:

| Filename Contains | Result |
|-------------------|--------|
| `360` or `equirectangular` | 360° mode |
| `_sbs` or `-sbs` | Side-by-side stereo |
| `_ou` or `-ou` or `_tb` | Over-under stereo |
| `3d` | Side-by-side stereo (default) |

Examples:
- `vacation_360.jpg` → 360° mono
- `concert_360_sbs.mp4` → 360° side-by-side 3D
- `underwater_360_ou.jpg` → 360° over-under 3D

## Project Structure

```
vr-media-viewer/
├── src/
│   ├── main.ts                 # App entry point
│   ├── vr/
│   │   ├── XRSessionManager.ts # VR session lifecycle
│   │   └── XRInputManager.ts   # Controller input & raycasting
│   ├── scene/
│   │   ├── Environment.ts      # Floor, lighting
│   │   ├── FlatScreen.ts       # 2D media display
│   │   ├── Sphere360.ts        # 360° sphere viewer
│   │   └── ViewerController.ts # Switches between viewers
│   ├── media/
│   │   ├── types.ts            # MediaItem types
│   │   ├── MediaLoader.ts      # Texture loading
│   │   └── VideoController.ts  # Playback control
│   └── ui/
│       ├── Gallery.ts          # Thumbnail grid
│       └── ThumbnailGenerator.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Supported Formats

**Images**: JPG, PNG, WebP, GIF
**Videos**: MP4 (H.264), WebM
**360°**: Equirectangular projection

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

### Chrome WebXR Emulator

For faster iteration without a headset:
1. Install [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator/mjddjgeghkdijejnciaefnkjmkafnnje)
2. Open DevTools → WebXR tab
3. Select device (Quest 2)
4. Click "Enter VR" in app

## Tech Stack

- [Three.js](https://threejs.org/) - 3D rendering
- [WebXR](https://immersiveweb.dev/) - VR API
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## License

MIT
