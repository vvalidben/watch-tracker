import * as React from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  size?: 'default' | 'lg'
  className?: string
}

/** The shared search-input shell (icon + clear button) used by the Search and Library pages. */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange, placeholder, autoFocus, size = 'default', className },
  ref
) {
  const isLarge = size === 'lg'

  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
          isLarge ? 'left-4 h-5 w-5' : 'left-3 h-4 w-4'
        )}
      />
      <Input
        ref={ref}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(isLarge ? 'h-12 rounded-xl pl-11 pr-10 text-base shadow-sm' : 'pl-9 pr-8')}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            isLarge ? 'right-3' : 'right-2'
          )}
        >
          <X className={isLarge ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </button>
      )}
    </div>
  )
})
