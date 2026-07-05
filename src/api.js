// Thin client over the public Events API. Calls the ABSOLUTE backend base URL
// chosen in the header (see config.js), so it works in dev and when published.
// Every method returns { ok, status, body } where body is the parsed
// { success, data, message, ... } envelope.

import { getApiBase } from './config.js'

const path = () => `${getApiBase()}/api/public/events`

const API_KEY = import.meta.env.VITE_EVENT_API_KEY || ''

export function hasApiKey() {
  return API_KEY.length > 0
}

function authHeaders() {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}
}

async function request(url, options = {}) {
  let res
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', ...authHeaders(), ...(options.headers || {}) },
      ...options,
    })
  } catch (networkError) {
    // network failure or CORS block
    return { ok: false, status: 0, body: null, networkError: String(networkError) }
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  return { ok: res.ok, status: res.status, body }
}

export function listEvents({ filter = 'upcoming', page = 1, perPage = 12, search = '' } = {}) {
  const params = new URLSearchParams({ filter, page: String(page), per_page: String(perPage) })
  if (search.trim()) params.set('search', search.trim())
  return request(`${path()}?${params.toString()}`)
}

export function getEvent(id) {
  return request(`${path()}/${id}`)
}

export function registerForEvent(id, payload) {
  return request(`${path()}/${id}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
