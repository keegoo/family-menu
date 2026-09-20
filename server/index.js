import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ZipArchive } from 'archiver'
import db, { DATA_DIR, queries, transaction } from './db.js'
import { createApp, del, get, json, listen, post, put } from './web.js'

const PORT = process.env.PORT || 3000

get('/api/health', (req, res) => ({ status: 'ok', time: new Date().toISOString() }))

get('/api/dishes', (req, res) => queries.dishList.all())

get('/api/dishes/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return json(res, 400, { error: 'Dish not found' })
  }
  const dish = queries.dishDetail.get(id)
  if (!dish) return json(res, 404, { error: 'Dish not found' })
  return {
    ...dish,
    images: queries.dishImages.all(id),
    ingredients: queries.dishIngredients.all(id),
    seasonings: queries.dishSeasonings.all(id)
  }
})

get('/api/categories', (req, res) => queries.categoryList.all())

get('/api/cart', (req, res) => {
  const items = queries.cartList.all()
  return { items, count: items.length }
})

post('/api/cart/items', (req, res) => {
  const dishId = Number(req.body?.dishId)
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return json(res, 400, { error: 'dishId is required' })
  }
  if (!queries.dishExists.get(dishId)) {
    return json(res, 404, { error: 'Dish not found' })
  }
  queries.addCartItem.run(dishId)
  return queries.cartItem.get(dishId)
})

del('/api/cart/items/:dishId', (req, res) => {
  const dishId = Number(req.params.dishId)
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return json(res, 400, { error: 'dishId is required' })
  }
  if (!queries.cartItem.get(dishId)) {
    return json(res, 404, { error: 'Dish not in selection' })
  }
  queries.deleteCartItem.run(dishId)
  return { removed: dishId }
})

put('/api/cart', (req, res) => {
  const dishIds = req.body?.dishIds
  if (!Array.isArray(dishIds) || dishIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return json(res, 400, { error: 'dishIds must be an array of dish ids' })
  }
  transaction(() => {
    queries.clearCart.run()
    for (const id of new Set(dishIds)) queries.insertCartItem.run(id)
  })
  return { count: dishIds.length }
})

post('/api/cart/confirm', (req, res) => {
  const confirmedAt = (typeof req.body?.dateTime === 'string' && req.body.dateTime
    ? req.body.dateTime
    : new Date().toISOString())

  const items = queries.cartList.all()
  if (items.length === 0) {
    return json(res, 400, { error: 'Cart is empty' })
  }
  transaction(() => {
    for (const item of items) queries.upsertOrderStat.run(item.dish_id, confirmedAt)
    queries.clearCart.run()
  })
  return { confirmed: items.map(item => item.dish_id), confirmedAt }
})

get('/api/stats', (req, res) => {
  return {
    dishes: queries.statsList.all(),
    total_orders: queries.totalOrders.get().total_orders
  }
})

get('/api/backup', (req, res) => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '')
  const snapshot = path.join(os.tmpdir(), `family-menu-${stamp}-${process.pid}.db`)
  const uploadsDir = path.join(DATA_DIR, 'uploads')

  try {
    db.exec(`VACUUM INTO '${snapshot}'`)
  } catch (err) {
    console.error(err)
    return json(res, 500, { error: 'Backup failed' })
  }

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="family-menu-backup-${stamp}.zip"`)

  const archive = new ZipArchive()
  archive.on('warning', err => console.warn(err))
  archive.on('error', err => {
    console.error(err)
    res.destroy(err)
  })
  res.on('close', () => fs.rm(snapshot, { force: true }, () => { }))

  archive.pipe(res)
  archive.file(snapshot, { name: 'family-menu.db' })
  if (fs.existsSync(uploadsDir)) archive.directory(uploadsDir, 'uploads')
  archive.finalize()
  // Streaming response — return nothing so the framework skips its JSON step
  return
})

const app = createApp({
  staticDir: path.join(import.meta.dirname, 'public')
})

listen(app, PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
