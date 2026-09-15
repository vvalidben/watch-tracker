import { Library } from './Library'

export function Completed(): JSX.Element {
  return (
    <Library
      initialOptions={{ initialStatus: 'completed' }}
      title="Completed"
      description="Everything you've finished watching."
    />
  )
}
