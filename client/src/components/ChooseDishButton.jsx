import { useEffect, useRef, useState } from 'react'
import { chooseDish } from '../api.js'
import './ChooseDishButton.css'

const LABELS = {
  idle: '选这道菜',
  adding: '添加中...',
  added: '已选 ✓',
  failed: '操作失败'
}

const STYLES = {
  button: {
    width: '100%',
    minHeight: 44,
    padding: '10px 14px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #33691e',
    background: '#fff',
    color: '#33691e',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  },
  added: { background: '#33691e', color: '#fff' },
  failed: { background: '#c62828', color: '#c62828'}
}

export default function ChooseDishButton({ dishId, onAdded, style }) {
  const [status, setStatus] = useState('idle')
  const timer = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(timer.current)
    }
  }, [])

  async function handleClick() {
    if (status === 'adding') return
    setStatus('adding')
    try {
      await chooseDish(dishId)
      setStatus('added')
      if (onAdded) onAdded()
    } catch {
      setStatus('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 1200)
  }

  return (
    <button
      type="button"
      className="choose-dish"
      disabled={status === 'adding'}
      onClick={handleClick}
      style={{
        ...STYLES.button,
        ...(status === 'added' ? STYLES.added : null),
        ...(status === 'failed' ? STYLES.failed : null),
        ...style
      }}
    >
      {LABELS[status]}
    </button>
  )
}
