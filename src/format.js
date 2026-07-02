const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

export function formatDateRange(first, last) {
  const a = parseDate(first)
  const b = parseDate(last)
  if (!a) return 'Dates TBA'
  if (!b || (a.y === b.y && a.m === b.m && a.d === b.d)) {
    return `${MONTHS[a.m - 1]} ${a.d}, ${a.y}`
  }
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m - 1]} ${a.d}–${b.d}, ${a.y}`
  if (a.y === b.y) return `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}, ${a.y}`
  return `${MONTHS[a.m - 1]} ${a.d}, ${a.y} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`
}

export function money(amount, currency = 'SAR') {
  if (amount === null || amount === undefined) return '—'
  const n = Number(amount)
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return { value: s, currency }
}
