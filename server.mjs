import http from 'http'
import https from 'https'
import crypto from 'crypto'
import { URL } from 'url'

const PORT = 3001

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.douyin.com/',
}

function fetchWithRedirects(url, maxRedirects = 5, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const fetchUrl = (currentUrl, redirectsLeft) => {
      const target = new URL(currentUrl)
      const isHttps = target.protocol === 'https:'
      const client = isHttps ? https : http

      const options = {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: target.pathname + target.search + target.hash,
        method: 'GET',
        headers: { ...COMMON_HEADERS, ...customHeaders },
        maxRedirects: 0,
      }

      const req = client.request(options, (res) => {
        const statusCode = res.statusCode || 0

        if (statusCode >= 300 && statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          const newUrl = new URL(res.headers.location, currentUrl).href
          fetchUrl(newUrl, redirectsLeft - 1)
        } else {
          let data = []
          res.on('data', (chunk) => data.push(chunk))
          res.on('end', () => {
            resolve({
              statusCode,
              headers: res.headers,
              body: Buffer.concat(data).toString('utf-8'),
            })
          })
        }
      })

      req.on('error', reject)
      req.end()
    }

    fetchUrl(url, maxRedirects)
  })
}

async function resolveDouyinUrl(url) {
  try {
    const response = await fetchWithRedirects(url)
    const text = response.body

    const routerDataMatch = text.match(/_ROUTER_DATA\s*=\s*(\{[\s\S]*?\});/)
    if (routerDataMatch) {
      try {
        const routerData = JSON.parse(routerDataMatch[1])
        const trackPage = routerData?.loaderData?.track_page

        if (trackPage) {
          const audioData = trackPage.audioWithLyricsOption

          if (audioData) {
            let name = audioData.trackName || audioData.title || audioData.name || '抖音音乐'
            const artist = audioData.artistName || audioData.artist || audioData.singer || ''
            const cover = audioData.coverURL || audioData.cover_url || audioData.cover || ''

            if (name && name.includes('《')) {
              const match = name.match(/《([^》]+)》/)
              if (match) name = match[1]
            }

            // 从抖音页面数据中提取歌词（sentences 格式，带毫秒级时间戳）
            let lyrics = []
            if (audioData.lyrics && audioData.lyrics.sentences) {
              lyrics = audioData.lyrics.sentences.map(s => ({
                time: (s.startMs || 0) / 1000,
                text: s.text || '',
              })).filter(l => l.text)
            }

            return {
              success: true,
              audioUrl: audioData.url || '',
              name,
              artist,
              cover,
              lyrics,
              trackId: trackPage.track_id || audioData.track_id || '',
            }
          }
        }
      } catch (e) {
        console.error('Parse ROUTER_DATA error:', e)
      }
    }

    const ldJsonMatch = text.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/)
    if (ldJsonMatch) {
      try {
        const ldJson = JSON.parse(ldJsonMatch[1])
        return {
          success: true,
          name: ldJson.title || '抖音音乐',
          artist: ldJson.author?.name || '',
          cover: ldJson.images?.[0] || '',
        }
      } catch {
      }
    }
  } catch (error) {
    console.error('Douyin URL resolve error:', error)
  }

  return { success: false, error: 'Failed to resolve URL' }
}

// ===== 百度翻译（服务端实现：规避浏览器 CORS + sign 逆向 + Cookie 管理）=====

// 通用 POST 请求（application/x-www-form-urlencoded），返回 { statusCode, headers, body }
function postForm(targetUrl, formData, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl)
    const isHttps = target.protocol === 'https:'
    const client = isHttps ? https : http
    const body = typeof formData === 'string' ? formData : new URLSearchParams(formData).toString()

    const options = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search + target.hash,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
        ...COMMON_HEADERS,
        ...extraHeaders,
      },
    }

    const proxyReq = client.request(options, (proxyRes) => {
      const chunks = []
      proxyRes.on('data', (chunk) => chunks.push(chunk))
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode || 0,
          headers: proxyRes.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      })
    })

    proxyReq.on('error', reject)
    proxyReq.write(body)
    proxyReq.end()
  })
}

