import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getDish } from '../api.js'

const STYLES = {
  content: { maxWidth: 640, margin: '0 auto'},
  back: {
    display: 'inline-block',
    color: '#1565c0',
    textDecoration: 'none',
    marginBottom: 12,
    fontSize: 15
  },
  name: { fontSize: 24, margin: '0 0 4px' },
  category: {
    display: 'inline-block',
    background: '#e8f0e8',
    color: '#33691e',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 13,
    margin: '0 0 16px'
  },
  placeholder: {
    aspectRatio: '4 / 3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 64,
    background: '#f0f0f0',
    borderRadius: 8
  },
  mainImage: {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    borderRadius: 8,
    display: 'block'
  },
  thumbRow: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
    overflowX: 'auto'
  },
  thumb: {
    width: 96,
    height: 72,
    objectFit: 'cover',
    borderRadius: 4,
    flexShrink: 0
  },
  description: { fontSize: 15, color: '#444', lineHeight: 1.6 },
  sectionTitle: { fontSize: 18, fontWeight: 600, margin: '24px 0 8px' },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: 15
  },
  amount: { color: '#888' },
  emptyHint: { color: '#999', fontSize: 14 },
  notFoundIcon: { fontSize: 40, margin: '0 0 12px' },
  center: { textAlign: 'center', color: '#666', padding: 48 },
  errorText: { color: '#c62828' },
  errorDetail: { fontSize: 12, color: '#999'}
}

export default function Dish() {
  const { id } = useParams()
  const [state, setState] = useState({
    status: 'loading',
    dish: null,
    message: ''
  })

  useEffect(() => {
    setState({ status: 'loading', dish: null, message: '' })
    getDish(id)
      .then(dish => setState({ status: 'ok', dish, message: '' }))
      .catch(err => {
        if (err.status === 404) setState({ status: 'notfound', dish: null, message: '' })
          else setState({ status: 'error', dish: null, message: err.message })
      })
  }, [id])

  if (state.status === 'loading') return <p style={STYLES.center}>加载中...</p>

  if (state.status === 'notfound') {
    return (
      <div style={STYLES.center}>
        <p style={STYLES.notFoundIcon} aria-hidden="true" >🍽️</p>
        <p>没有这道菜</p>
        <Link to="/" style={STYLES.back}>返回菜单</Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={STYLES.center}>
        <p style={STYLES.errorText}>加载失败 - 请确认后端服务器已启动</p>
        <p style={STYLES.errorDetail}>{state.message}</p>
        <Link to="/" style={STYLES.back}>返回菜单</Link>
      </div>
    )
  }

  const { dish } = state
  return (
    <div style={STYLES.content}>
      <Link to="/" style={STYLES.back}>返回菜单</Link>
      <h1 style={STYLES.name}>{dish.name}</h1>
      <span style={STYLES.category}>{dish.category}</span>

      {
        dish.images.length > 0
          ? (
              <>
                <img style={STYLES.mainImage} src={dish.images[0].path} alt={dish.name} />
                {dish.images.length > 1 && (
                  <div style={STYLES.thumbRow}>
                    {dish.images.slice(1).map(image => (
                      <img key={image.id} style={STYLES.thumb} src={image.path} alt="" />
                    ))}
                  </div>
                )}
              </>
            )
          : <div style={STYLES.placeholder} aria-hidden="true">🍲</div>
      }

      <h2 style={STYLES.sectionTitle}>食材</h2>
      <ul style={STYLES.list}>
        {dish.ingredients.map(ing => (
          <li key={ing.id} style={STYLES.listItem}>
            <span>{ing.name}</span>
            <span style={STYLES.amount}>{ing.amount || ''}</span>
          </li>
        ))}
      </ul>

      <h2 style={STYLES.sectionTitle}>佐料</h2>
      {dish.seasonings.length === 0
        ? <p style={STYLES.emptyHint}>暂无</p>
        : (
            <ul style={STYLES.list}>
              {dish.seasonings.map(seasoning => (
                <li key={seasoning.id} style={STYLES.listItem}>
                  <span>{seasoning.name}</span>
                  <span style={STYLES.amount}>{seasoning.amount || ''}</span>
                </li>
              ))}
            </ul>
          )
      }

      <h2 style={STYLES.sectionTitle}>做法</h2>
      {dish.description && <p style={STYLES.description}>{dish.description}</p>}

    </div>
  )
}
