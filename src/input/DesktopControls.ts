import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class DesktopControls {
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private orbitControls: OrbitControls
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private onInteractCallback?: (object: THREE.Object3D, point: THREE.Vector3) => void

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene
  ) {
    this.camera = camera
    this.renderer = renderer
    this.scene = scene
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    // Orbit controls for camera
    this.orbitControls = new OrbitControls(camera, renderer.domElement)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.05
    this.orbitControls.screenSpacePanning = false
    this.orbitControls.minDistance = 0.5
    this.orbitControls.maxDistance = 20
    this.orbitControls.maxPolarAngle = Math.PI * 0.85
    this.orbitControls.target.set(0, 1.2, 0)

    // Mouse click for interaction
    renderer.domElement.addEventListener('click', this.onClick.bind(this))
    renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))

    // Cursor feedback
    renderer.domElement.style.cursor = 'grab'
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Update cursor based on hover
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const interactives = this.getInteractiveObjects()
    const intersects = this.raycaster.intersectObjects(interactives, true)

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer'
    } else {
      this.renderer.domElement.style.cursor = 'grab'
    }
  }

  private onClick(event: MouseEvent): void {
    // Ignore if dragging
    if (this.orbitControls.enabled && event.detail === 0) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const interactives = this.getInteractiveObjects()
    const intersects = this.raycaster.intersectObjects(interactives, true)

    if (intersects.length > 0) {
      const hit = intersects[0]
      // Find the interactive parent (in case we hit a child mesh)
      let target = hit.object
      while (target && !target.userData.interactive) {
        target = target.parent as THREE.Object3D
      }
      if (target && this.onInteractCallback) {
        this.onInteractCallback(target, hit.point)
      }
    }
  }

  private getInteractiveObjects(): THREE.Object3D[] {
    const interactives: THREE.Object3D[] = []
    this.scene.traverse((obj) => {
      if (obj.userData.interactive) {
        interactives.push(obj)
      }
    })
    return interactives
  }

  onInteract(callback: (object: THREE.Object3D, point: THREE.Vector3) => void): void {
    this.onInteractCallback = callback
  }

  update(): void {
    this.orbitControls.update()
  }

  setEnabled(enabled: boolean): void {
    this.orbitControls.enabled = enabled
  }

  // Reset camera to default position
  reset(): void {
    this.camera.position.set(0, 1.6, 3)
    this.orbitControls.target.set(0, 1.2, 0)
    this.orbitControls.update()
  }

  // For 360 mode - lock camera at center, allow look around
  setImmersiveMode(enabled: boolean): void {
    if (enabled) {
      this.orbitControls.minDistance = 0
      this.orbitControls.maxDistance = 0.1
      this.camera.position.set(0, 1.6, 0.01)
      this.orbitControls.target.set(0, 1.6, 0)
    } else {
      this.orbitControls.minDistance = 0.5
      this.orbitControls.maxDistance = 20
      this.reset()
    }
    this.orbitControls.update()
  }
}
