export function generateMockSpectrum(length: number, time: number): number[] {
  const data: number[] = []
  for (let i = 0; i < length; i++) {
    const base = Math.sin(time * 0.002 + i * 0.1) * 0.3 + 0.5
    const noise = Math.random() * 0.4
    const wave = Math.sin(time * 0.001 * (i / length + 1)) * 0.3
    const value = Math.min(1, Math.max(0, base + noise + wave))
    data.push(value)
  }
  return data
}

export function generateMockWaveform(length: number, time: number): number[] {
  const data: number[] = []
  for (let i = 0; i < length; i++) {
    const angle = (i / length) * Math.PI * 2
    const base = Math.sin(angle + time * 0.003) * 0.5
    const noise = (Math.random() - 0.5) * 0.3
    const wave = Math.sin(angle * 3 + time * 0.002) * 0.2
    const value = Math.min(1, Math.max(-1, base + noise + wave))
    data.push(value)
  }
  return data
}

export function getRainbowColor(index: number, total: number): string {
  const hue = (index / total) * 360
  return `hsl(${hue}, 100%, 60%)`
}

export function smoothTransition(current: number[], target: number[], factor: number): number[] {
  return current.map((val, i) => val + (target[i] - val) * factor)
}
