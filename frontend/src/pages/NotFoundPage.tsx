import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

function NotFoundPage() {
  usePageTitle('Page Not Found')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-[var(--color-accent)]">404</h1>
          <h2 className="font-[family-name:var(--font-editorial)] text-3xl font-semibold text-[var(--color-text-primary)] mt-4 mb-2">
            Page Not Found
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-[var(--duration-fast)]"
          >
            <Home size={20} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
