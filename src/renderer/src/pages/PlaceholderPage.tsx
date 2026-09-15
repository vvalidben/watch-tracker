interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? 'This feature will be implemented in an upcoming sprint.'}
      </p>
    </div>
  )
}
