import { useEffect, useState } from 'react'

const STYLES = {
  card: {
    padding: 24,
    borderRadius: 8,
    border: '1px solid #e0e0e0',
    marginTop: 16
  },
  ok: { color: '#2e7d32' },
  fail: { color: '#c62828' }
}

export default function Home() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    fetch('/api/health')
      .then(res => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then(data => setStatus(data.status || 'ok'))
  }, [])

  return (
    <div style={STYLES.card}>
      <p>
        backend:
        {status === 'loading' && <span>loading...</span>}
        {status === 'ok' && <span style={STYLES.ok}>ok</span>}
        {status === 'fail' && <span style={STYLES.fail}>cannot connect to backend</span>}
      </p>
    </div>
  )
}
