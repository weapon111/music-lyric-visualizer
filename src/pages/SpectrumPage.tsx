import { useState, useEffect } from 'react'
import { SpectrumCanvas } from '../components/SpectrumCanvas'
import { PlayControl } from '../components/PlayControl'
import { AudioUrlInput } from '../components/AudioUrlInput'
import { LyricDisplay } from '../components/LyricDisplay'
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'
import { useAnimationLoop } from '../hooks/useAnimationLoop'
import { searchLyrics, translateLyrics, LyricLine } from '../utils/lyricService'
import { parseMusicUrl, SongInfo } from '../utils/musicParser'

export function SpectrumPage() {
  const {
    frequencyData,
    waveformData,
    isPlaying,
    hasAudio,
    audioUrl,
    currentTime,
    toggle,
    loadAudioUrl,
    removeAudio,
    updateData,
  } = useAudioAnalyzer()

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasLyrics, setHasLyrics] = useState(false)
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [lyricsVisible, setLyricsVisible] = useState(true)

  useEffect(() => {
    const loadLyrics = async () => {
      setIsSearching(true)
      setHasLyrics(false)
      setSongInfo(null)

      let result: LyricLine[] = []

      if (hasAudio && audioUrl) {
        const parsedInfo = await parseMusicUrl(audioUrl)

        if (parsedInfo) {
          setSongInfo(parsedInfo)
          setCoverUrl(parsedInfo.cover || '')

          // 优先使用平台自带的歌词（如抖音页面内嵌歌词，已带时间戳）
          if (parsedInfo.lyrics && parsedInfo.lyrics.length > 0) {
            result = parsedInfo.lyrics
          } else {
            // 后备：从外部歌词库搜索
            const searchQuery = parsedInfo.artist
              ? `${parsedInfo.artist} ${parsedInfo.name}`
              : parsedInfo.name

            result = await searchLyrics(searchQuery)
          }
        } else {
          const songName = extractSongName(audioUrl)
          if (songName) {
            result = await searchLyrics(songName)
          }
        }
      }

      if (result.length > 0 && result[0].text && result[0].text.length > 0) {
        // 同步等待：解析 → 搜索歌词 → 翻译 → 显示（全程转圈等）
        // 腾讯翻译君批量翻译整首歌，通常 1-2 秒完成；翻译完成后再一起显示原文+译文
        const translated = await translateLyrics(result)
        setLyrics(translated)
        setHasLyrics(true)
        setLyricsVisible(true)
        setIsSearching(false)
      } else {
        setLyrics([])
        setHasLyrics(false)
        setIsSearching(false)
      }
    }

    loadLyrics()
  }, [hasAudio, audioUrl])

  const extractSongName = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      const lastPart = pathParts[pathParts.length - 1] || ''
      return decodeURIComponent(lastPart.replace(/\.[^/.]+$/, ''))
    } catch {
      return url.replace(/\.[^/.]+$/, '').split('/').pop() || ''
    }
  }

  useAnimationLoop(updateData, true)

  return (
    <div className="relative w-full h-screen bg-dark-bg overflow-hidden">
      {/* 背景图层：封面 + 模糊 + 暗色遮罩 */}
      {coverUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={coverUrl}
            alt="背景"
            className="w-full h-full object-cover scale-110 blur-2xl"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <SpectrumCanvas
        frequencyData={frequencyData}
        waveformData={waveformData}
        isPlaying={isPlaying}
      />

      {isSearching ? (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                        flex flex-col items-center gap-4 z-10">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent
                         rounded-full animate-spin" />
          <span className="text-white/60 text-lg">正在识别并翻译歌词...</span>
        </div>
      ) : (
        hasLyrics && (
          <LyricDisplay
            lyrics={lyrics}
            currentTime={currentTime}
            visible={lyricsVisible}
            onClose={() => setLyricsVisible(false)}
          />
        )
      )}

      <div className="absolute top-0 left-0 right-0 p-6 z-20">
        <div className="max-w-md mx-auto">
          <AudioUrlInput
            onUrlSubmit={loadAudioUrl}
            hasAudio={hasAudio}
            audioUrl={audioUrl}
            onRemove={removeAudio}
            songName={songInfo?.name}
            songArtist={songInfo?.artist}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-4 z-20">
        <PlayControl isPlaying={isPlaying} onToggle={toggle} />
      </div>

      {/* 右上角：实时指示 + 显示歌词按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            {hasLyrics && !lyricsVisible && (
              <button
                onClick={() => setLyricsVisible(true)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md
                           border border-white/20 hover:border-white/40
                           transition-all duration-200 hover:scale-105 group"
                title="显示歌词"
              >
                <svg className="w-5 h-5 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/50 text-xs">实时</span>
          </div>
        </div>
      </div>
    </div>
  )
}
