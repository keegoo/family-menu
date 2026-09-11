import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { findDishImage } from './dish-images.js'

// Temp dir with empty placeholder files standing in for real images
function fixtureDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dish-images-'))
  for (const file of files) fs.writeFileSync(path.join(dir, file), '')
  return dir
}

test('prefers png over svg when both exist', () => {
  const dir = fixtureDir(['红烧肉_侧视图.png', '红烧肉_侧视图.svg'])
  assert.equal(findDishImage('红烧肉', '侧视图', dir), '红烧肉_侧视图.png')
})

test('falls back to svg when no png exists', () => {
  const dir = fixtureDir(['米饭_俯视图.svg'])
  assert.equal(findDishImage('米饭', '俯视图', dir), '米饭_俯视图.svg')
})

test('returns undefined when neither format exists', () => {
  const dir = fixtureDir(['青椒肉丝_侧视图.svg'])
  assert.equal(findDishImage('青椒肉丝', '俯视图', dir), undefined)
})
