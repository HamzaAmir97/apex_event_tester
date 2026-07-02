import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvent, registerForEvent } from '../api.js'
import { formatDateRange, money } from '../format.js'
import DynamicField from '../components/DynamicField.jsx'
import ResultPanel from '../components/ResultPanel.jsx'
import TicketCart, { cartToItems, emptyCart } from '../components/TicketCart.jsx'

function EventSpec({ event }) {
  const price = money(event.ticket_price, 'SAR')
  const unlimited = event.is_unlimited_capacity || event.capacity_limit === null
  const limit = event.capacity_limit
  const remaining = event.remaining_capacity
  const used = !unlimited && limit != null && remaining != null ? Math.max(0, limit - remaining) : null
  const pct = used != null && limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <div className="spec">
      <div className="spec-row"><span className="k">Pricing</span><span className="v">{event.pricing_mode === 'paid' ? `${price.value} ${price.currency} / ticket` : 'Free'}</span></div>
      <div className="spec-row"><span className="k">When</span><span className="v">{formatDateRange(event.first_date, event.last_date)}</span></div>
      {event.location && <div className="spec-row"><span className="k">Where</span><span className="v">{event.location}</span></div>}
      <div className="spec-row">
        <span className="k">Capacity</span>
        <span className="v">
          {unlimited ? 'Unlimited' : `${remaining ?? '—'} of ${limit} left`}
          {!unlimited && limit ? (
            <div className="cap-bar"><div className={`cap-fill${pct >= 100 ? ' full' : ''}`} style={{ width: `${pct}%` }} /></div>
          ) : null}
        </span>
      </div>
      <div className="spec-row"><span className="k">Registration</span><span className="v">{event.registration_mode || '—'}</span></div>
      {event.booking_deadline_at && (
        <div className="spec-row"><span className="k">Deadline</span><span className="v mono">{event.booking_deadline_at}</span></div>
      )}
    </div>
  )
}