// 百度翻译 sign 算法（公开逆向实现：gtk 拆分为 m/s，用固定变换串 F/D 做位运算）
function baiduSign(query, gtk) {
  // 位运算函数 n：o 为固定变换字符串（F 或 D），非 gtk
  function n(r, o) {
    for (var t = 0; t < o.length - 2; t += 3) {
      var a = o.charAt(t + 2)
      a = a >= 'a' ? a.charCodeAt(0) - 87 : Number(a)
      a = '+' === o.charAt(t + 1) ? r >>> a : r << a
      r = '+' === o.charAt(t) ? (r + a & 4294967295) : r ^ a
    }
    return r
  }

  var text = query
  // 长文本截断：超过 30 字符取首 10 + 中间 10 + 尾 10
  var o = text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)
  if (null === o) {
    var t = text.length
    if (t > 30) {
      text = '' + text.substr(0, 10) + text.substr(Math.floor(t / 2) - 5, 10) + text.substr(-10, 10)
    }
  } else {
    var parts = text.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)
    var f = []
    for (var C = 0, h = parts.length; C < h; C++) {
      if ('' !== parts[C]) {
        for (var k = 0; k < parts[C].length; k++) f.push(parts[C][k])
      }
      if (C !== h - 1) f.push(o[C])
    }
    var g = f.length
    if (g > 30) {
      text = f.slice(0, 10).join('') + f.slice(Math.floor(g / 2) - 5, Math.floor(g / 2) + 5).join('') + f.slice(-10).join('')
    }
  }

  // gtk 拆分为 m（前段）和 s（后段）
  var d = gtk.split('.')
  var m = Number(d[0]) || 0
  var s = Number(d[1]) || 0

  // UTF-8 编码
  var S = [], c = 0
  for (var v = 0; v < text.length; v++) {
    var A = text.charCodeAt(v)
    if (128 > A) {
      S[c++] = A
    } else {
      if (2048 > A) {
        S[c++] = A >> 6 | 192
      } else {
        if (55296 === (64512 & A) && v + 1 < text.length && 56320 === (64512 & text.charCodeAt(v + 1))) {
          A = 65536 + ((1023 & A) << 10) + (1023 & text.charCodeAt(++v))
          S[c++] = A >> 18 | 240
          S[c++] = A >> 12 & 63 | 128
        } else {
          S[c++] = A >> 12 | 224
        }
        S[c++] = A >> 6 & 63 | 128
      }
      S[c++] = 63 & A | 128
    }
  }

  // 核心运算：初始 p = m，每字节累加后用 F 变换，最后用 D 变换，异或 s，取模
  var p = m
  var F = '+-a^+6'
  var D = '+-3^+b+-f'
  for (var b = 0; b < S.length; b++) {
    p += S[b]
    p = n(p, F)
  }
  p = n(p, D)
  p ^= s
  if (0 > p) {
    p = (2147483647 & p) + 2147483648
  }
  p %= 1e6
  return p.toString() + '.' + (p ^ m)
}

// Cookie + gtk 缓存（百度 v2transapi 需要 BAIDUID cookie 和 gtk 用于 sign）
let baiduTokenCache = { cookie: '', gtk: '', expireAt: 0 }

