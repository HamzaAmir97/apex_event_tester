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
  const pricedDays = useMemo(() => (pricing?.days || []).filter((d) => d.price != null), [pricing])
  const pricedSessions = useMemo(() => (pricing?.sessions || []).filter((s) => s.price != null), [pricing])

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
          const s = pricedSessions.find((x) => x.session_id === sid)
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

      {pricedDays.length > 0 && (
        <div className="cart-group">
          <div className="cart-group-label">Day passes</div>
          {pricedDays.map((d) => {
            const soldOut = !d.available && (d.remaining === 0)
            const disabled = cart.whole || soldOut
            return (
              <label key={d.day_id} className={`cart-opt${cart.days.includes(d.day_id) ? ' on' : ''}${disabled ? ' off' : ''}`}>
                <input type="checkbox" disabled={disabled} checked={cart.days.includes(d.day_id)} onChange={() => toggleDay(d.day_id)} />
                <span className="cart-opt-main">
                  <span className="cart-opt-title">{d.date}</span>
                  <span className="cart-opt-sub">
                    {soldOut ? 'sold out' : d.remaining != null ? `${d.remaining} left` : 'available'}
                  </span>
                </span>
                <span className="cart-opt-price">{priceTag(d.price)}</span>
              </label>
            )
          })}
        </div>
      )}

      {pricedSessions.length > 0 && (
        <div className="cart-group">
          <div className="cart-group-label">Sessions</div>
          {pricedSessions.map((s) => {
            const inFullDay = selectedFullDays.has(s.day_id)
            const soldOut = !s.available
            const disabled = cart.whole || inFullDay || soldOut
            return (
              <label key={s.session_id} className={`cart-opt${cart.sessions.includes(s.session_id) ? ' on' : ''}${disabled ? ' off' : ''}`}>
                <input type="checkbox" disabled={disabled} checked={cart.sessions.includes(s.session_id)} onChange={() => toggleSession(s.session_id, s.day_id)} />
                <span className="cart-opt-main">
                  <span className="cart-opt-title">{s.title || `Session #${s.session_id}`}</span>
                  <span className="cart-opt-sub">
                    {inFullDay ? 'included in the selected day' : soldOut ? 'unavailable' : `day ${s.day_id}`}
                  </span>
                </span>
                <span className="cart-opt-price">{priceTag(s.price)}</span>
              </label>
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
