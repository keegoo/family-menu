async function request(path, options) {
  const res = await fetch(path, options)
  if (!res.ok) {
    const err = new Error(`${options?.method || 'GET'} ${path} failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export const getDishes = () => request('/api/dishes')
export const getCategories = () => request('/api/categories')
export const getDish = (id) => request(`/api/dishes/${id}`)
export const getCart = () => request('/api/cart')
export const syncCart = (dishIds) => request('/api/cart', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dishIds })
})
export const removeCartItem = (dishId) => request(`/api/cart/items/${dishId}`, { method: 'DELETE' })
export const confirmCart = (dateTime) => request('/api/cart/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dateTime })
})
export const getStats = () => request('/api/stats')
