import { BrowserRouter, Routes, Route, Link } from 'react-router'
import Home from './pages/Home'
import Dish from './pages/Dish'


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
  nav: {
    display: 'flex',
    gap: 16
  },
  link: {
    color: '#333',
    textDecoration: 'none'
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
      <header style={STYLES.header}>
        <h1 style={STYLES.title}>Family Menu</h1>
        <nav style={STYLES.nav}>
          <Link to="/" style={STYLES.link}>Menu</Link>
        </nav>
      </header>
      <main style={STYLES.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dish/:id" element={<Dish />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
