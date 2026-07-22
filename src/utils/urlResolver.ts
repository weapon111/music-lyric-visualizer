export async function resolveAudioUrl(shareUrl: string): Promise<string> {
  if (isDirectAudioUrl(shareUrl)) {
    return shareUrl
  }

  if (shareUrl.includes('douyin.com') || shareUrl.includes('iesdouyin.com')) {
    return await resolveDouyinUrl(shareUrl)
  }

  if (shareUrl.includes('kuwo.cn')) {
    return await resolveKuwoUrl(shareUrl)
  }

  if (shareUrl.includes('kugou.com')) {
    return await resolveKugouUrl(shareUrl)
  }

  return shareUrl
}

function isDirectAudioUrl(url: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a']
  return audioExtensions.some(ext => url.toLowerCase().includes(ext))
}

async function resolveDouyinUrl(url: string): Promise<string> {
  try {
    const response = await fetch(`/api/resolve-douyin?url=${encodeURIComponent(url)}`)
    const data = await response.json()
    
    if (data.success && data.audioUrl) {
      return data.audioUrl
    }
  } catch (error) {
    console.error('Douyin URL resolve error:', error)
  }

  return url
}

async function resolveKuwoUrl(url: string): Promise<string> {
  try {
    const response = await fetchWithProxy(url)
    const html = await response.text()

    const match = html.match(/play_url.*?"([^"]+\.mp3)"/)
    if (match) return match[1]
  } catch {
  }
  return url
}

async function resolveKugouUrl(url: string): Promise<string> {
  try {
    const response = await fetchWithProxy(url)
    const html = await response.text()

    const match = html.match(/play_url.*?"([^"]+\.mp3)"/)
    if (match) return match[1]
  } catch {
  }
  return url
}

async function fetchWithProxy(url: string): Promise<Response> {
  return fetch(`/api?url=${encodeURIComponent(url)}`)
}
