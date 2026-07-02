// Backend selection. The app calls an ABSOLUTE backend base URL so it works
// both in local dev and when this tester is published online (no dev proxy).
//
// Default = Production, so a deployed build "just works". A dropdown in the
// header lets you switch to Local (or a custom URL); the choice persists in
// localStorage. Override the production default at build time with
// VITE_API_BASE_URL.

const PROD_DEFAULT = import.meta.env.VITE_API_BASE_URL || 'https://csms-apex.brackets-tech.com'
const LOCAL_DEFAULT = 'http://localhost:8000'
const LS_KEY = 'apex_api_base'

const strip = (u) => String(u || '').replace(/\/+$/, '')

export const ENVIRONMENTS = [
  { id: 'production', label: 'Production', url: PROD_DEFAULT },
  { id: 'local', label: 'Local · localhost:8000', url: LOCAL_DEFAULT },
]

export function getApiBase() {
  let saved = null
  try { saved = localStorage.getItem(LS_KEY) } catch { /* SSR / privacy mode */ }
  return strip(saved || PROD_DEFAULT)
}

export function getActiveEnvId() {
  const base = getApiBase()
  const match = ENVIRONMENTS.find((e) => strip(e.url) === base)
  return match ? match.id : 'custom'
}

// Returns true when the base actually changed (caller should reload).
export function selectEnv(id) {
  let url = null
  if (id === 'custom') {
    url = window.prompt('Backend base URL', getApiBase())
    if (!url) return false
  } else {
    const env = ENVIRONMENTS.find((e) => e.id === id)
    if (!env) return false
    url = env.url
  }
  const next = strip(url)
  if (next === getApiBase()) return false
  try { localStorage.setItem(LS_KEY, next) } catch { /* ignore */ }
  return true
}
