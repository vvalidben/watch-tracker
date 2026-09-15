import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import type { NormalizedSeason } from '@shared/metadata'

interface SeasonTabsProps {
  seasons: NormalizedSeason[]
  selected: number | null
  onSelect: (seasonNumber: number) => void
}

export function SeasonTabs({ seasons, selected, onSelect }: SeasonTabsProps): JSX.Element {
  return (
    <Tabs value={selected !== null ? String(selected) : undefined} onValueChange={(value) => onSelect(Number(value))}>
      <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
        {seasons.map((season) => (
          <TabsTrigger key={season.seasonNumber} value={String(season.seasonNumber)} className="px-3 py-1.5">
            {season.title || (season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
