import { useMemo } from 'react'
import { money } from '../format.js'

// Flexible ticketing (032): build a cart from the event's `pricing` block.
// Whole-event is exclusive; days + sessions may mix across different days; a
// session whose day is already picked as a full day is a client-side overlap
// (disabled with a hint — the backend rejects it too). Emits ticket_selection.

export function cartToItems(cart) {
  if (!cart) return []
  if (cart.whole) return [{ kind: 'whole_event' }]
  return [
    ...cart.days.map((id) => ({ kind: 'day', id })),
    ...cart.sessions.map((id) => ({ kind: 'session', id })),
  ]
}

export function emptyCart() {
  return { whole: false, days: [], sessions: [] }
}

// Σ(selected unit prices) — the per-attendee unit total. The endpoint multiplies
// by attendee_count; we mirror that here for the live preview.
export function cartUnitTotal(cart, pricing) {
  if (!cart || !pricing) return 0
  if (cart.whole) return Number(pricing.whole_event?.price || 0)
  let total = 0
  for (const id of cart.days) {
    const d = (pricing.days || []).find((x) => x.day_id === id)
    total += Number(d?.price || 0)
  }
  for (const id of cart.sessions) {
    const s = (pricing.sessions || []).find((x) => x.session_id === id)
    total += Number(s?.price || 0)
  }
  return total
}

export default function TicketCart({ pricing, seats, cart, onChange, error }) {
  const currency = 'SAR'
  const wholeAvailable = !!pricing?.whole_event?.available

  // Priced sessions grouped under their day (day_id links a session to its day).
  const sessionsByDay = useMemo(() => {
    const map = {}
    for (const s of pricing?.sessions || []) {
      if (s.price == null) continue
      ;(map[s.day_id] ||= []).push(s)
    }
    return map
  }, [pricing])

  // A day is shown when it can be bought as a full-day pass OR it holds priced
  // sessions (sessions-only day). Days keep the resource's date order.
  const displayDays = useMemo(
    () => (pricing?.days || []).filter((d) => d.price != null || (sessionsByDay[d.day_id]?.length > 0)),
    [pricing, sessionsByDay],
  )

  const selectedFullDays = new Set(cart.days)

  const toggleWhole = () => {
    if (!wholeAvailable) return
    onChange(cart.whole ? emptyCart() : { whole: true, days: [], sessions: [] })
  }

  const toggleDay = (dayId) => {
    if (cart.whole) return
    const has = cart.days.includes(dayId)
    const days = has ? cart.days.filter((d) => d !== dayId) : [...cart.days, dayId]
    // Dropping a session that belonged to a now-selected full day keeps the cart valid.
    const sessions = has
      ? cart.sessions
      : cart.sessions.filter((sid) => {
          const s = (pricing?.sessions || []).find((x) => x.session_id === sid)
          return !s || s.day_id !== dayId
        })
    onChange({ whole: false, days, sessions })
  }

  const toggleSession = (sessionId, dayId) => {
    if (cart.whole || selectedFullDays.has(dayId)) return
    const has = cart.sessions.includes(sessionId)
    const sessions = has ? cart.sessions.filter((s) => s !== sessionId) : [...cart.sessions, sessionId]
    onChange({ whole: false, days: cart.days, sessions })
  }

  const unitTotal = cartUnitTotal(cart, pricing)
  const count = Math.max(1, Number(seats) || 1)
  const amount = unitTotal * count
  const hasSelection = cart.whole || cart.days.length > 0 || cart.sessions.length > 0

  const priceTag = (v) => {
    const m = money(v, currency)
    return `${m.value} ${m.currency}`
  }

  return (
    <div className="cart">
      <div className="subhead">Tickets · ticket_selection</div>

      {error && <div className="field-err" style={{ marginBottom: 10 }}>{error}</div>}

      {wholeAvailable && (
        <label className={`cart-opt${cart.whole ? ' on' : ''}`}>
          <input type="checkbox" checked={cart.whole} onChange={toggleWhole} />
          <span className="cart-opt-main">
            <span className="cart-opt-title">Whole event</span>
            <span className="cart-opt-sub">access to every day (exclusive)</span>
          </span>
          <span className="cart-opt-price">{priceTag(pricing.whole_event.price)}</span>
        </label>
      )}

      {displayDays.length > 0 && (
        <div className="cart-group">
          <div className="cart-group-label">Per-day &amp; sessions</div>
          {displayDays.map((d) => {
            const daySessions = sessionsByDay[d.day_id] || []
            const dayPriced = d.price != null
            const daySoldOut = !d.available && d.remaining === 0
            const dayDisabled = cart.whole || daySoldOut
            const dayChecked = cart.days.includes(d.day_id)
            return (
              <div className="cart-day" key={d.day_id}>
                {dayPriced ? (
                  <label className={`cart-opt cart-day-head${dayChecked ? ' on' : ''}${dayDisabled ? ' off' : ''}`}>
                    <input type="checkbox" disabled={dayDisabled} checked={dayChecked} onChange={() => toggleDay(d.day_id)} />
                    <span className="cart-opt-main">
                      <span className="cart-opt-title">{d.date}</span>
                      <span className="cart-opt-sub">
                        {daySoldOut ? 'sold out' : `full day${d.remaining != null ? ` · ${d.remaining} left` : ''}`}
                      </span>
                    </span>
                    <span className="cart-opt-price">{priceTag(d.price)}</span>
                  </label>
                ) : (
                  <div className="cart-day-label">
                    <span className="cart-day-date">{d.date}</span>
                    <span className="cart-day-note">sessions only</span>
                  </div>
                )}

                {daySessions.length > 0 && (
                  <div className="cart-day-sessions">
                    {daySessions.map((s) => {
                      const inFullDay = selectedFullDays.has(s.day_id)
                      const soldOut = !s.available
                      const disabled = cart.whole || inFullDay || soldOut
                      const checked = cart.sessions.includes(s.session_id)
                      return (
                        <label key={s.session_id} className={`cart-opt cart-session${checked ? ' on' : ''}${disabled ? ' off' : ''}`}>
                          <input type="checkbox" disabled={disabled} checked={checked} onChange={() => toggleSession(s.session_id, s.day_id)} />
                          <span className="cart-opt-main">
                            <span className="cart-opt-title">{s.title || `Session #${s.session_id}`}</span>
                            <span className="cart-opt-sub">
                              {inFullDay ? 'included in the full day' : soldOut ? 'unavailable' : 'session'}
                            </span>
                          </span>
                          <span className="cart-opt-price">{priceTag(s.price)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="cart-total">
        <span className="cart-total-k">
          {hasSelection ? `${priceTag(unitTotal)} × ${count} seat${count > 1 ? 's' : ''}` : 'No ticket selected — defaults to whole event'}
        </span>
        <span className="cart-total-v">{hasSelection ? priceTag(amount) : (wholeAvailable ? priceTag(Number(pricing.whole_event.price) * count) : '—')}</span>
      </div>
    </div>
  )
}
