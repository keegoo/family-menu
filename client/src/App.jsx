import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router'
import Home from './pages/Home'
import Dish from './pages/Dish'
import { getCart } from './api.js'

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
  main: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '16px'
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
  }
}

export default function App() {
  const [cartCount, setCartCount] = useState(0)

  const refreshCart = useCallback(
    () => getCart().then(cart => setCartCount(cart.count)).catch(() => { }),
    []
  )

  useEffect(() => { refreshCart() }, [refreshCart])

  return (
    <BrowserRouter>
      <header style={STYLES.header}>
        <h1 style={STYLES.title}>
          <Link to="/" style={STYLES.link}>Family Menu</Link>
        </h1>
      </header>
      <span style={STYLES.cart} aria-label={`购物车 ${cartCount} 件`}>
        <span aria-hidden="true">🛒</span>
        <span style={STYLES.badge}>{cartCount}</span>
      </span>
      <main style={STYLES.main}>
        <Routes>
          <Route path="/" element={<Home onAdded={refreshCart} />} />
          <Route path="/dish/:id" element={<Dish onAdded={refreshCart} />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
