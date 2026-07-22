import { useState, useCallback } from 'react'

interface SongCoverProps {
  coverUrl?: string
  onCoverChange: (url: string) => void
}

export function SongCover({ coverUrl, onCoverChange }: SongCoverProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        onCoverChange(result)
      }
      reader.readAsDataURL(file)
    }
    setFileInputKey(prev => prev + 1)
  }, [onCoverChange])

  const handleReset = useCallback(() => {
    onCoverChange('')
  }, [onCoverChange])

  if (!coverUrl) return null

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-2xl
                   transition-all duration-500 transform group-hover:scale-105"
        style={{
          boxShadow: '0 0 40px rgba(99, 102, 241, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <img
          src={coverUrl}
          alt="封面"
          className="w-full h-full object-cover"
        />
        
        <div
          className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2
                      transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <label className="cursor-pointer">
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-indigo-500/80 
                           hover:bg-indigo-400/90 transition-colors">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-white text-xs">更换封面</span>
            </div>
          </label>
          
          <button
            onClick={handleReset}
            className="p-3 rounded-lg bg-red-500/80 hover:bg-red-400/90 
                       transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
