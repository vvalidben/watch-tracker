import { Library } from './Library'

export function Watchlist(): JSX.Element {
  return (
    <Library
      initialOptions={{ initialStatus: 'plan_to_watch' }}
      title="Watchlist"
      description="Titles you're planning to watch."
    />
  )
}
