import * as THREE from 'three'

export class Environment {
  private scene: THREE.Scene
  private floor: THREE.Mesh
  private grid: THREE.GridHelper

  constructor(scene: THREE.Scene) {
    this.scene = scene

    // Floor
    this.floor = this.createFloor()
    this.scene.add(this.floor)

    // Grid (visual reference)
    this.grid = this.createGrid()
    this.scene.add(this.grid)

    // Lighting
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

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(20, 40, 0x333333, 0x222222)
    grid.position.y = 0.001 // Slightly above floor to prevent z-fighting
    return grid
  }

  private setupLighting(): void {
    // Ambient light (soft fill)
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    // Hemisphere light (sky/ground gradient)
    const hemisphere = new THREE.HemisphereLight(0x606080, 0x202020, 0.5)
    this.scene.add(hemisphere)

    // Point light (above viewer)
    const point = new THREE.PointLight(0xffffff, 0.5, 20)
    point.position.set(0, 4, 0)
    this.scene.add(point)
  }

  setGridVisible(visible: boolean): void {
    this.grid.visible = visible
  }
}
