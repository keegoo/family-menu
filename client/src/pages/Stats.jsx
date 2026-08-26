import { useEffect, useState } from 'react'
import { getStats } from '../api'

const STYLES = {
  header: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 600, margin: 0 },
  total: { fontSize: 13, color: '#888' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    borderBottom: '1px solid #eee'
  },
  topRow: { background: '#fff8e1' },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    background: '#e0e0e0',
    color: '#555',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '28px',
    textAlign: 'center',
    flexShrink: 0
  },
  rankGold: { color: '#f9a825', color: '#fff' },
  rankSilver: { color: '#9e9e9e', color: '#fff' },
  rankBronze: { color: '#bf6a2e', color: '#fff' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    objectFit: 'cover',
    background: '#f0f0f0',
    flexShrink: 0
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { margin: 0, fontSize: 15, fontWeight: 500 },
  count: {
    minWidth: 24,
    padding: '0 8px',
    borderRadius: 12,
    background: '#33691e',
    color: '#fff',
    fontSize: 13,
    lineHeight: '24px',
    textAlign: 'center',
    flexShrink: 0
  },
  countZero: { background: '#e0e0e0', color: '#888' },
  divider: { margin: '16px 0 8px', padding: '0 12px', fontSize: 13, color: '#999' },
  error: { color: '#c62828', padding: 16 },
  errorDetail: { fontSize: 12, color: '#999' },
  empty: { textAlign: 'center', padding: '48px 16px', color: '#666' },
  loading: { color: '#666', padding: 16 }
}

const MEDALS = [STYLES.rankGold, STYLES.rankSilver, STYLES.rankBronze]

export default function Stats() {
  const [state, setState] = useState({
    status: 'loading',
    dishes: [],
    totalOrders: 0,
    message: ''
  })

  useEffect(() => {
    getStats()
      .then(stats => setState({
        status: 'ok',
        dishes: stats.dishes,
        totalOrders: stats.total_orders,
        message: ''
      }))
      .catch(err => setState({
        status: 'error',
        dishes: [],
        totalOrders: 0,
        message: err.message
      }))
  }, [])

  if (state.status === 'loading') return <p style={STYLES.loading}>加载中...</p>
  if (state.status === 'error') {
    return (
      <div style={STYLES.error}>
        <p>统计数据加载失败 - 请确认后段服务器已启动</p>
        <p style={STYLES.errorDetail}>{state.message}</p>
      </div>
    )
  }
  if (state.dishes.length === 0) return <p style={STYLES.empty}>还没有统计数据...</p>

  const rows = []
  let dividerShown = false
  state.dishes.forEach((dish, index) => {
    const isPopular = dish.order_count > 0
    if (!isPopular && !dividerShown && index > 0) {
      dividerShown = true
      rows.push(<p key="divider" style={STYLES.divider}>还没做过</p>)
    }
    const isTop = isPopular && index < 3
    rows.push(
      <div key={dish.id} style={isTop ? { ...STYLES.row, ...STYLES.topRow } : STYLES.row}>
        <span
          style={isTop ? { ...STYLES.rank, ...MEDALS[index] } : STYLES.rank}
          aria-hidden="true"
        >{index + 1}</span>
        {dish.cover
          ? <img src={dish.cover} alt={dish.name} style={STYLES.thumb} />
          : <div style={STYLES.thumb} aria-hidden="true" />}
        <div style={STYLES.rowInfo}>
          <p style={STYLES.rowName}>{dish.name}</p>
        </div>
        <span style={isPopular ? STYLES.count : { ...STYLES.count, ...STYLES.countZero }}>
          {dish.order_count} 次
        </span>
      </div>
    )
  })

  return (
    <div>
      <div style={STYLES.header}>
        <h2 style={STYLES.title}>热门菜品</h2>
        <span style={STYLES.total}>累计做了 {state.totalOrders} 道菜</span>
      </div>
      {rows}
    </div>
  )
}
