import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp, get, json, listen, post } from './web.js'

// web.js keeps a module-level ROUTES array, so all test routes are registered
// here once and shared by the single app under test.
const staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-test-'))
fs.writeFileSync(path.join(staticDir, 'index.html'), '<h1>hello</h1>')
fs.writeFileSync(path.join(staticDir, 'data.json'), '{"x":1}')

get('/api/hello', (req, res) => ({ msg: 'world' }))
get('/api/echo/:name', (req, res) => ({ name: req.params.name, query: req.query }))
post('/api/echo', (req, res) => req.body)
get('/api/fail', (req, res) => json(res, 400, { error: 'bad request' }))
get('/api/stream', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('streamed')
})

const app = createApp({ staticDir })

let server
let base

before(async () => {
  server = listen(app, 0)
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

after(() => {
  server.close()
  fs.rmSync(staticDir, { recursive: true, force: true })
})

test('returns a handler value as JSON 200', async () => {
  const res = await fetch(`${base}/api/hello`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /application\/json/)
  assert.deepEqual(await res.json(), { msg: 'world' })
})

test('matches :param segments and decodes them', async () => {
  const res = await fetch(`${base}/api/echo/%E7%BA%A2%E7%83%A7%E8%82%89`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { name: '红烧肉', query: {} })
})

test('exposes query params on req.query', async () => {
  const res = await fetch(`${base}/api/echo/x?a=1&b=2`)
  assert.deepEqual(await res.json(), { name: 'x', query: { a: '1', b: '2' } })
})

test('parses JSON request bodies into req.body', async () => {
  const res = await fetch(`${base}/api/echo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dishId: 32 })
  })
  assert.deepEqual(await res.json(), { dishId: 32 })
})

test('explicit error statuses pass through', async () => {
  const res = await fetch(`${base}/api/fail`)
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: 'bad request' })
})

test('unknown /api path returns JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`)
  assert.equal(res.status, 404)
  assert.deepEqual(await res.json(), { error: 'Not found' })
})

test('method mismatch is a 404', async () => {
  const res = await fetch(`${base}/api/hello`, { method: 'POST' })
  assert.equal(res.status, 404)
})

test('serves static files with content types', async () => {
  const home = await fetch(`${base}/`)
  assert.equal(home.status, 200)
  assert.match(home.headers.get('content-type'), /text\/html/)
  assert.match(await home.text(), /hello/)

  const data = await fetch(`${base}/data.json`)
  assert.equal(data.status, 200)
  assert.match(data.headers.get('content-type'), /application\/json/)
})

test('unknown non-api path falls back to 404 text', async () => {
  const res = await fetch(`${base}/no-such-file`)
  assert.equal(res.status, 404)
  assert.equal(await res.text(), 'Not found')
})

test('a handler that ends the response directly is not double-sent', async () => {
  const res = await fetch(`${base}/api/stream`)
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'streamed')
})

test('invalid JSON body returns 400', async () => {
  const res = await fetch(`${base}/api/echo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json'
  })
  assert.equal(res.status, 400)
})
