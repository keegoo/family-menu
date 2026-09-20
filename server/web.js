import http from 'node:http'
import serveStatic from 'serve-static'

const ROUTES = []

function addRoute(method, pattern, handler) {
  const parts = pattern.split('/').filter(Boolean)

  ROUTES.push({ method, parts, handler })
}

export function get(pattern, handler) {
  addRoute('GET', pattern, handler)
}

export function post(pattern, handler) {
  addRoute('POST', pattern, handler)
}

export function put(pattern, handler) {
  addRoute('PUT', pattern, handler)
}

export function del(pattern, handler) {
  addRoute('DELETE', pattern, handler)
}

function matchRoute(method, pathname) {
  const requestParts = pathname.split('/').filter(Boolean)

  for (const route of ROUTES) {
    if (route.method !== method) continue
    if (route.parts.length !== requestParts.length) continue

    const params = {}
    let matched = true

    for (let i = 0; i < route.parts.length; i++) {
      const routePart = route.parts[i]
      const requestPart = requestParts[i]

      if (routePart.startsWith(':')) {
        params[routePart.slice(1)] = decodeURIComponent(requestPart)
      } else if (routePart !== requestPart) {
        matched = false
        break
      }
    }

    if (matched) {
      return {
        handler: route.handler,
        params
      }
    }
  }
  return null
}

async function parseBody(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return null
  }

  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const body = Buffer.concat(chunks).toString()

  if (!body) {
    return null
  }

  return JSON.parse(body)
}

export function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  })

  res.end(JSON.stringify(data))
}

function send(res, status, data) {
  res.writeHead(status)
  res.end(data)
}

export function createApp({ staticDir } = {}) {
  const staticServer = staticDir
    ? serveStatic(staticDir)
    : null

  return {
    async handle(req, res) {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

        req.params = {}
        req.query = Object.fromEntries(url.searchParams)
        req.body = await parseBody(req)

        const route = matchRoute(req.method, url.pathname)

        if (route) {
          req.params = route.params

          const result = await route.handler(req, res)

          if (res.writableEnded) {
            return
          }

          if (result !== undefined) {
            return json(res, 200, result)
          }

          return
        }

        if (staticServer && !url.pathname.startsWith('/api/')) {
          return staticServer(req, res, () => {
            send(res, 404, 'Not found')
          })
        }

        json(res, 404, {
          error: 'Not found'
        })
      } catch (error) {
        if (error instanceof SyntaxError) {
          return json(res, 400, { error: 'Invalid JSON body' })
        }

        console.error(error)

        if (res.headersSent) {
          res.end()
          return
        }

        json(res, 500, {
          error: 'Internal server error'
        })
      }
    }
  }
}

export function listen(app, port, callback) {
  const server = http.createServer((req, res) => {
    app.handle(req, res)
  })

  server.listen(port, callback)

  return server
}
