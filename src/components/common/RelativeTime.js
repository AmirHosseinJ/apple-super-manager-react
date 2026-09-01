import React from 'react'
import PropTypes from 'prop-types'

const UNITS = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
  ['second', 1000],
]

export const formatRelative = (value) => {
  if (!value) return ''
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return ''

  const delta = timestamp - Date.now()
  const absolute = Math.abs(delta)
  if (absolute < 5000) return 'just now'

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const [unit, size] = UNITS.find(([, unitSize]) => absolute >= unitSize) || UNITS[UNITS.length - 1]
  return formatter.format(Math.round(delta / size), unit)
}

export const formatAbsolute = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

/** Shows a relative timestamp with the exact value available on hover. */
const RelativeTime = ({ value, placeholder = '—' }) => {
  if (!value) return <span className="text-body-secondary">{placeholder}</span>

  const relative = formatRelative(value)
  if (!relative) return <span className="text-body-secondary">{placeholder}</span>

  return (
    <span title={formatAbsolute(value)} className="text-nowrap">
      {relative}
    </span>
  )
}

RelativeTime.propTypes = {
  value: PropTypes.string,
  placeholder: PropTypes.string,
}

export default RelativeTime
