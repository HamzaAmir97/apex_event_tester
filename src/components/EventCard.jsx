import { useNavigate } from 'react-router-dom'
import { formatDateRange, money } from '../format.js'

export default function EventCard({ event }) {
  const navigate = useNavigate()
  const isPaid = event.pricing_mode === 'paid'
  const price = money(event.ticket_price, 'SAR')

  const go = () => navigate(`/events/${event.id}`)

  return (
    <article
      className="card"
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go())}
    >
      <div className="card-cover">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt="" loading="lazy" />
        ) : (
          <div className="card-cover-fallback">event #{event.id}</div>
        )}
        <div className="card-badges">
          <span className={`badge ${isPaid ? 'paid' : 'free'}`}>{isPaid ? 'PAID' : 'FREE'}</span>
          {event.is_sold_out ? (
            <span className="badge soldout"><span className="dot" />SOLD OUT</span>
          ) : event.booking_open ? (
            <span className="badge open"><span className="dot" />OPEN</span>
          ) : (
            <span className="badge closed">CLOSED</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <h3 className="card-title">{event.title}</h3>

        <div className="card-meta">
          <div className="row"><span className="k">when</span>{formatDateRange(event.first_date, event.last_date)}</div>
          {event.location && <div className="row"><span className="k">where</span>{event.location}</div>}
        </div>

        <div className="card-foot">
          {isPaid ? (
            <span className="price">{price.value}<span className="cur">{price.currency}</span></span>
          ) : (
            <span className="price free">Free entry</span>
          )}
          <span className="badge plain">open →</span>
        </div>
      </div>
    </article>
  )
}
