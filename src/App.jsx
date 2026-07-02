import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { listEvents } from './api.js'
import { ENVIRONMENTS, getActiveEnvId, getApiBase, selectEnv } from './config.js'

function useBackendHealth() {
  const [state, setState] = useState('checking') // checking | up | down

  useEffect(() => {
    let alive = true
    listEvents({ perPage: 1 }).then((r) => {
      if (!alive) return
      setState(r.status === 0 ? 'down' : 'up')
    })
    return () => {
      alive = false
    }
  }, [])

  return state
}

export default function App() {
  const health = useBackendHealth()
  const location = useLocation()
  const onDetail = location.pathname.startsWith('/events/')
  const envId = getActiveEnvId()

  const onEnvChange = (e) => {
    if (selectEnv(e.target.value)) window.location.reload()
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">APEX</span>
          <span className="brand-sep">/</span>
          <span className="brand-sub">events api tester</span>
        </Link>

        <div className="topbar-meta">
          <label className="env-switch" title={getApiBase()}>
            <span className="env-label">backend</span>
            <select className="env-select" value={envId} onChange={onEnvChange}>
              {ENVIRONMENTS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              <option value="custom">{envId === 'custom' ? `Custom · ${getApiBase()}` : 'Custom…'}</option>
            </select>
          </label>
          <span className={`health health-${health}`} title={getApiBase()}>
            <span className="health-dot" />
            {health === 'checking' ? 'connecting' : health === 'up' ? 'reachable' : 'unreachable'}
          </span>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="foot">
        <span>Manual E2E harness for the public Events API. Not shipped to users.</span>
        <span className="foot-mono">browse → register → pay → confirm</span>
      </footer>
    </div>
  )
}
