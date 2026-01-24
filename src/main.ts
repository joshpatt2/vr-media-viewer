import * as THREE from 'three'
import { XRSessionManager } from './vr/XRSessionManager'
import { XRInputManager } from './vr/XRInputManager'
import { Environment } from './scene/Environment'
import { ViewerController } from './scene/ViewerController'
import { MediaLoader } from './media/MediaLoader'
import { MediaItem } from './media/types'
import { Gallery } from './ui/Gallery'

type AppMode = 'gallery' | 'viewer'

class App {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private xrInput: XRInputManager
  private mediaLoader: MediaLoader
  private viewer: ViewerController
  private gallery: Gallery
  private mediaItems: MediaItem[] = []
  private mode: AppMode = 'gallery'

  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.xr.enabled = true
    document.body.appendChild(this.renderer.domElement)

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x101010)

    // Camera (for non-VR preview)
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 1.6, 3)

    // Environment (floor, lights)
    new Environment(this.scene)

    // XR Session Manager
    new XRSessionManager(this.renderer)

    // Media Loader
    this.mediaLoader = new MediaLoader()

    // Gallery
    this.gallery = new Gallery(this.scene)
    this.gallery.onSelect((item) => this.openMedia(item))

    // Viewer Controller (manages flat screen and 360 sphere)
    this.viewer = new ViewerController(this.scene, this.mediaLoader)

    // XR Input Manager
    this.xrInput = new XRInputManager(this.renderer, this.scene)
    this.setupInputHandlers()

    // File picker
    this.setupFilePicker()

    // Events
    window.addEventListener('resize', this.onResize.bind(this))

    // Keyboard navigation
    window.addEventListener('keydown', this.onKeyDown.bind(this))

    // Start in gallery mode
    this.setMode('gallery')

    // Start render loop
    this.renderer.setAnimationLoop(this.render.bind(this))
  }

  private setupFilePicker(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const pickButton = document.getElementById('pick-file') as HTMLButtonElement
    const currentFileSpan = document.getElementById('current-file') as HTMLSpanElement
    const toggleGalleryBtn = document.getElementById('toggle-gallery') as HTMLButtonElement

    pickButton.addEventListener('click', () => fileInput.click())

    fileInput.addEventListener('change', async () => {
      const files = fileInput.files
      if (!files || files.length === 0) return

      // Create media items from all selected files
      this.mediaItems = Array.from(files).map((file) =>
        this.mediaLoader.createMediaItemFromFile(file)
      )

      currentFileSpan.textContent = `${this.mediaItems.length} file(s) selected`

      // Load into gallery
      await this.gallery.setItems(this.mediaItems)
      this.setMode('gallery')

      console.log('Loaded', this.mediaItems.length, 'media items')
    })

    toggleGalleryBtn.addEventListener('click', () => {
      if (this.mode === 'gallery') {
        // If something selected, open it
        const index = this.gallery.getSelectedIndex()
        if (index >= 0 && this.mediaItems[index]) {
          this.openMedia(this.mediaItems[index])
        }
      } else {
        this.setMode('gallery')
      }
    })
  }

  private async openMedia(item: MediaItem): Promise<void> {
    try {
      await this.viewer.loadMedia(item)
      this.setMode('viewer')
    } catch (error) {
      console.error('Failed to load media:', error)
    }
  }

  private setMode(mode: AppMode): void {
    this.mode = mode

    if (mode === 'gallery') {
      this.gallery.setVisible(true)
      this.viewer.getFlatScreen().setVisible(false)
      this.viewer.getSphere360().setVisible(false)
    } else {
      this.gallery.setVisible(false)
      // Viewer visibility managed by ViewerController
    }

    // Update button text
    const btn = document.getElementById('toggle-gallery')
    if (btn) {
      btn.textContent = mode === 'gallery' ? 'View Selected' : 'Back to Gallery'
    }
  }

  private setupInputHandlers(): void {
    for (let i = 0; i < 2; i++) {
      const controller = this.xrInput.getController(i)
      ;(controller as any).addEventListener('interact', (event: { detail?: { target: THREE.Object3D } }) => {
        const target = event.detail?.target
        if (!target) return

        if (this.mode === 'gallery') {
          // Try gallery interaction first
          const handled = this.gallery.handleInteraction(target)
          if (!handled) {
            // Check if clicking outside gallery to close
          }
        } else {
          this.viewer.handleInteraction(target)
        }
      })
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.mode === 'gallery') {
      switch (event.key) {
        case 'ArrowRight':
          this.gallery.selectNext()
          break
        case 'ArrowLeft':
          this.gallery.selectPrev()
          break
        case 'Enter':
          const index = this.gallery.getSelectedIndex()
          if (index >= 0) {
            this.openMedia(this.mediaItems[index])
          }
          break
      }
    } else {
      switch (event.key) {
        case 'Escape':
        case 'Backspace':
          this.setMode('gallery')
          break
        case 'ArrowRight':
          this.gallery.selectNext()
          this.openMedia(this.mediaItems[this.gallery.getSelectedIndex()])
          break
        case 'ArrowLeft':
          this.gallery.selectPrev()
          this.openMedia(this.mediaItems[this.gallery.getSelectedIndex()])
          break
      }
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private render(): void {
    this.xrInput.update()
    this.renderer.render(this.scene, this.camera)
  }
}

// Boot
new App()
