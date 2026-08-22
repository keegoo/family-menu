async function request(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export const getDishes = () => request('api/dishes')
export const getCategories = () => request('api/categories')
