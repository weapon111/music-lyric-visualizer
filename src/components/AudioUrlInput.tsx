import { useState, useCallback } from 'react'

interface AudioUrlInputProps {
  onUrlSubmit: (url: string) => void
  hasAudio: boolean
  audioUrl: string
  onRemove: () => void
  // 解析得到的真实歌曲名/作者（异步，加载瞬间可能尚未拿到，此时回退到 URL 解析）
  songName?: string
  songArtist?: string
}

export function AudioUrlInput({ onUrlSubmit, hasAudio, audioUrl, onRemove, songName, songArtist }: AudioUrlInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onUrlSubmit(inputValue.trim())
      setInputValue('')
    }
  }, [inputValue, onUrlSubmit])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }, [onRemove])

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

  return (
    <div
      className={`relative px-6 py-4 rounded-xl backdrop-blur-md
                  border-2 border-dashed transition-all duration-300
                  ${hasAudio
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : isFocused
                      ? 'border-indigo-400 bg-indigo-500/20'
                      : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                  }`}
    >
      {hasAudio ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-indigo-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
              />
            </svg>
            <div className="flex flex-col">
              <span className="text-white/90 text-sm font-medium truncate max-w-[240px]">
                {songName || extractSongName(audioUrl)}
              </span>
              <span className="text-white/40 text-xs truncate max-w-[240px]">
                {songArtist || audioUrl}
              </span>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            aria-label="移除音频"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-white/60 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="输入音频链接..."
            className="flex-1 bg-transparent text-white placeholder-white/40 
                       outline-none text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 
                       text-white text-sm rounded-lg transition-colors"
          >
            加载
          </button>
        </form>
      )}
    </div>
  )
}
