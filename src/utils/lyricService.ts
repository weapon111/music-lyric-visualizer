export interface LyricLine {
  time: number
  text: string
  translation?: string
}

const mockLyrics: LyricLine[] = [
  { time: 0, text: "Hello, welcome to the audio visualizer", translation: "你好，欢迎来到音频可视化器" },
  { time: 3, text: "Enjoy the beautiful spectrum display", translation: "享受美丽的频谱展示" },
  { time: 6, text: "The colors dance with the music", translation: "色彩随音乐舞动" },
  { time: 9, text: "Feel the rhythm in your heart", translation: "感受心中的节奏" },
  { time: 12, text: "Every beat tells a story", translation: "每一个节拍都诉说着故事" },
  { time: 15, text: "Let the sound take you away", translation: "让声音带你远行" },
  { time: 18, text: "This is the power of music", translation: "这就是音乐的力量" },
  { time: 21, text: "Close your eyes and imagine", translation: "闭上眼睛，尽情想象" },
  { time: 24, text: "A world of pure harmony", translation: "一个纯粹和谐的世界" },
  { time: 27, text: "Thank you for listening", translation: "感谢您的聆听" },
]

export function getMockLyrics(): LyricLine[] {
  return mockLyrics
}

export function parseLRC(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n')
  const lyrics: LyricLine[] = []
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

  for (const line of lines) {
    const times: number[] = []
    let match
    
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1)
      times.push(minutes * 60 + seconds + milliseconds / 1000)
    }

    const text = line.replace(timeRegex, '').trim()
    
    if (text && times.length > 0) {
      for (const time of times) {
        lyrics.push({ time, text })
      }
    }
  }

  return lyrics.sort((a, b) => a.time - b.time)
}

// 通过本地代理服务器转发请求，规避浏览器 CORS 限制
// 代理服务器（server.mjs）会附加 User-Agent 等必要请求头并加上 CORS 响应头
function proxied(originalUrl: string): string {
  return `/api?url=${encodeURIComponent(originalUrl)}`
}

export async function searchLyrics(query: string): Promise<LyricLine[]> {
  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
    const response = await fetch(proxied(url))

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const results = await response.json()

    if (results.length === 0) {
      return await searchLyricsFromOtherSources(query)
    }

    const bestResult = results[0]
    const lyricsResponse = await fetch(proxied(`https://lrclib.net/api/get/${bestResult.id}`))
    const lyricsData = await lyricsResponse.json()

    if (lyricsData.lrc) {
      return parseLRC(lyricsData.lrc)
    }
  } catch {
  }

  return await searchLyricsFromOtherSources(query)
}

async function searchLyricsFromOtherSources(query: string): Promise<LyricLine[]> {
  try {
    // 注意：不要在浏览器侧设置自定义 User-Agent 头，会触发 CORS 预检且 163 不放行；
    // 由代理服务器统一附加请求头
    const netEaseUrl = `https://music.163.com/api/search/get/web?type=1&s=${encodeURIComponent(query)}&limit=1`
    const response = await fetch(proxied(netEaseUrl))

    const data = await response.json()
    const song = data.result?.songs?.[0]

    if (song) {
      return await fetchNetEaseLyrics(song.id)
    }
  } catch {
  }

  return []
}

async function fetchNetEaseLyrics(songId: number): Promise<LyricLine[]> {
  try {
    const url = `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`
    const response = await fetch(proxied(url))

    const data = await response.json()

    if (data.lrc?.lyric) {
      return parseLRC(data.lrc.lyric)
    }

    if (data.tlyric?.lyric) {
      return parseLRC(data.tlyric.lyric)
    }
  } catch {
  }

  return []
}

// 检测文本是否包含中文字符
export function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)
}

export async function translateText(text: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''
  // 如果已经是中文，无需翻译
  if (containsChinese(trimmed)) {
    return trimmed
  }

  try {
    // 调用本地代理服务器的 /translate 端点（经 Vite /api 代理转发到 3001）
    // 服务端多源 fallback（MyMemory 主 + 百度备），规避浏览器 CORS + 翻译源限流
    const url = `/api/translate?text=${encodeURIComponent(trimmed)}&from=auto&to=zh`
    const response = await fetch(url)
    const data = await response.json()
    return (data?.translation as string) || ''
  } catch {
  }

  // 翻译失败时返回空字符串，避免显示原文造成"翻译=原文"的误导
  return ''
}

export async function translateLyrics(lyrics: LyricLine[]): Promise<LyricLine[]> {
  if (lyrics.length === 0) return lyrics

  // 如果大部分歌词已经是中文，则无需翻译
  const chineseCount = lyrics.filter(l => containsChinese(l.text)).length
  if (chineseCount > lyrics.length / 2) {
    return lyrics
  }

  // 收集所有需要翻译的句子（非空且非中文）及其索引
  const toTranslate: { idx: number; text: string }[] = []
  lyrics.forEach((l, idx) => {
    const t = l.text.trim()
    if (t && !containsChinese(t)) {
      toTranslate.push({ idx, text: t })
    }
  })

  if (toTranslate.length === 0) {
    return lyrics
  }

  const result: LyricLine[] = lyrics.map(l => ({ ...l }))
  const texts = toTranslate.map(item => item.text)

  // 译文有效性判断：非空且不等于原文（避免显示"翻译=原文"的误导）
  const validTranslation = (original: string, translated: string): string => {
    const t = (translated || '').trim()
    if (!t) return ''
    if (t === original.trim()) return ''
    return translated
  }

  // 逐句 fallback：并发调用单句翻译端点，同样做有效性过滤
  const fallbackSingle = async () => {
    await Promise.all(
      toTranslate.map(async (item) => {
        result[item.idx].translation = validTranslation(item.text, await translateText(item.text))
      })
    )
  }

  try {
    // 一次批量请求翻译全部歌词（服务端腾讯翻译君，整首歌通常 1-2 秒完成）
    // 走 Vite /api 代理转发到 3001 的 /translate-batch 端点
    const response = await fetch('/api/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, from: 'en', to: 'zh' }),
    })
    const data = await response.json()
    const translations: string[] = Array.isArray(data?.translations) ? data.translations : []

    // 填回译文（translations 与 texts 等长，做有效性过滤）
    toTranslate.forEach((item, i) => {
      result[item.idx].translation = validTranslation(item.text, translations[i] || '')
    })

    // 若批量结果全部无效（说明批量源整体失败），降级到逐句 fallback
    const anyOk = toTranslate.some((item, i) => validTranslation(item.text, translations[i] || ''))
    if (!anyOk) {
      await fallbackSingle()
    }
  } catch {
    // 批量请求本身异常（网络/代理），降级到逐句 fallback
    await fallbackSingle()
  }

  return result
}

export function findCurrentLyric(lyrics: LyricLine[], currentTime: number): number {
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      return i
    }
  }
  return -1
}
