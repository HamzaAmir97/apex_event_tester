# APEX · Events API Tester

A small React (Vite) harness to exercise the **public Events API** end to end, as a
friendlier alternative to Swagger. Browse events → open one → submit a registration →
watch what the API returns (confirmation for free, a HyperPay `payment_url` for paid).

> Internal QA tool. English UI. Not shipped to end users.

## What it covers

| Screen | Endpoint |
| --- | --- |
| Events list (cards, `upcoming / past / all` filter, search, pagination) | `GET /api/public/events` |
| Event detail (schedule, capacity, dynamic form) | `GET /api/public/events/{id}` |
| Registration (booker, seats/attendees, `registration_form_schema` fields) | `POST /api/public/events/{id}/registrations` |

For **free** events it shows the confirmed booking; for **paid** events it opens the
`payment_url` (HyperPay widget) in a new tab and reports the held `pending_payment` seat.
Every result includes the raw JSON response for verification.

## Choosing the backend

The header has a **backend** dropdown:

- **Production** (default) → `https://csms-apex.brackets-tech.com`
- **Local** → `http://localhost:8000` (run `php artisan serve` in `csms-backend`)
- **Custom…** → any base URL you type

The choice is remembered in the browser. The default is **Production** so a published
build works out of the box. Override the production default at build time with
`VITE_API_BASE_URL` (see `.env.example`).

The app calls the backend by **absolute URL** (no dev proxy), so it behaves the same in
`npm run dev` and when deployed.

### CORS
Because the app calls the backend cross-origin, the backend's `config/cors.php` must
allow this app's origin.
- Local backend already allows `localhost:*` via pattern, so **Local** works immediately.
- To use **Production** from a published frontend domain, add that domain to the
  production backend's `allowed_origins` (or `allowed_origins_patterns`).

## Run

```bash
cd events-tester
npm install
npm run dev          # http://localhost:5173
```

Build for hosting:

```bash
npm run build        # outputs dist/
npm run preview      # serve the build locally
```

## Suggested test scenarios

1. **Browse** — toggle Upcoming / Past / All, search a title, page through results.
   Confirm sold-out and closed events are flagged, and the counts match.
2. **Free registration** — open a free, booking-open event, fill the form, submit.
   Expect `201 confirmed`, `amount_due: 0`. A confirmation email is queued (check your
   mail log / Mailtrap).
3. **Paid registration** — open a paid event, submit. Expect `201 pending_payment` with a
   `payment_url`; click **Open HyperPay payment page**. If HyperPay isn't configured the
   link is a mock placeholder (the UI says so) and the seat is still held.
4. **Validation** — submit with a required `form_answers` field empty, or a bad email:
   expect `422` with field errors mapped back onto the inputs.
5. **Capacity / closed** — try a sold-out or past-deadline event: submit to see the `4xx`.
6. **Seats vs attendees** — set Seats to 3 with no named attendees, or add named
   attendees: the API derives `attendee_count` from the attendees list when present.

## Notes / possible flow improvements

- **Return-from-payment status.** After paying, there's no public endpoint to poll the
  registration status by reference, so the tester can't auto-refresh to `confirmed`. A
  `GET /public/events/registrations/{ref}` (in the plan, not built) would let the site
  show "payment received" without waiting for the email. Worth adding.
- **Email visibility.** Confirmation is queued, not shown in-app. For QA, point the mailer
  at Mailtrap or the `log` driver and read `storage/logs/laravel.log`.
- **Idempotency.** Submitting the same email twice for the same event within the window
  returns the same booking (free) / same hold (paid). Try it, the `booking_id` repeats.
