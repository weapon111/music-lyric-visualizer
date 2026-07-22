import { useState, useRef, useCallback, useEffect } from 'react'
import { LyricLine, findCurrentLyric } from '../utils/lyricService'

interface LyricDisplayProps {
  lyrics: LyricLine[]
  currentTime: number
  visible?: boolean
  onClose?: () => void
}

export function LyricDisplay({ lyrics, currentTime, visible = true, onClose }: LyricDisplayProps) {
  // 拖拽：offset 为相对初始居中位置的像素偏移
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })

  // 拖拽过程中在 window 上监听 mousemove/mouseup，
  // 确保鼠标移出歌词区域甚至移出窗口仍可继续拖动
  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      setOffset({
        x: dragStart.current.offsetX + dx,
        y: dragStart.current.offsetY + dy,
      })
    }
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 仅左键触发拖拽
    if (e.button !== 0) return
    e.preventDefault()
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
    setIsDragging(true)
  }, [offset])

  // 双击恢复到初始居中位置
  const handleDoubleClick = useCallback(() => {
    setOffset({ x: 0, y: 0 })
  }, [])

  if (lyrics.length === 0) return null

  const currentIndex = findCurrentLyric(lyrics, currentTime)
  const displayIndex = currentIndex >= 0 ? currentIndex : 0

  return (
    <div
      className={`absolute top-1/2 left-1/2 z-10
                 transition-all duration-300 ease-out pointer-events-none
                 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className="flex flex-col items-center gap-6 select-none pointer-events-auto relative"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="拖动移动位置 · 双击恢复居中"
      >
        {/* 关闭按钮 */}
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute -top-3 -right-3 w-7 h-7
                       flex items-center justify-center
                       rounded-full bg-white/10 hover:bg-white/25
                       border border-white/20 hover:border-white/40
                       backdrop-blur-md
                       text-white/70 hover:text-white
                       text-lg font-light leading-none
                       transition-all duration-200
                       hover:scale-110
                       z-20"
            title="关闭歌词"
            aria-label="关闭歌词"
          >
            ×
          </button>
        )}

        <div className="flex flex-col items-center gap-4 pt-1">
          <div
            className="text-2xl md:text-3xl font-bold text-white
                       transition-all duration-300"
            style={{
              textShadow: '0 0 20px rgba(99, 102, 241, 0.8), 0 0 40px rgba(99, 102, 241, 0.4)',
              opacity: currentIndex >= 0 ? 1 : 0.5,
            }}
          >
            {lyrics[displayIndex].text}
          </div>
          {lyrics[displayIndex].translation && (
            <div
              className="text-lg md:text-xl text-white/70
                         transition-all duration-300"
              style={{
                textShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
                opacity: currentIndex >= 0 ? 1 : 0.4,
              }}
            >
              {lyrics[displayIndex].translation}
            </div>
          )}
        </div>

        <div className="flex gap-1 mt-4">
          {lyrics.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-indigo-400 w-3 h-3 shadow-lg shadow-indigo-400/50'
                  : index < currentIndex
                    ? 'bg-white/40'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
