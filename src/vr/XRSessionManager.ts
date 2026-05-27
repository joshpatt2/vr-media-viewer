import * as THREE from 'three'

export type SessionMode = 'ar' | 'vr'

export class XRSessionManager {
  private renderer: THREE.WebGLRenderer
  private button: HTMLButtonElement
  private currentSession: XRSession | null = null
  private sessionStartCallback?: (mode: SessionMode) => void
  private sessionEndCallback?: () => void
  private supportedMode: SessionMode | null = null

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.button = document.getElementById('vr-button') as HTMLButtonElement

    this.checkXRSupport()
  }

  onSessionStart(callback: (mode: SessionMode) => void): void {
    this.sessionStartCallback = callback
  }

  onSessionEnd(callback: () => void): void {
    this.sessionEndCallback = callback
  }

  private async checkXRSupport(): Promise<void> {
    if (!navigator.xr) {
      this.button.textContent = 'WebXR Not Supported'
      return
    }

    // Check for AR (passthrough) support first - preferred mode
    const arSupported = await navigator.xr.isSessionSupported('immersive-ar')
    const vrSupported = await navigator.xr.isSessionSupported('immersive-vr')

    if (arSupported) {
      this.supportedMode = 'ar'
      this.button.textContent = 'Enter MR'
      this.button.disabled = false
      this.button.addEventListener('click', () => this.toggleSession())
    } else if (vrSupported) {
      this.supportedMode = 'vr'
      this.button.textContent = 'Enter VR'
      this.button.disabled = false
      this.button.addEventListener('click', () => this.toggleSession())
    } else {
      this.button.textContent = 'XR Not Available'
    }
  }

  private async toggleSession(): Promise<void> {
    if (this.currentSession) {
      await this.currentSession.end()
      return
    }

    try {
      let session: XRSession

      if (this.supportedMode === 'ar') {
        // AR session with passthrough
        session = await navigator.xr!.requestSession('immersive-ar', {
          optionalFeatures: ['local-floor', 'hand-tracking'],
        })
      } else {
        // Fallback to VR
        session = await navigator.xr!.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'hand-tracking'],
        })
      }

      this.onSessionStarted(session)
    } catch (error) {
      console.error('Failed to start XR session:', error)
    }
  }

  private onSessionStarted(session: XRSession): void {
    this.currentSession = session
    this.button.textContent = this.supportedMode === 'ar' ? 'Exit MR' : 'Exit VR'

    session.addEventListener('end', () => this.onSessionEnded())

    this.renderer.xr.setSession(session)

    // Request 90Hz for Quest 3 passthrough, 72Hz fallback
    void this.setTargetFrameRate(session, [90, 72])

    this.sessionStartCallback?.(this.supportedMode!)
  }

  private onSessionEnded(): void {
    this.currentSession = null
    this.button.textContent = this.supportedMode === 'ar' ? 'Enter MR' : 'Enter VR'
    this.sessionEndCallback?.()
  }

  private async setTargetFrameRate(session: XRSession, candidates: number[]): Promise<void> {
    if (!('updateTargetFrameRate' in session)) return

    for (const rate of candidates) {
      try {
        await (session as any).updateTargetFrameRate(rate)
        return
      } catch {
        // try next candidate
      }
    }
  }

  get isInXR(): boolean {
    return this.currentSession !== null
  }

  get isPassthrough(): boolean {
    return this.currentSession !== null && this.supportedMode === 'ar'
  }
}
