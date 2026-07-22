export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private audioElement: HTMLAudioElement | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
  }

  async loadAudioUrl(url: string): Promise<void> {
    await this.initialize()
    
    const proxyUrl = this.getProxyUrl(url)
    await this.setupAudioElement(proxyUrl)
  }

  private getProxyUrl(url: string): string {
    // 已经是相对路径（代理路径）则直接返回
    if (url.startsWith('/')) {
      return url
    }

    // 所有外部音频 URL 都通过代理加载：
    // Web Audio API 的 createMediaElementSource 要求 crossOrigin='anonymous'，
    // 而外部音频服务器（如 douyinvod.com）不返回 CORS 头，会导致音频被静音。
    // 代理服务器会添加 CORS 头并支持 Range 请求（音频跳转所需）。
    try {
      const urlObj = new URL(url)
      // 仅代理 http/https 协议的外部链接
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        return `/api?url=${encodeURIComponent(url)}`
      }
    } catch {
      // 非标准 URL，原样返回
    }

    return url
  }

  private async setupAudioElement(url: string): Promise<void> {
    this.stop()

    this.audioElement = new Audio()
    this.audioElement.crossOrigin = 'anonymous'
    this.audioElement.src = url
    this.audioElement.preload = 'auto'

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        this.audioElement?.removeEventListener('loadedmetadata', onLoaded)
        this.audioElement?.removeEventListener('error', onError)
        this.connectAudioGraph()
        resolve()
      }

      const onError = (e: Event) => {
        this.audioElement?.removeEventListener('loadedmetadata', onLoaded)
        this.audioElement?.removeEventListener('error', onError)
        reject(e)
      }

      this.audioElement.addEventListener('loadedmetadata', onLoaded)
      this.audioElement.addEventListener('error', onError)

      this.audioElement.load()
    })
  }

  private connectAudioGraph(): void {
    if (!this.audioContext || !this.audioElement) return

    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement)
    
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 0.5
    
    this.sourceNode.connect(this.analyser)
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
  }

  play(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    this.audioElement?.play()
  }

  pause(): void {
    this.audioElement?.pause()
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.currentTime = 0
      this.audioElement = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    this.dataArray = null
  }

  getFrequencyData(): number[] {
    if (!this.analyser || !this.dataArray) {
      return []
    }
    this.analyser.getByteFrequencyData(this.dataArray)
    return Array.from(this.dataArray).map(v => v / 255)
  }

  getWaveformData(): number[] {
    if (!this.analyser || !this.dataArray) {
      return []
    }
    this.analyser.getByteTimeDomainData(this.dataArray)
    return Array.from(this.dataArray).map(v => (v - 128) / 128)
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0
  }

  isPlaying(): boolean {
    return this.audioElement?.paused === false
  }

  getDuration(): number {
    return this.audioElement?.duration || 0
  }
}
