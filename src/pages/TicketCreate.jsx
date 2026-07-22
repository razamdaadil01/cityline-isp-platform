import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Ticket } from 'lucide-react'
import Button from '../components/ui/Button'

export default function TicketCreate() {
  const navigate = useNavigate()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/tickets')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Ticket</h1>
          <p className="text-sm text-gray-500 mt-0.5">Raise a new support ticket</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-border shadow-card p-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
          <Ticket size={24} />
        </div>
        <h2 className="text-base font-bold text-gray-800">Coming Soon</h2>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
          The Create Ticket flow is under development. You'll soon be able to raise a new ticket with customer lookup, category, priority and SLA assignment right from here.
        </p>
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => navigate('/support/tickets')}>
          Back to Ticket List
        </Button>
      </div>
    </div>
  )
}
