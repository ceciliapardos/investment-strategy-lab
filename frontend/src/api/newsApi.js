import axios from 'axios'

const BASE = '/api/news'

export async function getCategories(signal) {
  const { data } = await axios.get(`${BASE}/categories`, { signal })
  return data.categories
}

export async function getNews(category = 'all', signal) {
  const { data } = await axios.get(BASE, { params: { category }, signal })
  return data
}

export async function searchNews(q, signal) {
  const { data } = await axios.get(`${BASE}/search`, { params: { q }, signal })
  return data
}
