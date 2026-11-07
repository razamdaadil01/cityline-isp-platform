import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <span className="text-7xl font-bold text-gray-200 dark:text-gray-700 select-none">404</span>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Page not found</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <Home size={16} />
        Go to Dashboard
      </Link>
    </div>
  )
}
