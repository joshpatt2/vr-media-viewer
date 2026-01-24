import * as THREE from 'three'

export class XRSessionManager {
  private renderer: THREE.WebGLRenderer
  private button: HTMLButtonElement
  private currentSession: XRSession | null = null

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.button = document.getElementById('vr-button') as HTMLButtonElement

    this.checkXRSupport()
  }

  private async checkXRSupport(): Promise<void> {
    if (!navigator.xr) {
      this.button.textContent = 'WebXR Not Supported'
      return
    }

    const isSupported = await navigator.xr.isSessionSupported('immersive-vr')

    if (isSupported) {
      this.button.textContent = 'Enter VR'
      this.button.disabled = false
      this.button.addEventListener('click', () => this.toggleSession())
    } else {
      this.button.textContent = 'VR Not Available'
    }
  }

  private async toggleSession(): Promise<void> {
    if (this.currentSession) {
      await this.currentSession.end()
      return
    }

    try {
      const session = await navigator.xr!.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'hand-tracking'],
      })

      this.onSessionStarted(session)
    } catch (error) {
      console.error('Failed to start XR session:', error)
    }
  }

  private onSessionStarted(session: XRSession): void {
    this.currentSession = session
    this.button.textContent = 'Exit VR'

    session.addEventListener('end', () => this.onSessionEnded())

    this.renderer.xr.setSession(session)

    // Request 72Hz for Quest
    if ('updateTargetFrameRate' in session) {
      (session as any).updateTargetFrameRate(72).catch(() => {
        // Fallback if not supported
      })
    }
  }

  private onSessionEnded(): void {
    this.currentSession = null
    this.button.textContent = 'Enter VR'
  }

  get isInVR(): boolean {
    return this.currentSession !== null
  }
}
