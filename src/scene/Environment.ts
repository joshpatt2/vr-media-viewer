import * as THREE from 'three'

export class Environment {
  private scene: THREE.Scene
  private floor: THREE.Mesh
  private shadowPlane: THREE.Mesh
  private grid: THREE.GridHelper
  private ambient!: THREE.AmbientLight
  private hemisphere!: THREE.HemisphereLight
  private directional!: THREE.DirectionalLight
  private isPassthroughMode = false

  constructor(scene: THREE.Scene) {
    this.scene = scene

    // Solid floor (for VR mode)
    this.floor = this.createFloor()
    this.scene.add(this.floor)

    // Shadow-only plane (for passthrough mode)
    this.shadowPlane = this.createShadowPlane()
    this.shadowPlane.visible = false
    this.scene.add(this.shadowPlane)

    // Grid (visual reference)
    this.grid = this.createGrid()
    this.scene.add(this.grid)

    // Lighting with shadows
    this.setupLighting()
  }

  private createFloor(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(10, 64)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1,
    })

    const floor = new THREE.Mesh(geometry, material)
    floor.receiveShadow = true
    floor.name = 'floor'

    return floor
  }

  private createShadowPlane(): THREE.Mesh {
    // Large plane to catch shadows across the real floor
    const geometry = new THREE.PlaneGeometry(20, 20)
    geometry.rotateX(-Math.PI / 2)

    // Shadow-only material - transparent but receives shadows
    const material = new THREE.ShadowMaterial({
      opacity: 0.3, // Subtle shadow
    })

    const plane = new THREE.Mesh(geometry, material)
    plane.receiveShadow = true
    plane.name = 'shadow-plane'

    return plane
  }

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(20, 40, 0x333333, 0x222222)
    grid.position.y = 0.001 // Slightly above floor to prevent z-fighting
    return grid
  }

  private setupLighting(): void {
    // Ambient light (soft fill)
    this.ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(this.ambient)

    // Hemisphere light (sky/ground gradient)
    this.hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
    this.scene.add(this.hemisphere)

    // Directional light for shadows
    this.directional = new THREE.DirectionalLight(0xffffff, 1.0)
    this.directional.position.set(2, 8, 4)
    this.directional.castShadow = true

    // Shadow map settings for crisp shadows
    this.directional.shadow.mapSize.width = 2048
    this.directional.shadow.mapSize.height = 2048
    this.directional.shadow.camera.near = 0.5
    this.directional.shadow.camera.far = 20
    this.directional.shadow.camera.left = -10
    this.directional.shadow.camera.right = 10
    this.directional.shadow.camera.top = 10
    this.directional.shadow.camera.bottom = -10
    this.directional.shadow.bias = -0.0001

    this.scene.add(this.directional)
  }

  /**
   * Switch between passthrough (AR) and VR mode
   * - Passthrough: transparent shadow plane, no floor/grid
   * - VR: solid floor with grid
   */
  setPassthroughMode(enabled: boolean): void {
    this.isPassthroughMode = enabled

    if (enabled) {
      // Passthrough: show only shadow plane
      this.floor.visible = false
      this.grid.visible = false
      this.shadowPlane.visible = true
    } else {
      // VR: show floor and grid
      this.floor.visible = true
      this.grid.visible = true
      this.shadowPlane.visible = false
    }
  }

  setGridVisible(visible: boolean): void {
    if (!this.isPassthroughMode) {
      this.grid.visible = visible
    }
  }

  getShadowPlane(): THREE.Mesh {
    return this.shadowPlane
  }

  dispose(): void {
    this.scene.remove(
      this.floor,
      this.shadowPlane,
      this.grid,
      this.ambient,
      this.hemisphere,
      this.directional,
    )

    this.floor.geometry.dispose()
    ;(this.floor.material as THREE.Material).dispose()

    this.shadowPlane.geometry.dispose()
    ;(this.shadowPlane.material as THREE.Material).dispose()

    this.grid.geometry.dispose()
    ;(this.grid.material as THREE.Material).dispose()

    this.directional.shadow.dispose()
  }
}
