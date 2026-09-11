import fs from 'node:fs'
import path from 'node:path'

// Dish images served as static files at client/public/dishes/
export const DISH_IMAGES_DIR = path.join(import.meta.dirname, '..', 'client', 'public', 'dishes')
// png first: once real photos land, they win over the old svg placeholder
export const IMAGE_EXTS = ['png', 'svg']

// First existing image file for a dish view, or undefined when missing
export function findDishImage(name, view, dir = DISH_IMAGES_DIR) {
  return IMAGE_EXTS
    .map(ext => `${name}_${view}.${ext}`)
    .find(filename => fs.existsSync(path.join(dir, filename)))
}
