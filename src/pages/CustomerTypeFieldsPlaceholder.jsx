import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'
import { getCustomerType } from '../data/customerTypes'

export default function CustomerTypeFieldsPlaceholder() {
  const navigate = useNavigate()
  const { type } = useParams()
  const customerType = getCustomerType(type)

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings/customer-type')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Field Configuration{customerType ? ` — ${customerType.name}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">System Configuration — Customer Type</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border p-12 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
          <Construction size={22} className="text-brand-blue" />
        </div>
        <p className="text-base font-semibold text-gray-800">Coming soon</p>
        <p className="text-sm text-gray-500 max-w-md">
          Field Configuration for {customerType?.name ?? 'this customer type'} is being built in a later session.
        </p>
      </div>
    </div>
  )
}
