import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getCategories, getDishes } from '../api'
import './Home.css'

const STYLES = {
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 600, margin: '0 0 12px' },
  grid: { display: 'grid', gap: 16 },
  card: {
    display: 'block',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit'
  },
  cover: { width: '100%', height: 160, objectFit: 'cover', display: 'block' },
  placeholder: {
    height: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    background: '#f0f0f0'
  },
  cardName: { padding: '8px 12px', fontSize: 15, fontWeight: 500 },
  loading: { color: '#666', padding: 16 },
  error: { color: '#c62828', padding: 16 },
  errorDetail: { fontSize: 12, color: '#999' }
}

export default function Home() {
  const [state, setState] = useState({
    status: 'loading',
    categories: [],
    dishes: [],
    message: ''
  })

  useEffect(() => {
    Promise.all([getCategories(), getDishes()])
      .then(([categories, dishes]) => {
        setState({ status: 'ok', categories, dishes, message: '' })
      })
      .catch(err => setState({ status: 'error', categories: [], dishes: [], message: err.message }))
  }, [])

  if (state.status === 'loading') return <p style={STYLES.loading}>加载中...</p>
  if (state.status === 'error') {
    return (
      <div style={STYLES.error}>
        <p>菜单加载失败 - 请确认后端服务器已启动</p>
        <p style={STYLES.errorDetail}>{state.message}</p>
      </div>
    )
  }

  const dishesByCategory = {}
  for (const dish of state.dishes) {
    const list = dishesByCategory[dish.category_id] || (dishesByCategory[dish.category_id] = [])
    list.push(dish)
  }

  const sections = state.categories
    .filter(cat => dishesByCategory[cat.id])
    .map(cat => ({ ...cat, dishes: dishesByCategory[cat.id] }))

  if (sections.length === 0) return <p style={STYLES.loading}>还没有菜品...</p>

  return (
    <div>
      {sections.map(section => (
        <section key={section.id} style={STYLES.section}>
          <h2 style={STYLES.sectionTitle}>{section.name}</h2>
          <div className="dish-grid" style={STYLES.grid}>
            {section.dishes.map(dish => (
              <Link key={dish.id} to={`/dish/${dish.id}`} style={STYLES.card}>
                {dish.cover
                  ? <img src={dish.cover} alt={dish.name} styles={STYLES.cover} />
                  : <div style={STYLES.placeholder} aria-hidden="true">🍲</div>
                }
                <p style={STYLES.cardName}>{dish.name}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
