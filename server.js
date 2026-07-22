const http = require('http')
const https = require('https')
const url = require('url')

const PORT = 3001

const proxy = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const targetUrl = parsedUrl.query.url

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  const isHttps = targetUrl.startsWith('https://')
  const client = isHttps ? https : http

  const options = url.parse(targetUrl)
  options.method = req.method
  options.headers = {
    ...req.headers,
    'Host': options.host,
    'Origin': '',
    'Referer': '',
    'Access-Control-Allow-Origin': '*',
  }

  const proxyReq = client.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    })

    proxyRes.on('data', (chunk) => {
      res.write(chunk)
    })

    proxyRes.on('end', () => {
      res.end()
    })
  })

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Proxy request failed' }))
  })

  req.on('data', (chunk) => {
    proxyReq.write(chunk)
  })

  req.on('end', () => {
    proxyReq.end()
  })
})

proxy.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
})
