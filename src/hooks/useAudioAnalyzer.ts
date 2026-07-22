import { useState, useCallback, useRef, useEffect } from 'react'
import { AudioProcessor } from '../utils/audioProcessor'
import { generateMockSpectrum, generateMockWaveform } from '../utils/spectrumGenerator'
import { resolveAudioUrl } from '../utils/urlResolver'

interface AudioAnalyzerState {
  frequencyData: number[]
  waveformData: number[]
  isPlaying: boolean
  hasAudio: boolean
  audioUrl: string
  currentTime: number
}

export function useAudioAnalyzer() {
  const [state, setState] = useState<AudioAnalyzerState>({
    frequencyData: [],
    waveformData: [],
    isPlaying: false,
    hasAudio: false,
    audioUrl: '',
    currentTime: 0,
  })

  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const spectrumLengthRef = useRef(64)
  const waveformLengthRef = useRef(128)
  const timeRef = useRef(0)

  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor()
    return () => {
      audioProcessorRef.current?.stop()
    }
  }, [])

  const loadAudioUrl = useCallback(async (url: string) => {
    try {
      const resolvedUrl = await resolveAudioUrl(url)
      await audioProcessorRef.current?.loadAudioUrl(resolvedUrl)
      setState(prev => ({
        ...prev,
        hasAudio: true,
        audioUrl: url,
        frequencyData: [],
        waveformData: [],
      }))
    } catch (error) {
      console.error('Failed to load audio URL:', error)
    }
  }, [])

  const removeAudio = useCallback(() => {
    audioProcessorRef.current?.stop()
    setState(prev => ({
      ...prev,
      hasAudio: false,
      audioUrl: '',
      isPlaying: false,
    }))
    timeRef.current = 0
  }, [])

  const play = useCallback(() => {
    if (state.hasAudio) {
      audioProcessorRef.current?.play()
      setState(prev => ({ ...prev, isPlaying: true }))
    } else {
      setState(prev => ({ ...prev, isPlaying: true }))
    }
  }, [state.hasAudio])

  const pause = useCallback(() => {
    if (state.hasAudio) {
      audioProcessorRef.current?.pause()
    }
    setState(prev => ({ ...prev, isPlaying: false }))
  }, [state.hasAudio])

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [state.isPlaying, play, pause])

  const updateData = useCallback(() => {
    if (state.hasAudio && audioProcessorRef.current) {
      const isPlaying = audioProcessorRef.current.isPlaying()
      const freqData = audioProcessorRef.current.getFrequencyData()
      const waveData = audioProcessorRef.current.getWaveformData()
      const currentTime = audioProcessorRef.current.getCurrentTime()
      
      setState(prev => ({
        ...prev,
        frequencyData: freqData.slice(0, spectrumLengthRef.current),
        waveformData: waveData.slice(0, waveformLengthRef.current),
        isPlaying,
        currentTime,
      }))
    } else if (state.isPlaying) {
      timeRef.current += 16
      const freqData = generateMockSpectrum(spectrumLengthRef.current, timeRef.current)
      const waveData = generateMockWaveform(waveformLengthRef.current, timeRef.current)
      
      setState(prev => ({
        ...prev,
        frequencyData: freqData,
        waveformData: waveData,
        currentTime: timeRef.current / 1000,
      }))
    }
  }, [state.isPlaying, state.hasAudio])

  return {
    ...state,
    play,
    pause,
    toggle,
    loadAudioUrl,
    removeAudio,
    updateData,
  }
}
