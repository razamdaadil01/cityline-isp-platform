import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'

export default function IntercomCustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/intercom/customers')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Intercom Customer</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{id}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-surface-border shadow-card py-20 text-center">
        <Construction size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Coming Soon</p>
        <p className="text-xs text-gray-400 mt-1">Full customer detail view is under construction.</p>
      </div>
    </div>
  )
}
