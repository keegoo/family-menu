import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, BrowserRouter, Routes, Route, Link } from 'react-router'
import Home from './pages/Home'
import Dish from './pages/Dish'
import Cart from './pages/Cart'
import { getCart, syncCart } from './api'
import './App.css'

const STYLES = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    borderBottom: '1px solid #e0e0e0'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: '12px 0'
  },
  link: {
    color: '#333',
    textDecoration: 'none'
  },
  cartButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 20,
    background: 'transparent',
    fontSize: 18,
    cursor: 'pointer'
  },
  badge: {
    minWidth: 20,
    padding: '0 6px',
    borderRadius: 10,
    background: '#33691e',
    color: '#fff',
    fontSize: 12,
    lineHeight: '20px',
    textAlign: 'center'
  },
  unsavedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    background: '#e65100'
  },
  main: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '16px'
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const [selectedIds, setSelectedIds] = useState([])
  const [dirty, setDirty] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    getCart()
      .then(cart => setSelectedIds(cart.items.map(item => item.dish_id)))
      .catch(() => {})
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((type, text) => {
    setToast({ type, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }, [])

  const toggleDish = useCallback((dish) => {
    setSelectedIds(ids => ids.includes(dish.id)
      ? ids.filter(id => id !== dish.id)
      : [...ids, dish.id])
    setDirty(true)
  }, [])

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    try {
      await syncCart(selectedIds)
      setDirty(false)
      navigate('/cart')
    } catch {
      showToast('error', '同步失败，请再试一次')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <header style={STYLES.header}>
        <h1 style={STYLES.title}>
          <Link to="/" style={STYLES.link}>Family Menu</Link>
        </h1>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/stats" style={STYLES.link}>统计</Link>
          <button
            type="button"
            style={STYLES.cartButton}
            disabled={syncing}
            onClick={handleSync}
            aria-label={`已选 ${selectedIds.length} 道菜${dirty ? '，尚未同步' : ''}`}
          >
            <span aria-hidden="true">🛒</span>
            <span style={STYLES.badge}>{selectedIds.length}</span>
            {dirty && <span style={STYLES.unsavedDot} aria-hidden="true" />}
          </button>
        </nav>
      </header>
      <main style={STYLES.main}>
        <Routes>
          <Route path="/" element={<Home selectedIds={selectedIds} onToggle={toggleDish} />} />
          <Route path="/dish/:id" element={<Dish />} />
          <Route path="/cart" element={
            <Cart
              onRemove={dishId => setSelectedIds(ids => ids.filter(id => id !== dishId))}
              onConfirmed={() => {
                setSelectedIds([])
                setDirty(false)
                showToast('ok', '已确认，开饭！')
              }}
            />
          }/>
          <Route path="/stats" element={<p style={{ color: '#666', padding: 16 }}>统计页面</p>} />
        </Routes>
      </main>
      {toast && (
        <div className="toast" role="status" style={toast.type === 'error' ? { background: '#c62828' } : null}>
          {toast.text}
        </div>
      )}
    </>
  )
}