function Schedule({ days }) {
  if (!Array.isArray(days) || days.length === 0) return null
  return (
    <div className="days">
      <div className="subhead">Schedule</div>
      {days.map((d, i) => (
        <div className="day" key={i}>
          <div className="day-date">{d.event_date}</div>
          {(d.start_time || d.end_time) && <div className="day-time">{d.start_time ?? '—'} – {d.end_time ?? '—'}</div>}
          {Array.isArray(d.sessions) && d.sessions.length > 0 && (
            <div className="day-sessions">
              {d.sessions.map((s, j) => (
                <div className="day-session" key={j}><span className="t">{s.start_time}–{s.end_time}</span>{s.title}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function DetailPage() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [load, setLoad] = useState('loading') // loading | ready | error
  const [loadErr, setLoadErr] = useState(null)

  // form state
  const [booker, setBooker] = useState({ name: '', email: '', mobile: '' })
  const [seats, setSeats] = useState(1)
  const [cart, setCart] = useState(emptyCart()) // flexible ticket_selection (032)
  const [attendees, setAttendees] = useState([]) // named extra attendees
  const [answers, setAnswers] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let alive = true
    setLoad('loading')
    getEvent(id).then((r) => {
      if (!alive) return
      if (r.status === 0) { setLoad('error'); setLoadErr('Cannot reach the backend.') }
      else if (r.status === 404) { setLoad('error'); setLoadErr('404 — event not available (draft/hidden/cancelled or non-public).') }
      else if (!r.ok || !r.body?.success) { setLoad('error'); setLoadErr(r.body?.message || `Failed (${r.status}).`) }
      else { setEvent(r.body.data); setLoad('ready') }
    })
    return () => { alive = false }
  }, [id])

  const schemaFields = useMemo(() => {
    const f = event?.registration_form_schema?.fields
    return Array.isArray(f) ? f : []
  }, [event])

  const setAnswer = (fid, val) => setAnswers((a) => ({ ...a, [fid]: val }))

  const addAttendee = () => setAttendees((a) => [...a, { name: '', email: '', mobile: '' }])
  const removeAttendee = (i) => setAttendees((a) => a.filter((_, idx) => idx !== i))
  const setAttendee = (i, key, val) => setAttendees((a) => a.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)))

  const clientValidate = () => {
    const errs = {}
    if (!booker.name.trim()) errs['name'] = 'Name is required.'
    if (!booker.email.trim()) errs['email'] = 'Email is required.'
    for (const f of schemaFields) {
      if (f.required) {
        const v = answers[f.id]
        const empty = v === undefined || v === null || v === '' || v === false
        if (empty) errs[`form_answers.${f.id}`] = `${f.label || f.id} is required.`
      }
    }
    attendees.forEach((a, i) => { if (!a.name.trim()) errs[`attendees.${i}.name`] = 'Name required.' })
    return errs
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = clientValidate()
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    const payload = {
      name: booker.name,
      email: booker.email,
      ...(booker.mobile.trim() ? { mobile: booker.mobile } : {}),
    }
    if (schemaFields.length) payload.form_answers = answers

    // Flexible ticketing (032): send the cart only when the visitor picked units.
    // An empty cart is omitted so the backend keeps its whole-event default
    // (backward compatible with the 031 flow).
    if (isPaid) {
      const items = cartToItems(cart)
      if (items.length > 0) payload.ticket_selection = { items }
    }

    if (attendees.length > 0) {
      payload.attendees = attendees.map((a) => ({
        name: a.name,
        ...(a.email.trim() ? { email: a.email } : {}),
        ...(a.mobile.trim() ? { mobile: a.mobile } : {}),
      }))
    } else {
      payload.attendee_count = Math.max(1, Number(seats) || 1)
    }

    setSubmitting(true)
    const r = await registerForEvent(id, payload)
    setSubmitting(false)
    setResult(r)

    // map server-side validation errors back onto fields
    if (r.status === 422 && r.body?.errors) {
      setFieldErrors(r.body.errors && typeof r.body.errors === 'object'
        ? Object.fromEntries(Object.entries(r.body.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
        : {})
    }
  }

  const resetForm = () => { setResult(null); setFieldErrors({}); setCart(emptyCart()) }

  if (load === 'loading') return <div className="state"><span className="eyebrow">Loading</span><h3>Fetching event…</h3></div>
  if (load === 'error') return (
    <div className="state error">
      <span className="eyebrow">Not available</span>
      <h3>Couldn’t open this event</h3>
      <p>{loadErr}</p>
      <p style={{ marginTop: 14 }}><Link className="link-btn" to="/">← back to events</Link></p>
    </div>
  )

  const isPaid = event.pricing_mode === 'paid'

  return (
    <div>
      <Link to="/" className="back">← all events</Link>

      <div className="detail">
        {/* Left: event info */}
        <div className="event-head">
          <div className="event-chips">
            <span className={`badge ${isPaid ? 'paid' : 'free'}`}>{isPaid ? 'PAID' : 'FREE'}</span>
            {event.is_sold_out
              ? <span className="badge soldout"><span className="dot" />SOLD OUT</span>
              : event.booking_open
                ? <span className="badge open"><span className="dot" />BOOKING OPEN</span>
                : <span className="badge closed">BOOKING CLOSED</span>}
            <span className="badge plain">#{event.id}</span>
          </div>

          <h1>{event.title}</h1>

          {event.cover_image_url && (
            <div className="event-cover"><img src={event.cover_image_url} alt="" /></div>
          )}
          {event.description && <p className="event-desc" style={{ marginTop: 14 }}>{event.description}</p>}

          <EventSpec event={event} />
          <Schedule days={event.days} />
        </div>

        {/* Right: registration form */}
        <div className="panel">
          <div className="panel-head">
            <h2>Register</h2>
            <p><code>POST /public/events/{event.id}/registrations</code></p>
          </div>

          {!result ? (
            <form className="panel-body" onSubmit={submit} noValidate>
              {!event.booking_open && (
                <div className="callout">Booking is closed for this event (sold out, past deadline, or contact-only). Submit anyway to see the API’s 4xx response.</div>
              )}

              <div className="field">
                <label htmlFor="name">Full name <span className="req">*</span></label>
                <input id="name" className={`input${fieldErrors['name'] ? ' err' : ''}`} value={booker.name}
                  onChange={(e) => setBooker({ ...booker, name: e.target.value })} placeholder="Ahmed Al-Otaibi" />
                {fieldErrors['name'] && <span className="field-err">{fieldErrors['name']}</span>}
              </div>

              <div className="field">
                <label htmlFor="email">Email <span className="req">*</span></label>
                <input id="email" type="email" className={`input${fieldErrors['email'] ? ' err' : ''}`} value={booker.email}
                  onChange={(e) => setBooker({ ...booker, email: e.target.value })} placeholder="ahmed@example.com" />
                {fieldErrors['email'] && <span className="field-err">{fieldErrors['email']}</span>}
              </div>

              <div className="field">
                <label htmlFor="mobile">Mobile <span className="hint">optional</span></label>
                <input id="mobile" className="input" value={booker.mobile}
                  onChange={(e) => setBooker({ ...booker, mobile: e.target.value })} placeholder="+9665…" />
              </div>

              {/* Seats / attendees */}
              {attendees.length === 0 && (
                <div className="field">
                  <label htmlFor="seats">Seats <span className="hint">attendee_count</span></label>
                  <input id="seats" className={`input${fieldErrors['attendee_count'] ? ' err' : ''}`} type="number" min="1" value={seats}
                    onChange={(e) => setSeats(e.target.value)} style={{ maxWidth: 120 }} />
                  {fieldErrors['attendee_count'] && <span className="field-err">{fieldErrors['attendee_count']}</span>}
                </div>
              )}

              {/* Flexible ticket cart (032) — paid events with a pricing block */}
              {isPaid && event.pricing && (
                <div className="field">
                  <TicketCart
                    pricing={event.pricing}
                    seats={attendees.length > 0 ? attendees.length : seats}
                    cart={cart}
                    onChange={setCart}
                    error={fieldErrors['ticket_selection']}
                  />
                </div>
              )}

              <div className="field">
                <div className="subhead">Named attendees {attendees.length > 0 && `· ${attendees.length} (overrides seats)`}</div>
                {attendees.map((a, i) => (
                  <div className="attendee-row" key={i}>
                    <input className={`input${fieldErrors[`attendees.${i}.name`] ? ' err' : ''}`} placeholder={`Attendee ${i + 1} name`}
                      value={a.name} onChange={(e) => setAttendee(i, 'name', e.target.value)} />
                    <input className="input" placeholder="email (optional)" value={a.email} onChange={(e) => setAttendee(i, 'email', e.target.value)} />
                    <button type="button" className="icon-btn" title="remove" onClick={() => removeAttendee(i)}>×</button>
                  </div>
                ))}
                <button type="button" className="link-btn" onClick={addAttendee}>+ add named attendee</button>
              </div>

              {/* Dynamic schema fields */}
              {schemaFields.length > 0 && (
                <>
                  <div className="subhead">Registration form · registration_form_schema</div>
                  {schemaFields.map((f) => (
                    <DynamicField key={f.id} field={f} value={answers[f.id]}
                      error={fieldErrors[`form_answers.${f.id}`]} onChange={(v) => setAnswer(f.id, v)} />
                  ))}
                </>
              )}

              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Submitting…</> : isPaid ? 'Register & get payment link' : 'Register'}
              </button>
            </form>
          ) : (
            <ResultPanel result={result} onReset={resetForm} />
          )}
        </div>
      </div>
    </div>
  )
}
