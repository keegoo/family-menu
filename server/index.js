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

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
