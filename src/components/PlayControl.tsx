interface PlayControlProps {
  isPlaying: boolean
  onToggle: () => void
}

export function PlayControl({ isPlaying, onToggle }: PlayControlProps) {
  return (
    <button
      onClick={onToggle}
      className="group relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                 flex items-center justify-center cursor-pointer
                 hover:from-indigo-400 hover:to-purple-500
                 active:scale-95 transition-all duration-300
                 shadow-lg hover:shadow-indigo-500/50 hover:shadow-xl
                 animate-pulse-glow"
      aria-label={isPlaying ? '暂停' : '播放'}
    >
      <div className="relative w-8 h-8">
        {isPlaying ? (
          <svg
            className="w-full h-full text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg
            className="w-full h-full text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </div>
      <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors" />
      <div className="absolute inset-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors" />
    </button>
  )
}
