/** "0h" for nothing watched, "45m" under an hour, "128h" (rounded) otherwise. */
export function formatWatchTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0h'
  if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`
  return `${Math.round(totalMinutes / 60)}h`
}
