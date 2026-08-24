import express from 'express'
import db from './db.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

const dishListQuery = db.prepare(`
  SELECT
    dishes.id,
    dishes.name,
    dishes.description,
    dishes.category_id,
    categories.name AS category,
    (
      SELECT path FROM dish_images
      WHERE dish_id = dishes.id
      ORDER BY dish_images.sort
      LIMIT 1
    ) AS cover
  FROM dishes
  JOIN categories ON dishes.category_id = categories.id
  ORDER BY categories.sort, dishes.name
`)

const dishDetailQuery = db.prepare(`
  SELECT
    dishes.id,
    dishes.name,
    dishes.description,
    dishes.category_id,
    categories.name AS category
  FROM dishes
  JOIN categories ON dishes.category_id = categories.id
  WHERE dishes.id = ?
`)

const dishImagesQuery = db.prepare(
  'SELECT id, path FROM dish_images where dish_id = ? ORDER BY sort, id'
)

const dishIngredientsQuery = db.prepare(
  'SELECT id, name, amount FROM ingredients WHERE dish_id = ? ORDER BY sort, id'
)

const dishSeasoningsQuery = db.prepare(
  'SELECT id, name, amount FROM seasonings WHERE dish_id = ? ORDER BY sort, id'
)

const categoryListQuery = db.prepare('SELECT id, name FROM categories ORDER BY sort, id')

const cartListQuery = db.prepare(`
  SELECT
    cart_items.id,
    cart_items.dish_id,
    dishes.name,
    categories.name AS category,
    (
      SELECT path FROM dish_images
      WHERE dish_id = dishes.id
      ORDER BY dish_images.sort
      LIMIT 1
    ) AS cover
  FROM cart_items
  JOIN dishes ON cart_items.dish_id = dishes.id
  JOIN categories ON dishes.category_id = categories.id
  ORDER BY cart_items.created_at, cart_items.id
`)

const dishExistsQuery = db.prepare('SELECT id FROM dishes WHERE id = ?')

const addCartItemQuery = db.prepare(`
  INSERT INTO cart_items (dish_id) VALUES (?)
  ON CONFLICT(dish_id) DO NOTHING
`)

const cartItemQuery = db.prepare('SELECT id, dish_id FROM cart_items WHERE dish_id = ?')

const deleteCartItemQuery = db.prepare('DELETE FROM cart_items WHERE dish_id = ?')

const clearCartQuery = db.prepare('DELETE FROM cart_items')

const upsertOrderStatQuery = db.prepare(`
  INSERT INTO order_stats (dish_id, count, last_ordered_at) VALUES (?, 1, ?)
  ON CONFLICT(dish_id)
  DO UPDATE SET
    count = count + 1,
    last_ordered_at = excluded.last_ordered_at
`)

const insertCartItemQuery = db.prepare('INSERT INTO cart_items (dish_id) VALUES (?)')

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/dishes', (req, res) => {
  res.json(dishListQuery.all())
})

app.get('/api/dishes/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Dish not found' })
  }
  const dish = dishDetailQuery.get(id)
  if (!dish) return res.status(404).json({ error: 'Dish not found' })
  res.json({
    ...dish,
    images: dishImagesQuery.all(id),
    ingredients: dishIngredientsQuery.all(id),
    seasonings: dishSeasoningsQuery.all(id)
  })
})

app.get('/api/categories', (req, res) => {
  res.json(categoryListQuery.all())
})

app.get('/api/cart', (req, res) => {
  const items = cartListQuery.all()
  res.json({ items, count: items.length })
})

app.post('/api/cart/items', (req, res) => {
  const dishId = Number(req.body?.dishId)
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: 'dishId is required' })
  }
  if (!dishExistsQuery.get(dishId)) {
    return res.status(404).json({ error: 'Dish not found' })
  }
  addCartItemQuery.run(dishId)
  res.json(cartItemQuery.get(dishId))
})

app.delete('/api/cart/items/:dishId', (req, res) => {
  const dishId = Number(req.params.dishId)
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: 'dishId is required' })
  }
  if (!cartItemQuery.get(dishId)) {
    return res.status(404).json({ error: 'Dish not in selection' })
  }
  deleteCartItemQuery.run(dishId)
  res.json({ removed: dishId })
})

app.put('/api/cart', (req, res) => {
  const dishIds = req.body?.dishIds
  if (!Array.isArray(dishIds) || dishIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ error: 'dishIds must be an array of dish ids' })
  }
  const replaceCart = db.transaction(ids => {
    clearCartQuery.run()
    for (const id of new Set(ids)) insertCartItemQuery.run(id)
  })
  replaceCart(dishIds)
  res.json({ count: dishIds.length })
})

app.post('/api/cart/confirm', (req, res) => {
  const confirmedAt = (typeof req.body?.dateTime === 'string' && req.body.dateTime
    ? req.body.dateTime
    : new Date().toISOString())

  const confirm = db.transaction(items => {
    for (const item of items) upsertOrderStatQuery.run(item.dish_id, confirmedAt)
    clearCartQuery.run()
  })

  const items = cartListQuery.all()
  if (items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' })
  }
  confirm(items)
  res.json({ confirmed: items.map(item => item.dish_id), confirmedAt })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