async function ensureBaiduToken() {
  const now = Date.now()
  if (baiduTokenCache.expireAt > now && baiduTokenCache.gtk && baiduTokenCache.cookie) {
    return baiduTokenCache
  }

  const resp = await fetchWithRedirects('https://fanyi.baidu.com/')
  const setCookies = resp.headers['set-cookie']
  const cookieList = Array.isArray(setCookies) ? setCookies : (setCookies ? [setCookies] : [])
  const cookie = cookieList.map((c) => c.split(';')[0]).join('; ')

  let gtk = ''
  const m = resp.body.match(/window\.gtk\s*=\s*['"]([^'"]+)['"]/)
  if (m) gtk = m[1]
  // 首页为 SPA 时 gtk 不在 HTML 中，使用百度翻译固定种子（逆向通用值，长期不变）
  if (!gtk) gtk = '320305.131321201'

  baiduTokenCache = { cookie, gtk, expireAt: now + 3600 * 1000 }
  console.log('Baidu token refreshed: gtk=' + gtk + ' cookieLen=' + cookie.length)
  return baiduTokenCache
}

// 百度翻译：返回译文字符串，失败返回空字符串
async function translateBaidu(query, from = 'en', to = 'zh') {
  try {
    const { cookie, gtk } = await ensureBaiduToken()
    if (!gtk || !cookie) {
      return ''
    }

    const sign = baiduSign(query, gtk)
    const url = 'https://fanyi.baidu.com/v2transapi'
    const formData = {
      from,
      to,
      query,
      transtype: 'translang',
      simple_means_flag: '3',
      sign,
      token: '',
      domain: 'common',
    }

    const resp = await postForm(url, formData, {
      Cookie: cookie,
      Referer: 'https://fanyi.baidu.com/',
    })

    if (resp.statusCode !== 200) {
      return ''
    }

    const data = JSON.parse(resp.body)
    const result = data?.trans_result?.data?.[0]?.dst
    return result || ''
  } catch (e) {
    return ''
  }
}

// 百度翻译官方 API（最稳定）：需配置环境变量 BAIDU_APPID + BAIDU_SECRETKEY
// 免费 5 万字/月，sign = md5(appid + query + salt + secretKey)，无需复杂逆向
// 申请地址：https://fanyi-api.baidu.com/ （注册后在"开发者信息"获取 APP ID 和密钥）
async function translateBaiduOfficial(query, from = 'en', to = 'zh') {
  const appid = process.env.BAIDU_APPID
  const secretKey = process.env.BAIDU_SECRETKEY
  if (!appid || !secretKey) {
    return '' // 未配置，跳过
  }

  try {
    const salt = Date.now().toString()
    const sign = crypto.createHash('md5').update(appid + query + salt + secretKey).digest('hex')
    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(query)}&from=${from}&to=${to}&appid=${appid}&salt=${salt}&sign=${sign}`
    const resp = await fetchWithRedirects(url, 5, { Referer: 'https://fanyi.baidu.com/' })

    if (resp.statusCode !== 200) {
      return ''
    }

    const data = JSON.parse(resp.body)
    // 官方 API 返回 { trans_result: [{ src, dst }], from, to } 或 { error_code, error_msg }
    if (data.error_code) {
      console.error('Baidu official error:', data.error_code, data.error_msg)
      return ''
    }
    const result = data?.trans_result?.[0]?.dst
    return result || ''
  } catch (e) {
    return ''
  }
}

// MyMemory 翻译：服务端请求（用通用 Referer 覆盖 douyin Referer，避免被误判 403）
async function translateMyMemory(query, from = 'Autodetect', to = 'zh-CN') {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${from}|${to}`
    const resp = await fetchWithRedirects(url, 5, { Referer: 'https://mymemory.translated.net/' })

    if (resp.statusCode !== 200) {
      return ''
    }

    const data = JSON.parse(resp.body)
    const translatedText = data?.responseData?.translatedText || ''
    const status = data?.responseStatus ?? 0
    const isWarning = /MYMEMORY WARNING|QUOTA|INVALID LANGUAGE/i.test(translatedText)

    if (status === 200 && translatedText && !isWarning) {
      return translatedText
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    }
    return ''
  } catch (e) {
    return ''
  }
}

