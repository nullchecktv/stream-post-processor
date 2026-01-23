import type { BrandingConfig } from '../../types'

interface BrandingPreviewProps {
  branding: BrandingConfig
}

export function BrandingPreview({ branding }: BrandingPreviewProps) {
  const fontFamily = `"${branding.fontFamily}", system-ui`
  const isPressStart = branding.fontFamily === 'Press Start 2P'

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Preview</h3>
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          backgroundColor: branding.colors.primary,
          padding: '10px',
          aspectRatio: '16/9',
        }}
      >
        <div
          className="h-full rounded flex flex-col items-center justify-center p-6"
          style={{
            backgroundColor: branding.colors.background,
          }}
        >
          <p
            className={`text-center mb-3 ${isPressStart ? 'text-sm' : 'text-lg'}`}
            style={{
              color: branding.colors.text,
              fontFamily,
              fontWeight: isPressStart ? 400 : 700,
            }}
          >
            "This is a sample quote that demonstrates your branding"
          </p>
          <p
            className={`text-center ${isPressStart ? 'text-xs' : 'text-sm'}`}
            style={{
              color: branding.colors.secondary,
              fontFamily,
              fontWeight: 400,
            }}
          >
            — Speaker Name
          </p>
          <p
            className={`text-center mt-2 opacity-70 ${isPressStart ? 'text-[10px]' : 'text-xs'}`}
            style={{
              color: branding.colors.text,
              fontFamily,
              fontWeight: 400,
            }}
          >
            Episode Title
          </p>
        </div>
      </div>
    </div>
  )
}
