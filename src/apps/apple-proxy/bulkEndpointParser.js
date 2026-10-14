const PLACEHOLDER_TO_FIELD = {
  protocol: 'scheme',
  login: 'username',
  password: 'password',
  hostname: 'host',
  port: 'port',
}

const PLACEHOLDER_PATTERN = new RegExp(
  `\\b(${Object.keys(PLACEHOLDER_TO_FIELD).join('|')})\\b`,
  'g',
)
const REQUIRED_FIELDS = ['scheme', 'host', 'port']
const SUPPORTED_SCHEMES = ['http', 'https', 'socks5']

const decodeValue = (value) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildExtractor = (format) => {
  const value = String(format || '').trim()
  if (!value) return { error: 'Enter a format containing named placeholders.' }

  const matches = [...value.matchAll(PLACEHOLDER_PATTERN)]
  if (!matches.length) {
    return { error: 'Use placeholders such as protocol, hostname, and port in the format.' }
  }

  const fields = matches.map((match) => PLACEHOLDER_TO_FIELD[match[1]])
  const duplicatedField = fields.find((field, index) => fields.indexOf(field) !== index)
  if (duplicatedField) return { error: `The ${duplicatedField} placeholder can be used only once.` }

  const missingField = REQUIRED_FIELDS.find((field) => !fields.includes(field))
  if (missingField) return { error: `The format must include a ${missingField} placeholder.` }

  let pattern = '^'
  let cursor = 0
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const literal = value.slice(cursor, match.index)
    if (!literal && index > 0) {
      return { error: 'Placeholders must be separated by a literal character.' }
    }
    pattern += escapeRegex(literal)
    pattern += `(?<${PLACEHOLDER_TO_FIELD[match[1]]}>.*?)`
    cursor = match.index + match[0].length
  }
  pattern += escapeRegex(value.slice(cursor))
  pattern += '$'

  try {
    return { expression: new RegExp(pattern) }
  } catch {
    return { error: 'The format could not be read. Check its placeholders and separators.' }
  }
}

const parseLine = (line, expression) => {
  const match = expression.exec(line)
  if (!match?.groups) return { error: 'Does not match the supplied format.' }

  const endpoint = Object.fromEntries(
    Object.entries(match.groups).map(([field, value]) => [field, decodeValue(value).trim()]),
  )
  endpoint.port = Number(endpoint.port)

  if (!endpoint.host) return { error: 'Hostname is required.' }
  if (!SUPPORTED_SCHEMES.includes(endpoint.scheme.toLowerCase())) {
    return { error: `Unsupported protocol: ${endpoint.scheme || 'empty'}.` }
  }
  if (!Number.isInteger(endpoint.port) || endpoint.port < 1 || endpoint.port > 65535) {
    return { error: 'Port must be an integer between 1 and 65535.' }
  }

  return {
    endpoint: {
      scheme: endpoint.scheme.toLowerCase(),
      host: endpoint.host,
      port: endpoint.port,
      username: endpoint.username || '',
      ...(endpoint.password ? { password: endpoint.password } : {}),
    },
  }
}

export const parseBulkEndpoints = (format, bulkData) => {
  const extractor = buildExtractor(format)
  if (extractor.error) return { formatError: extractor.error, rows: [], endpoints: [] }

  const rows = String(bulkData || '')
    .split(/\r?\n/)
    .map((value, index) => ({ line: index + 1, value: value.trim() }))
    .filter(({ value }) => value)
    .map(({ line, value }) => {
      const parsed = parseLine(value, extractor.expression)
      return { line, ...parsed }
    })

  return {
    formatError: null,
    rows,
    endpoints: rows.filter((row) => row.endpoint).map((row) => row.endpoint),
  }
}
