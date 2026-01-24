export class VideoController {
  private video: HTMLVideoElement
  private onStateChange?: (state: VideoState) => void

  constructor(video: HTMLVideoElement) {
    this.video = video
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.video.addEventListener('play', () => this.notifyStateChange())
    this.video.addEventListener('pause', () => this.notifyStateChange())
    this.video.addEventListener('timeupdate', () => this.notifyStateChange())
    this.video.addEventListener('ended', () => this.notifyStateChange())
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState())
  }

  play(): void {
    this.video.play().catch((e) => console.warn('Play failed:', e))
  }

  pause(): void {
    this.video.pause()
  }

  toggle(): void {
    if (this.video.paused) {
      this.play()
    } else {
      this.pause()
    }
  }

  seek(time: number): void {
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration))
  }

  seekRelative(delta: number): void {
    this.seek(this.video.currentTime + delta)
  }

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume))
  }

  setMuted(muted: boolean): void {
    this.video.muted = muted
  }

  getState(): VideoState {
    return {
      playing: !this.video.paused,
      currentTime: this.video.currentTime,
      duration: this.video.duration || 0,
      progress: this.video.duration ? this.video.currentTime / this.video.duration : 0,
      muted: this.video.muted,
      volume: this.video.volume,
    }
  }

  onState(callback: (state: VideoState) => void): void {
    this.onStateChange = callback
  }
}

export interface VideoState {
  playing: boolean
  currentTime: number
  duration: number
  progress: number
  muted: boolean
  volume: number
}
