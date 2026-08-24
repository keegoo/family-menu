import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { confirmCart, getCart, removeCartItem } from '../api.js'

const STYLES = {
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 12px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid #eee'
  },
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
  rowCategory: { margin: '2px 0 0', fontSize: 12, color: '#999' },
  remove: {
    border: 'none',
    background: 'transparent',
    color: '#c62828',
    fontSize: 14,
    cursor: 'pointer',
    padding: '8px 12px'
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 },
  label: { fontSize: 14, color: '#555' },
  dateInput: {
    width: '100%',
    maxWidth: 320,
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 8,
    fontSize: 16,
    boxSizing: 'border-box'
  },
  confirm: {
    alignSelf: 'flex-start',
    padding: '12px 28px',
    border: 'none',
    borderRadius: 24,
    background: '#33691e',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer'
  },
  empty: { textAlign: 'center', padding: '48px 16px', color: '#666' },
  loading: { color: '#666', padding: 16 },
  emptyLink: { color: '#33691e' },
  error: { color: '#c62828', padding: 16 }
}

function localDateTimeValue() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Cart({ onRemove, onConfirmed }) {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', items: [], message: '' })
  const [dateTime, setDateTime] = useState(localDateTimeValue)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    getCart()
      .then(cart => setState({ status: 'ok', items: cart.items, message: '' }))
      .catch(err => setState({ status: 'error', items: [], message: err.message }))
  }, [])

  async function handleRemove(item) {
    try {
      await removeCartItem(item.id)
      setState(s => ({ ...s, items: s.items.filter(i => i.dish_id !== item.dish_id) }))
      onRemove(item.dish_id)
    } catch {
      setState(s => ({ ...s, status: 'error', message: '移除失败，请再试一次' }))
    }
  }

  async function handleConfirm() {
    if (!dateTime || confirming) return
    setConfirming(true)
    try {
      await confirmCart(dateTime)
      onConfirmed()
      navigate('/')
    } catch {
      setConfirming(false)
      setState(s => ({ ...s, status: 'error', message: '确认失败，请再试一次' }))
    }
  }

  if (state.status === 'loading') return <p style={STYLES.loading}>加载中...</p>

  if (state.status === 'error') {
    return (
      <div style={STYLES.error}>
        <p>{state.message}</p>
        <Link to="/" style={STYLES.emptyLink}>回到菜单</Link>
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div style={STYLES.empty}>
        <p>购物车为空</p>
        <Link to="/" style={STYLES.emptyLink}>回到菜单</Link>
      </div>
    )
  }

  return (
    <div>
      <h2 style={STYLES.title}>已选的菜</h2>
      {state.items.map(item => (
        <div key={item.dish_id} style={STYLES.row}>
          {item.cover
            ? <img src={item.cover} alt={item.name} style={STYLES.thumb} />
            : <div style={STYLES.thumb} aria-hidden="true" />}
          <div style={STYLES.rowInfo}>
            <p style={STYLES.rowName}>{item.name}</p>
            <p style={STYLES.rowCategory}>{item.category}</p>
          </div>
          <button type="button" style={STYLES.removeButton} onClick={() => handleRemove(item.dish_id)}>移除</button>
        </div>
      ))}

      <div style={STYLES.form}>
        <label style={STYLES.label}>
          什么时候吃?
          <input
            type="datetime-local"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            style={STYLES.dateInput}
          />
        </label>
        <button
          type="button"
          style={STYLES.confirm}
          disabled={!dateTime || confirming}
          onClick={handleConfirm}
        >确认</button>
      </div>

    </div>
  )
}
