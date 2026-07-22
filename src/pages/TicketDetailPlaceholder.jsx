import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Ticket } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { getTicket } from '../data/ticketsStore'

export default function TicketDetailPlaceholder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ticket = getTicket(id)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/tickets')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{id}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {ticket ? `${ticket.customerName} · ${ticket.category}` : 'Ticket details'}
          </p>
        </div>
        {ticket && <Badge variant="blue" size="sm" className="ml-auto">{ticket.status}</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-surface-border shadow-card p-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
          <Ticket size={24} />
        </div>
        <h2 className="text-base font-bold text-gray-800">Coming Soon</h2>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
          The full Ticket Details view — timeline, notes, attachments and resolution actions — is under development.
        </p>
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => navigate('/support/tickets')}>
          Back to Ticket List
        </Button>
      </div>
    </div>
  )
}
