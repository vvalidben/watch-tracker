import { Library } from './Library'

export function Watching(): JSX.Element {
  return (
    <Library
      initialOptions={{ initialStatus: 'watching' }}
      title="Watching"
      description="Titles currently in progress."
    />
  )
}
