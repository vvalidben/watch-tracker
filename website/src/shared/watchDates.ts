export function validateWatchDate(value: string, now = Date.now()): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Choose a valid ISO watch date, including a timezone for times')
  if (new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error('Choose a valid calendar date')
  const date = new Date(value)
  if (date.getTime() > now + 60_000) throw new Error('A watch date cannot be in the future')
  return date.toISOString()
}
