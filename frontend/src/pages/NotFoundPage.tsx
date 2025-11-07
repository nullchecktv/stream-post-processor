import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

function NotFoundPage() {
  usePageTitle('Page Not Found')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold text-gray-900 mt-4 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Home size={20} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
