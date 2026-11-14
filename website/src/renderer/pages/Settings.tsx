import { useState } from 'react'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { ApiConfigCard } from '@renderer/components/settings/ApiConfigCard'
import { BackupCard } from '@renderer/components/settings/BackupCard'
import { DatabaseInfoCard } from '@renderer/components/settings/DatabaseInfoCard'
import { AboutCard } from '@renderer/components/settings/AboutCard'
import { setRatingPrecision, useRatingPrecision } from '@renderer/lib/ratingPrecision'
import { setJapaneseLabels, useJapaneseLabels } from '@renderer/lib/japaneseLabels'
import { useVisualStyle } from '@renderer/lib/visualStyle'
import { cn } from '@renderer/lib/utils'
import { AutomaticBackupsCard } from '@renderer/components/settings/AutomaticBackupsCard'
import { CsvImportCard } from '@renderer/components/settings/CsvImportCard'
import { LibraryMetadataCard } from '@renderer/components/settings/LibraryMetadataCard'
import { AccountCard } from '@renderer/components/settings/AccountCard'
import { AppearanceCard } from '@renderer/components/settings/AppearanceCard'
import { CloudDataCard } from '@renderer/components/settings/CloudDataCard'
import { WebFeaturesCard } from '@renderer/components/settings/WebFeaturesCard'

interface OptionRowProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

function OptionRow<T extends string>({ label, value, options, onChange }: OptionRowProps<T>): JSX.Element {
  return (
    <div className="wt-stack" style={{ gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wt-muted)' }}>{label}</span>
      <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={cn('wt-pill', value === option.value && 'is-on')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Settings(): JSX.Element {
  const style = useVisualStyle()
  const precision = useRatingPrecision()
  const japaneseLabels = useJapaneseLabels()
  const [libraryRevision, setLibraryRevision] = useState(0)

  return (
    <section className="wt-stack" style={{ gap: 22, maxWidth: 880 }}>
      <PageTitle number="07" jp="設定" title="Settings" />

      <AppearanceCard />
      <div className="wt-panel wt-stack wt-rise" style={{ padding: 24, gap: 18, animationDelay: '60ms' }}>
        <h2 className="wt-h3">Display preferences</h2>
        <OptionRow
          label="Rating precision"
          value={precision}
          options={[
            { value: 'whole', label: 'Whole stars' },
            { value: 'half', label: 'Half stars' }
          ]}
          onChange={setRatingPrecision}
        />
        {style === 'neon' && <OptionRow
          label="Japanese labels"
          value={japaneseLabels}
          options={[
            { value: 'shown', label: 'Shown' },
            { value: 'hidden', label: 'Hidden' }
          ]}
          onChange={setJapaneseLabels}
        />}
      </div>

      <ApiConfigCard />
      <AccountCard />
      <WebFeaturesCard />
      <BackupCard />
      <AutomaticBackupsCard key={`backups-${libraryRevision}`} />
      <LibraryMetadataCard />
      <CsvImportCard onImported={() => setLibraryRevision((revision) => revision + 1)} />
      <DatabaseInfoCard key={`database-${libraryRevision}`} />
      <CloudDataCard />
      <AboutCard />
    </section>
  )
}
