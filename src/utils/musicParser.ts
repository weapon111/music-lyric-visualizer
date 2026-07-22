export interface LyricLine {
  time: number
  text: string
  translation?: string
}

export interface SongInfo {
  id: string
  name: string
  artist: string
  platform: string
  cover?: string
  lyrics?: LyricLine[]
}

export async function parseMusicUrl(url: string): Promise<SongInfo | null> {
  if (url.includes('music.163.com')) {
    return await parseNetEaseMusicUrl(url)
  }

  if (url.includes('y.qq.com') || url.includes('qzone.qq.com')) {
    return await parseQQMusicUrl(url)
  }

  if (url.includes('kugou.com')) {
    return await parseKugouUrl(url)
  }

  if (url.includes('kuwo.cn')) {
    return await parseKuwoUrl(url)
  }

  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
    return await parseDouyinUrl(url)
  }

  if (url.includes('xiami.com')) {
    return await parseXiamiUrl(url)
  }

  if (url.includes('bilibili.com')) {
    return await parseBilibiliUrl(url)
  }

  return extractFromUrlPath(url)
}

async function parseNetEaseMusicUrl(url: string): Promise<SongInfo | null> {
  try {
    const match = url.match(/song\/(\d+)/)
    if (!match) return null

    const songId = match[1]
    const apiUrl = `https://music.163.com/api/song/detail/?ids=[${songId}]`
    
    const response = await fetchWithProxy(apiUrl)
    const data = await response.json()
    const song = data.songs?.[0]
    
    if (song) {
      const coverUrl = song.album?.picUrl || ''
      return {
        id: songId,
        name: song.name,
        artist: song.artists?.[0]?.name || '',
        platform: 'netease',
        cover: coverUrl,
      }
    }
  } catch {
  }

  return extractFromUrlPath(url, 'netease')
}

async function parseQQMusicUrl(url: string): Promise<SongInfo | null> {
  try {
    const match = url.match(/song\/(\d+)/)
    if (!match) return null

    const songId = match[1]
    const apiUrl = `https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid=${songId}&format=json`
    
    const response = await fetchWithProxy(apiUrl)
    const text = await response.text()
    const matchData = text.match(/\{.*\}/)
    if (!matchData) return null

    const data = JSON.parse(matchData[0])
    const song = data.data?.items?.[0]
    
    if (song) {
      const coverUrl = song.album?.mid ? `https://y.qq.com/music/photo_new/T002R300x300M000${song.album.mid}.jpg` : ''
      return {
        id: songId,
        name: song.name,
        artist: song.singer?.[0]?.name || '',
        platform: 'qqmusic',
        cover: coverUrl,
      }
    }
  } catch {
  }

  return extractFromUrlPath(url, 'qqmusic')
}

async function parseKugouUrl(url: string): Promise<SongInfo | null> {
  try {
    const response = await fetchWithProxy(url)
    const html = await response.text()
    
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
    const artistMatch = html.match(/歌手：<a[^>]*>([^<]+)<\/a>/)
    const coverMatch = html.match(/cover_img.*?"([^"]+)"/)

    if (nameMatch) {
      return {
        id: '',
        name: nameMatch[1].trim(),
        artist: artistMatch?.[1].trim() || '',
        platform: 'kugou',
        cover: coverMatch?.[1] || '',
      }
    }
  } catch {
  }

  return extractFromUrlPath(url, 'kugou')
}

async function parseKuwoUrl(url: string): Promise<SongInfo | null> {
  try {
    const response = await fetchWithProxy(url)
    const html = await response.text()
    
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
    const artistMatch = html.match(/歌手.*?<a[^>]*>([^<]+)<\/a>/)
    const coverMatch = html.match(/src="([^"]+album[^"]+)"/)

    if (nameMatch) {
      return {
        id: '',
        name: nameMatch[1].trim(),
        artist: artistMatch?.[1].trim() || '',
        platform: 'kuwo',
        cover: coverMatch?.[1] || '',
      }
    }
  } catch {
  }

  return extractFromUrlPath(url, 'kuwo')
}

async function parseDouyinUrl(url: string): Promise<SongInfo | null> {
  try {
    const response = await fetch(`/api/resolve-douyin?url=${encodeURIComponent(url)}`)
    const data = await response.json()

    if (data.success) {
      return {
        id: data.trackId || '',
        name: data.name || '抖音音乐',
        artist: data.artist || '',
        platform: 'douyin',
        cover: data.cover || '',
        lyrics: data.lyrics || [],
      }
    }
  } catch {
  }

  return extractFromUrlPath(url, 'douyin')
}

async function parseXiamiUrl(url: string): Promise<SongInfo | null> {
  return extractFromUrlPath(url, 'xiami')
}

async function parseBilibiliUrl(url: string): Promise<SongInfo | null> {
  try {
    const match = url.match(/video\/(\w+)/)
    if (!match) return null

    const videoId = match[1]
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`
    
    const response = await fetchWithProxy(apiUrl)
    const data = await response.json()
    
    if (data.data) {
      return {
        id: videoId,
        name: data.data.title,
        artist: data.data.owner?.name || '',
        platform: 'bilibili',
      }
    }
  } catch {
  }

  return extractFromUrlPath(url, 'bilibili')
}

function extractFromUrlPath(url: string, platform: string = 'unknown'): SongInfo | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    
    if (pathParts.length === 0) return null

    const lastPart = decodeURIComponent(pathParts[pathParts.length - 1])
    const cleanName = lastPart.replace(/\.[^/.]+$/, '').replace(/-/g, ' ').trim()

    if (!cleanName) return null

    return {
      id: '',
      name: cleanName,
      artist: '',
      platform,
    }
  } catch {
    return null
  }
}

async function fetchWithProxy(url: string): Promise<Response> {
  return fetch(`/api?url=${encodeURIComponent(url)}`)
}
