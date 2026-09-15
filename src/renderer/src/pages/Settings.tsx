import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { PageHeader } from '@renderer/components/layout/PageHeader'
import { ThemePicker } from '@renderer/components/settings/ThemePicker'
import { RatingPrecisionToggle } from '@renderer/components/settings/RatingPrecisionToggle'
import { ApiConfigCard } from '@renderer/components/settings/ApiConfigCard'
import { BackupCard } from '@renderer/components/settings/BackupCard'
import { DatabaseInfoCard } from '@renderer/components/settings/DatabaseInfoCard'
import { AboutCard } from '@renderer/components/settings/AboutCard'

export function Settings(): JSX.Element {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Appearance, data sources, and backups for your library."
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how Watch Tracker looks on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePicker />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating Scale</CardTitle>
            <CardDescription>Switch between whole-number and half-point ratings everywhere.</CardDescription>
          </CardHeader>
          <CardContent>
            <RatingPrecisionToggle />
          </CardContent>
        </Card>

        <ApiConfigCard />
        <BackupCard />
        <DatabaseInfoCard />
        <AboutCard />
      </div>
    </div>
  )
}
