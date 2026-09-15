import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useTheme, type ThemePreference } from '@renderer/lib/theme'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
]

/** Light / Dark / System — applied instantly, no restart needed. */
export function ThemePicker(): JSX.Element {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={theme === option.value ? 'default' : 'outline'}
          role="radio"
          aria-checked={theme === option.value}
          className="gap-1.5"
          onClick={() => setTheme(option.value)}
        >
          <option.icon className="h-4 w-4" />
          {option.label}
        </Button>
      ))}
    </div>
  )
}
