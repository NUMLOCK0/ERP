const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/

export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'

  if (typeof value === 'string') {
    const match = value.match(DATE_TIME_PATTERN)
    if (match && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
      return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`
    }
  }

  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return String(value)

  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