// 通用 JSON POST 请求（application/json），返回 { statusCode, headers, body }
function postJson(targetUrl, jsonBody, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl)
    const isHttps = target.protocol === 'https:'
    const client = isHttps ? https : http
    const body = typeof jsonBody === 'string' ? jsonBody : JSON.stringify(jsonBody)

    const options = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search + target.hash,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
        ...COMMON_HEADERS,
        ...extraHeaders,
      },
    }

    const proxyReq = client.request(options, (proxyRes) => {
      const chunks = []
      proxyRes.on('data', (chunk) => chunks.push(chunk))
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode || 0,
          headers: proxyRes.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      })
    })

    proxyReq.on('error', reject)
    proxyReq.write(body)
    proxyReq.end()
  })
}

// 腾讯翻译君 TranSmart：免费免key、国内可访问、支持批量（text_list 一次翻译多句）
// 接口：POST https://transmart.qq.com/api/imt
// 返回 { auto_translation: ["译1", "译2", ...] }，与输入数组等长
// 主源：批量翻译歌词首选，单次请求即可翻译整首歌，速度极快（50 句约 1-2 秒）
async function translateTencentBatch(texts, from = 'en', to = 'zh') {
  try {
    const payload = {
      header: {
        fn: 'auto_translation',
        session: '',
        client_key: 'browser-edge-chromium-100-Windows_10-undefined',
        user: '',
      },
      type: 'plain',
      model_category: 'normal',
      text_domain: 'general',
      source: { lang: from, text_list: texts },
      target: { lang: to },
    }

    const resp = await postJson('https://transmart.qq.com/api/imt', payload, {
      Referer: 'https://transmart.qq.com/',
      Origin: 'https://transmart.qq.com',
    })

    if (resp.statusCode !== 200) {
      console.error('Tencent batch HTTP error:', resp.statusCode)
      return []
    }

    const data = JSON.parse(resp.body)
    if (data?.header?.ret_code !== 'succ') {
      console.error('Tencent batch ret_code:', data?.header?.ret_code, data?.header?.message || '')
      return []
    }

    const result = data?.auto_translation
    if (!Array.isArray(result) || result.length !== texts.length) {
      console.error('Tencent batch length mismatch:', Array.isArray(result) ? result.length : 'not array', 'expected', texts.length)
      return []
    }

    return result.map((t) => (t == null ? '' : String(t)))
  } catch (e) {
    console.error('Tencent batch exception:', e.message)
    return []
  }
}

// 单句翻译：多源 fallback（百度官方 API → MyMemory → 百度网页版）
// 腾讯翻译君批量失败时，逐句兜底
async function translateSingleWithFallback(text, from = 'en', to = 'zh') {
  // 源1: 百度官方 API（需配置 BAIDU_APPID + BAIDU_SECRETKEY，最稳定）
  let translation = await translateBaiduOfficial(text, from, to)

  // 源2: MyMemory（免费免key，语言映射）
  if (!translation) {
    const mmFrom = from === 'auto' || from === 'zh' ? 'Autodetect' : from
    const mmTo = to === 'zh' ? 'zh-CN' : to
    translation = await translateMyMemory(text, mmFrom, mmTo)
  }

  // 源3: 百度网页版（保底，当前因 Acs-Token 限制可能失败）
  if (!translation) {
    const bdFrom = from === 'Autodetect' ? 'auto' : from
    translation = await translateBaidu(text, bdFrom, to)
  }

  return translation || ''
}

// 单句翻译端点处理：多源 fallback
async function handleTranslate(parsedUrl, res) {
  const text = parsedUrl.searchParams.get('text') || ''
  const from = parsedUrl.searchParams.get('from') || 'en'
  const to = parsedUrl.searchParams.get('to') || 'zh'

  if (!text.trim()) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ translation: '' }))
    return
  }

  const translation = await translateSingleWithFallback(text, from, to)

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify({ translation }))
}

