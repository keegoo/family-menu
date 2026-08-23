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
export const chooseDish = (dishId) => request('/api/cart/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dishId })
})
