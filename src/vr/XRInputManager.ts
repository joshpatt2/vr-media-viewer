import * as THREE from 'three'

export class XRInputManager {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private controllers: THREE.XRTargetRaySpace[] = []
  private controllerGrips: THREE.XRGripSpace[] = []
  private raycaster: THREE.Raycaster

  // Visual feedback
  private rayLines: THREE.Line[] = []
  private rayLength = 5

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer
    this.scene = scene
    this.raycaster = new THREE.Raycaster()

    this.setupControllers()
  }

  private setupControllers(): void {
    // Setup both controllers (0 = left, 1 = right)
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i)
      controller.addEventListener('selectstart', () => this.onSelectStart(i))
      controller.addEventListener('selectend', () => this.onSelectEnd(i))
      controller.addEventListener('connected', (e) => this.onConnected(e as unknown as { data: XRInputSource }, i))
      controller.addEventListener('disconnected', () => this.onDisconnected(i))
      this.scene.add(controller)
      this.controllers.push(controller)

      // Controller grip (physical controller model position)
      const grip = this.renderer.xr.getControllerGrip(i)
      grip.add(this.createControllerModel())
      this.scene.add(grip)
      this.controllerGrips.push(grip)

      // Ray line
      const rayLine = this.createRayLine()
      controller.add(rayLine)
      this.rayLines.push(rayLine)
    }
  }

  private createControllerModel(): THREE.Object3D {
    const geometry = new THREE.CylinderGeometry(0.01, 0.015, 0.1, 16)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  private createRayLine(): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -this.rayLength),
    ])
    const material = new THREE.LineBasicMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0.6,
    })
    return new THREE.Line(geometry, material)
  }

  private onConnected(event: { data: XRInputSource }, index: number): void {
    const data = event.data
    console.log(`Controller ${index} connected:`, data?.handedness)
    this.rayLines[index].visible = true
  }

  private onDisconnected(index: number): void {
    console.log(`Controller ${index} disconnected`)
    this.rayLines[index].visible = false
  }

  private onSelectStart(index: number): void {
    // Trigger pressed - perform raycast and interact
    const intersects = this.raycast(index)
    if (intersects.length > 0) {
      const hit = intersects[0]
      console.log('Hit:', hit.object.name || hit.object.uuid)

      // Dispatch custom event for other systems to handle
      const interactEvent = { type: 'interact', detail: { target: hit.object, point: hit.point } }
      this.controllers[index].dispatchEvent(interactEvent as any)
    }
  }

  private onSelectEnd(_index: number): void {
    // Trigger released
  }

  private raycast(controllerIndex: number): THREE.Intersection[] {
    const controller = this.controllers[controllerIndex]
    const tempMatrix = new THREE.Matrix4()
    tempMatrix.identity().extractRotation(controller.matrixWorld)

    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

    // Get all interactive objects (objects with userData.interactive = true)
    const interactives = this.scene.children.filter(
      (obj) => obj.userData.interactive
    )

    return this.raycaster.intersectObjects(interactives, true)
  }

  update(): void {
    // Could add hover effects, haptics, etc. here
  }

  getController(index: number): THREE.XRTargetRaySpace {
    return this.controllers[index]
  }
}
