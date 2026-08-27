import { Link } from 'react-router'

const STYLES = {
  wrap: { textAlign: 'center', padding: '64px 16px', color: '#666' },
  icon: { fontSize: 48, margin: '0 0 12px' },
  title: { fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#333' },
  hint: { fontSize: 14, margin: '0 0 20px' },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    padding: '0 20px',
    borderRadius: 22,
    background: '#33691e',
    color: '#fff',
    fontSize: 15,
    textDecoration: 'none'
  }
}

export default function NotFound() {
  return (
    <div style={STYLES.wrap}>
      <p style={STYLES.icon} aria-hidden="true">🧭</p>
      <h2 style={STYLES.title}>页面不存在</h2>
      <p style={STYLES.hint}>这个地址没有对应的页面</p>
      <Link to="/" style={STYLES.link}>回到菜单</Link>
    </div>
  )
}
