import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.join(__dirname, '..', 'data')

fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(path.join(DATA_DIR, 'family-menu.db'))
db.exec('PRAGMA foreign_keys = ON')
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

// Minimal replacement for better-sqlite3's db.transaction().
// Callback must be synchronous and transactions must not nest.
export function transaction(callback) {
  db.exec('BEGIN')

  try {
    const result = callback()
    db.exec('COMMIT')
    return result
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // Preserve the original error
    }
    throw error
  }
}

// All prepared statements in one place
export const queries = {
  dishList: db.prepare(`
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
  `),
  dishDetail: db.prepare(`
    SELECT
      dishes.id,
      dishes.name,
      dishes.description,
      dishes.category_id,
      categories.name AS category
    FROM dishes
    JOIN categories ON dishes.category_id = categories.id
    WHERE dishes.id = ?
  `),
  dishImages: db.prepare(
    'SELECT id, path FROM dish_images where dish_id = ? ORDER BY sort, id'
  ),
  dishIngredients: db.prepare(
    'SELECT id, name, amount FROM ingredients WHERE dish_id = ? ORDER BY sort, id'
  ),
  dishSeasonings: db.prepare(
    'SELECT id, name, amount FROM seasonings WHERE dish_id = ? ORDER BY sort, id'
  ),
  categoryList: db.prepare('SELECT id, name FROM categories ORDER BY sort, id'),
  cartList: db.prepare(`
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
  `),
  statsList: db.prepare(`
    SELECT
      dishes.id,
      dishes.name,
      COALESCE(order_stats.count, 0) AS order_count,
      (
        SELECT path FROM dish_images
        WHERE dish_id = dishes.id
        ORDER BY dish_images.sort
        LIMIT 1
      ) AS cover
    FROM dishes
    LEFT JOIN order_stats ON order_stats.dish_id = dishes.id
    ORDER BY order_count DESC, dishes.name
  `),
  totalOrders: db.prepare('SELECT COALESCE(SUM(count), 0) AS total_orders FROM order_stats'),
  dishExists: db.prepare('SELECT id FROM dishes WHERE id = ?'),
  addCartItem: db.prepare(`
    INSERT INTO cart_items (dish_id) VALUES (?)
    ON CONFLICT(dish_id) DO NOTHING
  `),
  cartItem: db.prepare('SELECT id, dish_id FROM cart_items WHERE dish_id = ?'),
  deleteCartItem: db.prepare('DELETE FROM cart_items WHERE dish_id = ?'),
  clearCart: db.prepare('DELETE FROM cart_items'),
  upsertOrderStat: db.prepare(`
    INSERT INTO order_stats (dish_id, count, last_ordered_at) VALUES (?, 1, ?)
    ON CONFLICT(dish_id)
    DO UPDATE SET
      count = count + 1,
      last_ordered_at = excluded.last_ordered_at
  `),
  insertCartItem: db.prepare('INSERT INTO cart_items (dish_id) VALUES (?)')
}

export default db