// 批量翻译端点处理：腾讯翻译君为主源（一次请求全部），失败逐句 fallback
// 请求体: { texts: string[], from?: string, to?: string }
// 响应体: { translations: string[] }  —— 与输入等长，失败项为空字符串
async function handleTranslateBatch(req, res) {
  // 读取 POST body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks).toString('utf-8')

  let texts = []
  let from = 'en'
  let to = 'zh'
  try {
    const parsed = JSON.parse(rawBody)
    if (Array.isArray(parsed?.texts)) {
      texts = parsed.texts.map((t) => String(t ?? ''))
      if (parsed.from) from = parsed.from
      if (parsed.to) to = parsed.to
    }
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ error: 'Invalid JSON body', message: e.message }))
    return
  }

  if (texts.length === 0) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ translations: [] }))
    return
  }

  // 主源：腾讯翻译君批量翻译（一次请求全部，速度极快）
  let translations = await translateTencentBatch(texts, from, to)

  // 兜底：对腾讯失败的句子（空字符串）逐句调多源 fallback
  if (translations.length === 0) {
    // 腾讯整体失败，全部走逐句 fallback
    translations = await Promise.all(
      texts.map((text) => (text.trim() ? translateSingleWithFallback(text, from, to) : Promise.resolve('')))
    )
  } else {
    // 腾讯部分失败，只补失败的句子
    translations = await Promise.all(
      translations.map((t, i) => {
        if (t && t.trim()) return Promise.resolve(t)
        const text = texts[i]
        if (!text || !text.trim()) return Promise.resolve('')
        return translateSingleWithFallback(text, from, to)
      })
    )
  }

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify({ translations }))
}

// 流式代理：支持二进制数据和 Range 请求（音频播放/跳转所需）
function streamProxy(targetUrl, req, res) {
  const target = new URL(targetUrl)
  const isHttps = target.protocol === 'https:'
  const client = isHttps ? https : http

  // 透传 Range 请求头，支持音频跳转
  const forwardHeaders = { ...COMMON_HEADERS }
  if (req.headers.range) {
    forwardHeaders.Range = req.headers.range
  }

  const options = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: target.pathname + target.search + target.hash,
    method: 'GET',
    headers: forwardHeaders,
  }

  const proxyReq = client.request(options, (proxyRes) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    }

    // 透传上游响应头（content-type, content-length, content-range, accept-ranges 等）
    const responseHeaders = { ...proxyRes.headers, ...corsHeaders }
    res.writeHead(proxyRes.statusCode || 200, responseHeaders)

    // 直接 pipe 二进制流，不做字符串转换
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (error) => {
    console.error('Stream proxy error:', error)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: 'Upstream request failed', message: error.message }))
    }
  })

  proxyReq.end()
}

const proxy = http.createServer(async (req, res) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    })
    res.end()
    return
  }

  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
    const pathname = parsedUrl.pathname

    // 抖音链接解析端点（返回 JSON）
    if (pathname === '/resolve-douyin') {
      const shareUrl = parsedUrl.searchParams.get('url')

      if (!shareUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ error: 'Missing url parameter' }))
        return
      }

      const result = await resolveDouyinUrl(shareUrl)

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      })
      res.end(JSON.stringify(result))
      return
    }

    // 翻译端点（服务端多源 fallback：百度官方 → MyMemory → 百度网页版）
    if (pathname === '/translate') {
      await handleTranslate(parsedUrl, res)
      return
    }

    // 批量翻译端点（腾讯翻译君为主源，一次请求翻译全部歌词）
    if (pathname === '/translate-batch') {
      await handleTranslateBatch(req, res)
      return
    }

    // 通用流式代理端点（支持音频二进制流 + Range 请求）
    const targetUrl = parsedUrl.searchParams.get('url')

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: 'Missing url parameter' }))
      return
    }

    streamProxy(targetUrl, req, res)
  } catch (error) {
    console.error('Proxy error:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: 'Proxy request failed', message: error.message }))
    }
  }
})

proxy.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
})
