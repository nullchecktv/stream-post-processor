interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}

export function ColorPicker({ label, value, onChange, disabled, error }: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-20 rounded border border-[var(--color-border)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)]"
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-[var(--color-error)]">{error}</p>
      )}
    </div>
  )
}
