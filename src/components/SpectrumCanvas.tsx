import { useRef, useEffect, useCallback } from 'react'
import { smoothTransition } from '../utils/spectrumGenerator'

interface SpectrumCanvasProps {
  frequencyData: number[]
  waveformData: number[]
  isPlaying: boolean
}

// 中央环形波形整体缩放系数（相对原始尺寸）：缩小到 55%
// 配合 centerY 上移，使环形完全落入顶部输入框下方、频谱柱条上方的空白区，不与任何元素重叠
const RING_SCALE = 0.55

export function SpectrumCanvas({ frequencyData, waveformData, isPlaying }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smoothedFreqRef = useRef<number[]>([])
  // 峰值帽：每根柱条的近期峰值，独立缓慢下落，强化节奏可视化
  const peakRef = useRef<number[]>([])
  const rotationRef = useRef(0)
  const innerRotationRef = useRef(0)
  const corePulseRef = useRef(1)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 透明背景：清除上一帧，让页面背景封面图透出（不再用不透明深色覆盖背景）
    ctx.clearRect(0, 0, width, height)

    // 径向暗化 vignette：中心微压、边缘暗化，增强中心聚焦与频谱在任意背景下的对比度
    const vRadius = Math.max(width, height) * 0.7
    const vGrad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.15, width / 2, height / 2, vRadius)
    vGrad.addColorStop(0, 'rgba(0, 0, 0, 0.18)')
    vGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.38)')
    vGrad.addColorStop(1, 'rgba(0, 0, 0, 0.68)')
    ctx.fillStyle = vGrad
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    // 环形波形上移到屏幕 26% 处（原 50%），避让中心歌词区，落在顶部输入框下方的空白区
    const centerY = height * 0.26
    // 环形整体缩小到 55%，确保上移后完全处于无遮挡空白区
    const ringRadius = Math.min(width, height) * 0.25 * RING_SCALE
    const barCount = Math.max(60, frequencyData.length || 60)

    if (smoothedFreqRef.current.length !== barCount) {
      smoothedFreqRef.current = new Array(barCount).fill(0)
      peakRef.current = new Array(barCount).fill(0)
    }

    const targetData = frequencyData.length >= barCount
      ? frequencyData.slice(0, barCount)
      : [...frequencyData, ...new Array(barCount - frequencyData.length).fill(0)]

    // 节奏响应：上升 factor 提到 0.28，柱条更紧跟节拍
    smoothedFreqRef.current = smoothTransition(smoothedFreqRef.current, targetData, 0.28)

    // 峰值帽：即时上升、缓慢下落（0.94），让每次节拍留下拖影
    for (let i = 0; i < barCount; i++) {
      const v = smoothedFreqRef.current[i] || 0
      if (v >= peakRef.current[i]) {
        peakRef.current[i] = v
      } else {
        peakRef.current[i] *= 0.94
      }
    }

    rotationRef.current += isPlaying ? 0.009 : 0.002
    innerRotationRef.current -= isPlaying ? 0.006 : 0.0015

    // 核心脉动：跟随波形整体强度平滑缩放
    const waveIntensity = waveformData.length > 0
      ? waveformData.reduce((a, b) => a + Math.abs(b), 0) / waveformData.length
      : 0.3
    const targetPulse = 1 + Math.min(waveIntensity, 1) * 0.25
    corePulseRef.current += (targetPulse - corePulseRef.current) * 0.15

    drawRingWaveform(ctx, centerX, centerY, ringRadius, waveIntensity)
    drawSpectrumBars(ctx, width, height, barCount)
  }, [frequencyData, waveformData, isPlaying])

  // 中央环形波形：3 层（外层彩虹分段正转 / 中层紫蓝正转 / 内层白色反转）+ 脉动核心
  // 振幅与层间距按 RING_SCALE 等比缩放，保持缩小后的视觉比例；线宽/发光/颜色/旋转速度不变，保持视觉样式与动画
  const drawRingWaveform = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    waveIntensity: number,
  ) => {
    const points = 128
    const intensity = Math.max(waveIntensity, 0.3)

    // === 外层：彩虹分段，粗笔触，强发光，正转 ===
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotationRef.current)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const segments = 16
    const ptsPerSeg = points / segments
    for (let s = 0; s < segments; s++) {
      const hue = (s / segments) * 360
      ctx.strokeStyle = `hsla(${hue}, 100%, 62%, 0.92)`
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.9)`
      ctx.shadowBlur = 18
      ctx.lineWidth = 4

      ctx.beginPath()
      // 多画 1 个点使相邻段端点重叠，配合 round cap 消除接缝
      for (let i = 0; i <= ptsPerSeg + 1; i++) {
        const idx = s * ptsPerSeg + i
        const angle = (idx / points) * Math.PI * 2
        let wave = 0
        if (waveformData.length > 0) {
          const dataIndex = Math.floor((idx / points) * waveformData.length) % waveformData.length
          wave = waveformData[dataIndex] * 30 * RING_SCALE
        } else {
          wave = (Math.sin(angle * 3 + rotationRef.current * 2) * 12 +
                 Math.sin(angle * 7 + rotationRef.current * 3) * 6) * RING_SCALE
        }
        const r = radius + wave * intensity * 3.5
        const x = Math.cos(angle) * r
        const y = Math.sin(angle) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()

    // === 中层：紫蓝半透明，中粗，正转（较慢） ===
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotationRef.current * 0.6)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)'
    ctx.shadowColor = 'rgba(168, 85, 247, 0.7)'
    ctx.shadowBlur = 12
    ctx.lineWidth = 2.5

    ctx.beginPath()
    const midRadius = radius - 18 * RING_SCALE
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2
      let wave = 0
      if (waveformData.length > 0) {
        const dataIndex = Math.floor((i / points) * waveformData.length)
        wave = waveformData[dataIndex] * 22 * RING_SCALE
      } else {
        wave = Math.sin(angle * 5 - rotationRef.current * 3) * 10 * RING_SCALE
      }
      const r = midRadius + wave * intensity * 2.8
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.restore()

    // === 内层：白色细线，淡，反转，增加层次与动感 ===
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(innerRotationRef.current)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)'
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'
    ctx.shadowBlur = 8
    ctx.lineWidth = 1.5

    ctx.beginPath()
    const innerRadius = radius - 34 * RING_SCALE
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2
      let wave = 0
      if (waveformData.length > 0) {
        const dataIndex = Math.floor((i / points) * waveformData.length)
        wave = waveformData[dataIndex] * 14 * RING_SCALE
      } else {
        wave = Math.sin(angle * 4 - innerRotationRef.current * 2) * 7 * RING_SCALE
      }
      const r = Math.max(20, innerRadius + wave * intensity * 2.2)
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.restore()

    // === 核心：径向渐变 + 随波形脉动 ===
    ctx.save()
    ctx.translate(cx, cy)
    const coreRadius = Math.max(10, radius * 0.55 * corePulseRef.current)
    const gradient = ctx.createRadialGradient(0, 0, coreRadius * 0.2, 0, 0, coreRadius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
    gradient.addColorStop(0.3, 'rgba(168, 85, 247, 0.65)')
    gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.45)')
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)')
    ctx.fillStyle = gradient
    ctx.shadowColor = 'rgba(168, 85, 247, 0.8)'
    ctx.shadowBlur = 30
    ctx.beginPath()
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // 底部频谱柱条：非线性增益 + 三段渐变 + 峰值帽 + 镜像反射 + 强发光
  const drawSpectrumBars = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    count: number,
  ) => {
    const padding = 40
    const maxBarHeight = height * 0.42
    const totalWidth = width - padding * 2
    const barGap = 2
    const barWidth = (totalWidth - (count - 1) * barGap) / count
    const baselineY = height * 0.82
    const radius = Math.min(barWidth / 2, 3)

    ctx.save()
    ctx.lineCap = 'round'

    for (let i = 0; i < count; i++) {
      const value = smoothedFreqRef.current[i] || 0
      // 非线性增益：弱信号提亮可见、强信号更突出
      const boosted = Math.pow(value, 0.7)
      const barHeight = boosted * maxBarHeight
      const x = padding + i * (barWidth + barGap)
      const y = baselineY - barHeight
      const hue = (i / count) * 360

      // 主柱条：三段渐变（高亮白顶 → 纯色 → 深色底），增强立体感与色彩对比
      const gradient = ctx.createLinearGradient(x, y, x, baselineY)
      gradient.addColorStop(0, `hsla(${hue}, 100%, 85%, 1)`)
      gradient.addColorStop(0.25, `hsla(${hue}, 100%, 62%, 1)`)
      gradient.addColorStop(1, `hsla(${hue}, 100%, 35%, 0.85)`)

      ctx.fillStyle = gradient
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
      ctx.shadowBlur = barHeight * 0.35 + 8
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, Math.max(barHeight, 1), radius)
      ctx.fill()

      // 峰值帽：亮色小条，独立下落，强化节拍拖影
      const peak = peakRef.current[i] || 0
      if (peak > 0.02) {
        const peakBoosted = Math.pow(peak, 0.7)
        const peakY = baselineY - peakBoosted * maxBarHeight
        ctx.shadowBlur = 10
        ctx.fillStyle = `hsla(${hue}, 100%, 92%, 0.95)`
        ctx.fillRect(x, peakY - 3, barWidth, 2.5)
      }

      // 镜像反射：向下翻转，透明度递减，增加空间感与视觉冲击
      if (barHeight > 1) {
        const mirrorGrad = ctx.createLinearGradient(x, baselineY, x, baselineY + barHeight * 0.5)
        mirrorGrad.addColorStop(0, `hsla(${hue}, 100%, 55%, 0.28)`)
        mirrorGrad.addColorStop(1, `hsla(${hue}, 100%, 45%, 0)`)
        ctx.fillStyle = mirrorGrad
        ctx.shadowBlur = 0
        ctx.beginPath()
        ctx.roundRect(x, baselineY, barWidth, barHeight * 0.5, radius)
        ctx.fill()
      }
    }

    ctx.restore()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      draw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [draw])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
    />
  )
}
