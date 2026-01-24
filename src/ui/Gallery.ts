import * as THREE from 'three'
import { MediaItem } from '../media/types'
import { ThumbnailGenerator } from './ThumbnailGenerator'

const THUMB_WIDTH = 0.4
const THUMB_HEIGHT = 0.4
const THUMB_GAP = 0.08
const COLUMNS = 4
const GALLERY_DISTANCE = 3
const GALLERY_HEIGHT = 1.4

export class Gallery {
  private scene: THREE.Scene
  private group: THREE.Group
  private thumbnailGenerator: ThumbnailGenerator
  private items: MediaItem[] = []
  private thumbnailMeshes: THREE.Mesh[] = []
  private selectedIndex = -1
  private onSelectCallback?: (item: MediaItem, index: number) => void

  // Navigation buttons
  private prevButton: THREE.Mesh
  private nextButton: THREE.Mesh
  private pageIndex = 0
  private itemsPerPage = 8 // 2 rows x 4 columns

  // Selection highlight
  private selectionRing: THREE.Mesh

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.thumbnailGenerator = new ThumbnailGenerator()
    this.group = new THREE.Group()
    this.group.position.set(0, GALLERY_HEIGHT, -GALLERY_DISTANCE)

    // Create navigation buttons
    this.prevButton = this.createNavButton('<', -1.2)
    this.nextButton = this.createNavButton('>', 1.2)
    this.group.add(this.prevButton)
    this.group.add(this.nextButton)

    // Selection ring
    this.selectionRing = this.createSelectionRing()
    this.selectionRing.visible = false
    this.group.add(this.selectionRing)

