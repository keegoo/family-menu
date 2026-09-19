import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { ZipArchive } from 'archiver'
import db, { DATA_DIR, queries, transaction } from './db.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Serves the built client (including dish images) from server/public in production
app.use(express.static(path.join(import.meta.dirname, 'public')))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/dishes', (req, res) => {
  res.json(queries.dishList.all())
})

app.get('/api/dishes/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Dish not found' })
  }
  const dish = queries.dishDetail.get(id)
  if (!dish) return res.status(404).json({ error: 'Dish not found' })
  res.json({
    ...dish,
    images: queries.dishImages.all(id),
    ingredients: queries.dishIngredients.all(id),
    seasonings: queries.dishSeasonings.all(id)
  })
})

app.get('/api/categories', (req, res) => {
  res.json(queries.categoryList.all())
})

app.get('/api/cart', (req, res) => {
  const items = queries.cartList.all()
  res.json({ items, count: items.length })
})

app.post('/api/cart/items', (req, res) => {
  const dishId = Number(req.body?.dishId)
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: 'dishId is required' })
  }
  if (!queries.dishExists.get(dishId)) {
    return res.status(404).json({ error: 'Dish not found' })
  }
  queries.addCartItem.run(dishId)
  res.json(queries.cartItem.get(dishId))
})

app.delete('/api/cart/items/:dishId', (req, res) => {
  const dishId = Number(req.params.dishId)
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: 'dishId is required' })
  }
  if (!queries.cartItem.get(dishId)) {
    return res.status(404).json({ error: 'Dish not in selection' })
  }
  queries.deleteCartItem.run(dishId)
  res.json({ removed: dishId })
})

app.put('/api/cart', (req, res) => {
  const dishIds = req.body?.dishIds
  if (!Array.isArray(dishIds) || dishIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ error: 'dishIds must be an array of dish ids' })
  }
  transaction(() => {
    queries.clearCart.run()
    for (const id of new Set(dishIds)) queries.insertCartItem.run(id)
  })
  res.json({ count: dishIds.length })
})

app.post('/api/cart/confirm', (req, res) => {
  const confirmedAt = (typeof req.body?.dateTime === 'string' && req.body.dateTime
    ? req.body.dateTime
    : new Date().toISOString())

  const items = queries.cartList.all()
  if (items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' })
  }
  transaction(() => {
    for (const item of items) queries.upsertOrderStat.run(item.dish_id, confirmedAt)
    queries.clearCart.run()
  })
  res.json({ confirmed: items.map(item => item.dish_id), confirmedAt })
})

app.get('/api/stats', (req, res) => {
  res.json({
    dishes: queries.statsList.all(),
    total_orders: queries.totalOrders.get().total_orders
  })
})

app.get('/api/backup', async (req, res) => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '')
  const snapshot = path.join(os.tmpdir(), `family-menu-${stamp}-${process.pid}.db`)
  const uploadsDir = path.join(DATA_DIR, 'uploads')

  try {
    db.exec(`VACUUM INTO '${snapshot}'`)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Backup failed' })
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
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
