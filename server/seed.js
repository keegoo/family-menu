import db from './db.js'

const categories = [
  { name: '炒菜', sort: 1 },
  { name: '炖菜', sort: 2 },
  { name: '主食', sort: 3 },
  { name: '汤', sort: 4 }
]

const dishes = [
  {
    name: '西红柿炒鸡蛋',
    category: '炒菜',
    description: '经典家常菜，酸甜下饭',
    ingredients: [
      { name: '西红柿', amount: '2个' },
      { name: '鸡蛋', amount: '3个' }
    ],
    seasonings: [
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1小勺' }
    ]
  },
  {
    name: '青椒肉丝',
    category: '炒菜',
    description: '简单快手菜',
    ingredients: [
      { name: '猪里脊', amount: '200克' },
      { name: '青椒', amount: '2个' }
    ],
    seasonings: [
      { name: '生抽', amount: '1勺' },
      { name: '淀粉', amount: '1勺' }
    ]
  },
  {
    name: '红烧肉',
    category: '炖菜',
    description: '肥而不腻，入口即化',
    ingredients: [{ name: '五花肉', amount: '500克' }],
    seasonings: [
      { name: '冰糖', amount: '20克' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' }
    ]
  },
  {
    name: '排骨炖萝卜',
    category: '炖菜',
    description: '汤鲜味美，冬天最爱',
    ingredients: [
      { name: '排骨', amount: '500克' },
      { name: '白萝卜', amount: '1根' }
    ],
    seasonings: [
      { name: '姜', amount: '3片' },
      { name: '盐', amount: '适量' }
    ]
  },
  {
    name: '米饭',
    category: '主食',
    description: '基础主食',
    ingredients: [{ name: '大米', amount: '2杯' }],
    seasonings: []
  },
  {
    name: '紫菜蛋花汤',
    category: '汤',
    description: '十分钟快手汤',
    ingredients: [
      { name: '紫菜', amount: '1小把' },
      { name: '鸡蛋', amount: '1个' }
    ],
    seasonings: [
      { name: '盐', amount: '适量' },
      { name: '香油', amount: '几滴' }
    ]
  }
]

const seed = db.transaction(() => {
  db.prepare('DELETE FROM dishes').run()
  db.prepare('DELETE FROM categories').run()


  const insertCategory = db.prepare(
    'INSERT INTO categories (name, sort) VALUES (?, ?)'
  )
  const insertDish = db.prepare(
    'INSERT INTO dishes (name, category_id, description) VALUES (?, ?, ?)'
  )
  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (dish_id, name, amount, sort) VALUES (?, ?, ?, ?)'
  )
  const insertSeasoning = db.prepare(
    'INSERT INTO seasonings (dish_id, name, amount, sort) VALUES (?, ?, ?, ?)'
  )
  const findCategory = db.prepare('SELECT id FROM categories WHERE name = ?')

  for (const c of categories) {
    insertCategory.run(c.name, c.sort)
  }

  for (const d of dishes) {
    const category = findCategory.get(d.category)
    const dishId = insertDish.run(d.name, category.id, d.description).lastInsertRowid

    d.ingredients.forEach((ing, i) => {
      insertIngredient.run(dishId, ing.name, ing.amount, i + 1)
    })
    d.seasonings.forEach((sea, i) => {
      insertSeasoning.run(dishId, sea.name, sea.amount, i + 1)
    })
  }
})

seed()

const dishCount = db.prepare('SELECT COUNT(*) AS n FROM dishes').get().n
const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n
console.log(`Seeded ${categoryCount} categories and ${dishCount} dishes`)