    this.scene.add(this.group)
  }

  private createNavButton(label: string, xPos: number): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(0.15, 32)
    const material = new THREE.MeshBasicMaterial({ color: 0x4a9eff })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(xPos, 0, 0)
    mesh.name = label === '<' ? 'gallery-prev' : 'gallery-next'
    mesh.userData.interactive = true
    mesh.userData.isNavButton = true

    // Add label
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#4a9eff'
    ctx.beginPath()
    ctx.arc(32, 32, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 40px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 32, 32)

    const texture = new THREE.CanvasTexture(canvas)
    ;(mesh.material as THREE.MeshBasicMaterial).map = texture
    ;(mesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff)

    return mesh
  }

  private createSelectionRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(
      THUMB_WIDTH / 2 + 0.02,
      THUMB_WIDTH / 2 + 0.05,
      32
    )
    const material = new THREE.MeshBasicMaterial({
      color: 0x4a9eff,
      side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geometry, material)
  }

  async setItems(items: MediaItem[]): Promise<void> {
    this.items = items
    this.pageIndex = 0
    this.selectedIndex = -1
    await this.renderPage()
  }

  private async renderPage(): Promise<void> {
    // Clear existing thumbnails
    this.thumbnailMeshes.forEach((mesh) => {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    })
    this.thumbnailMeshes = []

    const startIndex = this.pageIndex * this.itemsPerPage
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.items.length)
    const pageItems = this.items.slice(startIndex, endIndex)

    // Create thumbnails
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i]
      const mesh = await this.createThumbnailMesh(item, startIndex + i)

      // Grid position
      const col = i % COLUMNS
      const row = Math.floor(i / COLUMNS)
      const totalWidth = COLUMNS * THUMB_WIDTH + (COLUMNS - 1) * THUMB_GAP
      const x = col * (THUMB_WIDTH + THUMB_GAP) - totalWidth / 2 + THUMB_WIDTH / 2
      const y = -row * (THUMB_HEIGHT + THUMB_GAP)

      mesh.position.set(x, y, 0)
      this.group.add(mesh)
      this.thumbnailMeshes.push(mesh)
    }

    // Update nav button visibility
    this.prevButton.visible = this.pageIndex > 0
    this.nextButton.visible = endIndex < this.items.length

    // Update selection ring if selected item is on this page
    this.updateSelectionRing()
  }

  private async createThumbnailMesh(item: MediaItem, index: number): Promise<THREE.Mesh> {
    const geometry = new THREE.PlaneGeometry(THUMB_WIDTH, THUMB_HEIGHT)
    const material = new THREE.MeshBasicMaterial({ color: 0x333333 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `thumbnail-${index}`
    mesh.userData.interactive = true
    mesh.userData.mediaIndex = index
    mesh.userData.mediaItem = item

    // Load thumbnail async
    try {
      const texture = await this.thumbnailGenerator.generateThumbnail(item)
      material.map = texture
      material.color.setHex(0xffffff)
      material.needsUpdate = true
    } catch (e) {
      console.warn('Failed to generate thumbnail for', item.name)
    }

    // Add border for 360 content
    if (item.type === 'image-360' || item.type === 'video-360') {
      this.add360Indicator(mesh)
    }

    return mesh
  }

  private add360Indicator(mesh: THREE.Mesh): void {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 24
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(74, 158, 255, 0.9)'
    ctx.roundRect(0, 0, 64, 24, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('360°', 32, 12)

    const texture = new THREE.CanvasTexture(canvas)
    const geometry = new THREE.PlaneGeometry(0.12, 0.045)
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    const badge = new THREE.Mesh(geometry, material)
    badge.position.set(THUMB_WIDTH / 2 - 0.07, -THUMB_HEIGHT / 2 + 0.035, 0.001)
    mesh.add(badge)
  }

  private updateSelectionRing(): void {
    if (this.selectedIndex < 0) {
      this.selectionRing.visible = false
      return
    }

    const startIndex = this.pageIndex * this.itemsPerPage
    const localIndex = this.selectedIndex - startIndex

    if (localIndex >= 0 && localIndex < this.thumbnailMeshes.length) {
      const mesh = this.thumbnailMeshes[localIndex]
      this.selectionRing.position.copy(mesh.position)
      this.selectionRing.position.z = -0.01
      this.selectionRing.visible = true
    } else {
      this.selectionRing.visible = false
    }
  }

  handleInteraction(object: THREE.Object3D): boolean {
    // Check nav buttons
    if (object === this.prevButton && this.pageIndex > 0) {
      this.pageIndex--
      this.renderPage()
      return true
    }
    if (object === this.nextButton) {
      const maxPage = Math.ceil(this.items.length / this.itemsPerPage) - 1
      if (this.pageIndex < maxPage) {
        this.pageIndex++
        this.renderPage()
      }
      return true
    }

    // Check thumbnail clicks
    const index = object.userData.mediaIndex
    if (typeof index === 'number') {
      this.selectedIndex = index
      this.updateSelectionRing()
      const item = this.items[index]
      this.onSelectCallback?.(item, index)
      return true
    }

    return false
  }

  onSelect(callback: (item: MediaItem, index: number) => void): void {
    this.onSelectCallback = callback
  }

  selectNext(): void {
    if (this.items.length === 0) return
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length

    // Navigate to page if needed
    const targetPage = Math.floor(this.selectedIndex / this.itemsPerPage)
    if (targetPage !== this.pageIndex) {
      this.pageIndex = targetPage
      this.renderPage()
    } else {
      this.updateSelectionRing()
    }

    const item = this.items[this.selectedIndex]
    this.onSelectCallback?.(item, this.selectedIndex)
  }

  selectPrev(): void {
    if (this.items.length === 0) return
    this.selectedIndex = this.selectedIndex <= 0 ? this.items.length - 1 : this.selectedIndex - 1

    const targetPage = Math.floor(this.selectedIndex / this.itemsPerPage)
    if (targetPage !== this.pageIndex) {
      this.pageIndex = targetPage
      this.renderPage()
    } else {
      this.updateSelectionRing()
    }

    const item = this.items[this.selectedIndex]
    this.onSelectCallback?.(item, this.selectedIndex)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  get isVisible(): boolean {
    return this.group.visible
  }

  getSelectedIndex(): number {
    return this.selectedIndex
  }

  getItemCount(): number {
    return this.items.length
  }

  dispose(): void {
    this.thumbnailMeshes.forEach((mesh) => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    })
    this.scene.remove(this.group)
  }
}
