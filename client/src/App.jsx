import { BrowserRouter, Routes, Route, Link } from 'react-router'
import Home from './pages/Home'

const STYLES = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    borderBottom: '1px solid #e0e0e0'
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
        <h1>Family Menu</h1>
        <nav>
          <Link to="/">Menu</Link>
        </nav>
      </header>
      <main style={STYLES.main}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
