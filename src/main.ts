import * as THREE from 'three'
import { XRSessionManager } from './vr/XRSessionManager'
import { XRInputManager } from './vr/XRInputManager'
import { DesktopControls } from './input/DesktopControls'
import { Environment } from './scene/Environment'
import { ViewerController } from './scene/ViewerController'
import { MediaLoader } from './media/MediaLoader'
import { MediaItem, MediaType } from './media/types'
import { Gallery } from './ui/Gallery'
import { manifest } from 'virtual:asset-manifest'

type AppMode = 'gallery' | 'viewer'

class App {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private xrInput: XRInputManager
  private desktopControls: DesktopControls
  private mediaLoader: MediaLoader
  private viewer: ViewerController
  private gallery: Gallery
  private mediaItems: MediaItem[] = []
  private mode: AppMode = 'gallery'
  private isInVR = false

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

    // Camera (for non-VR)
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
    const xrSession = new XRSessionManager(this.renderer)
    xrSession.onSessionStart(() => this.onVRSessionStart())
    xrSession.onSessionEnd(() => this.onVRSessionEnd())

    // Media Loader
    this.mediaLoader = new MediaLoader()

    // Gallery
    this.gallery = new Gallery(this.scene)
    this.gallery.onSelect((item) => this.openMedia(item))

    // Viewer Controller (manages flat screen and 360 sphere)
    this.viewer = new ViewerController(this.scene, this.mediaLoader)

    // XR Input Manager (for VR controllers)
    this.xrInput = new XRInputManager(this.renderer, this.scene)
    this.setupVRInputHandlers()

    // Desktop Controls (orbit camera + mouse click)
    this.desktopControls = new DesktopControls(this.camera, this.renderer, this.scene)
    this.desktopControls.onInteract((object) => this.handleInteraction(object))

    // File picker
    this.setupFilePicker()

    // Events
    window.addEventListener('resize', this.onResize.bind(this))
    window.addEventListener('keydown', this.onKeyDown.bind(this))

    // Start in gallery mode
    this.setMode('gallery')

    // Load assets from manifest
    this.loadFromManifest()

    // Start render loop
    this.renderer.setAnimationLoop(this.render.bind(this))

    console.log('VR Media Viewer ready - use mouse to orbit, click to interact')
  }

  private async loadFromManifest(): Promise<void> {
    if (manifest.length === 0) {
      console.log('No assets in manifest. Add files to public/assets/')
      return
    }

    // Convert manifest entries to MediaItems
    this.mediaItems = manifest.map((entry) => ({
      id: crypto.randomUUID(),
      name: entry.name,
      type: entry.type as MediaType,
      url: entry.path,
    }))

    // Update UI
    const currentFileSpan = document.getElementById('current-file')
    if (currentFileSpan) {
      currentFileSpan.textContent = `${this.mediaItems.length} asset(s) loaded`
    }

    // Load into gallery
    await this.gallery.setItems(this.mediaItems)
    console.log('Loaded', this.mediaItems.length, 'assets from manifest')
  }

  private onVRSessionStart(): void {
    this.isInVR = true
    this.desktopControls.setEnabled(false)
  }

  private onVRSessionEnd(): void {
    this.isInVR = false
    this.desktopControls.setEnabled(true)
    // Reset camera when exiting VR
    if (this.mode === 'viewer' && this.viewer.getMode() === '360') {
      this.desktopControls.setImmersiveMode(true)
    } else {
      this.desktopControls.reset()
    }
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

      // Switch to immersive camera for 360 content
      if (!this.isInVR && this.viewer.getMode() === '360') {
        this.desktopControls.setImmersiveMode(true)
      }
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

      // Reset camera for gallery view
      if (!this.isInVR) {
        this.desktopControls.setImmersiveMode(false)
      }
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

  private handleInteraction(object: THREE.Object3D): void {
    if (this.mode === 'gallery') {
      this.gallery.handleInteraction(object)
    } else {
      this.viewer.handleInteraction(object)
    }
  }

  private setupVRInputHandlers(): void {
    for (let i = 0; i < 2; i++) {
      const controller = this.xrInput.getController(i)
      ;(controller as any).addEventListener('interact', (event: { detail?: { target: THREE.Object3D } }) => {
        const target = event.detail?.target
        if (target) {
          this.handleInteraction(target)
        }
      })
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Spacebar to toggle play/pause in viewer mode
    if (event.key === ' ' && this.mode === 'viewer') {
      const screen = this.viewer.getFlatScreen()
      // Trigger play/pause by simulating screen click
      screen.handleInteraction(screen as any)
      event.preventDefault()
      return
    }

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
    // Update appropriate input system
    if (this.isInVR) {
      this.xrInput.update()
    } else {
      this.desktopControls.update()
    }

    this.renderer.render(this.scene, this.camera)
  }
}

// Boot
new App()
