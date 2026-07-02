import { useEffect, useRef, useState } from 'react'
import { listEvents } from '../api.js'
import EventCard from '../components/EventCard.jsx'

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
]

function Skeletons() {
  return (
    <div className="skel-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="skel" key={i}>
          <div className="skel-cover shimmer" />
          <div className="skel-line shimmer" style={{ width: '70%' }} />
          <div className="skel-line shimmer" style={{ width: '45%' }} />
          <div className="skel-line shimmer" style={{ width: '30%', marginBottom: 18 }} />
        </div>
      ))}
    </div>
  )
}

export default function ListPage() {
  const [filter, setFilter] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ status: 'loading', events: [], pagination: null, error: null })
  const debounce = useRef()

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    let alive = true
    listEvents({ filter, page, search }).then((r) => {
      if (!alive) return
      if (r.status === 0) {
        setState({ status: 'error', events: [], pagination: null, error: 'Cannot reach the selected backend (network or CORS). Check the header dropdown, that the backend is up, and that its CORS allows this origin.' })
      } else if (!r.ok || !r.body?.success) {
        setState({ status: 'error', events: [], pagination: null, error: r.body?.message || `Request failed (${r.status}).` })
      } else {
        setState({ status: 'ready', events: r.body.data || [], pagination: r.body.pagination, error: null })
      }
    })
    return () => { alive = false }
  }, [filter, page, search])

  const onSearch = (v) => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { setPage(1); setSearch(v) }, 350)
  }
  const changeFilter = (k) => { setPage(1); setFilter(k) }

  const { status, events, pagination, error } = state

  return (
    <section>
      <div className="section-head">
        <span className="eyebrow">Public Events · no auth</span>
        <h1>Browse events</h1>
        <p>Pulled live from <code>GET /api/public/events</code>. Pick one to open its detail page and run a registration.</p>
      </div>

      <div className="controls">
        <div className="segmented" role="group" aria-label="Time filter">
          {FILTERS.map((f) => (
            <button key={f.key} aria-pressed={filter === f.key} onClick={() => changeFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <label className="search">
          <span className="glyph">⌕</span>
          <input type="search" placeholder="Search by title…" defaultValue={search} onChange={(e) => onSearch(e.target.value)} />
        </label>
        {pagination && <span className="count-tag">{pagination.total} total</span>}
      </div>

      {status === 'loading' && <Skeletons />}

      {status === 'error' && (
        <div className="state error">
          <span className="eyebrow">Request failed</span>
          <h3>Couldn’t load events</h3>
          <p>{error}</p>
        </div>
      )}

      {status === 'ready' && events.length === 0 && (
        <div className="state">
          <span className="eyebrow">Empty</span>
          <h3>No events match</h3>
          <p>Nothing published for this filter{search ? ` and “${search}”` : ''}. Try “All”, or seed a published+listed event in the admin.</p>
        </div>
      )}

      {status === 'ready' && events.length > 0 && (
        <>
          <div className="grid">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
          {pagination && pagination.last_page > 1 && (
            <div className="pager">
              <button disabled={pagination.current_page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-of">page {pagination.current_page} / {pagination.last_page}</span>
              <button disabled={pagination.current_page >= pagination.last_page} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
