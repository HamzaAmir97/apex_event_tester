import { Fragment } from 'react'
import { money } from '../format.js'

// result = { ok, status, body }
export default function ResultPanel({ result, onReset }) {
  const { status, body } = result
  const data = body?.data || {}
  const success = status === 201 && body?.success
  const isPaid = success && data.status === 'pending_payment'
  const isFree = success && data.status === 'confirmed'
  const paymentUrl = data.payment_url

  const tone = success ? (isPaid ? 'pend' : 'ok') : 'bad'
  const amount = money(data.amount_due ?? data.amount, data.currency || 'SAR')

  const openPay = () => paymentUrl && window.open(paymentUrl, '_blank', 'noopener,noreferrer')

  return (
    <div className={`result ${tone}`}>
      <div className="result-title">
        {success ? (
          <span className={`badge ${data.status}`}><span className="dot" />{data.status}</span>
        ) : (
          <span className="badge soldout"><span className="dot" />HTTP {status || 'ERR'}</span>
        )}
        <span>{body?.message || (success ? 'Registered' : 'Registration failed')}</span>
      </div>

      {success && (
        <div className="kv">
          <span className="k">booking_id</span><span className="v">{data.booking_id ?? '—'}</span>
          <span className="k">status</span><span className="v">{data.status}</span>
          {data.payment_status && (<><span className="k">payment</span><span className="v">{data.payment_status}</span></>)}
          <span className="k">amount</span><span className="v">{amount === '—' ? '—' : `${amount.value} ${amount.currency}`}</span>
          {data.provider_reference && (<><span className="k">provider_ref</span><span className="v">{data.provider_reference}</span></>)}
        </div>
      )}

      {isFree && (
        <p className="pay-note">
          Confirmed instantly. A QR was issued and a confirmation email was queued
          (check the mail log / Mailtrap, or <code>storage/logs</code> with the <code>log</code> mailer).
        </p>
      )}

      {isPaid && paymentUrl && (
        <>
          <button className="btn btn-primary" onClick={openPay}>Open HyperPay payment page ↗</button>
          <div className="kv"><span className="k">payment_url</span><span className="v">{paymentUrl}</span></div>
          <p className="pay-note">
            Opens the real HyperPay widget (the same <code>/pay/{'{'}token{'}'}</code> page as membership/booking;
            the checkout is minted there from your Settings → Payments credentials). Pay to see the booking
            flip to <strong>confirmed</strong>, a QR issued, and the confirmation email queued. The seat is held until then.
            If Payments isn’t configured on the backend, the widget won’t load.
          </p>
        </>
      )}

      {!success && body?.errors && (
        <div className="kv">
          {Object.entries(body.errors).map(([k, v]) => (
            <><span className="k" key={k}>{k}</span><span className="v">{Array.isArray(v) ? v.join(' ') : String(v)}</span></>
          ))}
        </div>
      )}

      <details className="raw">
        <summary>raw response · HTTP {status}</summary>
        <pre>{JSON.stringify(body, null, 2)}</pre>
      </details>

      <button className="link-btn" onClick={onReset}>← run another registration</button>
    </div>
  )
}
