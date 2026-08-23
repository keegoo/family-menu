async function request(path) {
  const res = await fetch(path)
  if (!res.ok) {
    const err = new Error(`GET ${path} failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export const getDishes = () => request('/api/dishes')
export const getCategories = () => request('/api/categories')
export const getDish = (id) => request(`/api/dishes/${id}`)
