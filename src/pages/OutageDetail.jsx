import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Ticket as TicketIcon } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Card, { CardHeader } from '../components/ui/Card'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'
import {
  getOutage, subscribeOutages, updateOutageStatus, resolveOutage, getLinkedTickets,
  OUTAGE_STATUSES, GATED_OUTAGE_STATUSES,
} from '../data/outagesStore'

const CURRENT_USER = 'Admin User'

const SEVERITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'gray' }
const STATUS_BADGE = {
  Confirmed: 'blue', 'Work in Progress': 'orange', Monitoring: 'yellow', Resolved: 'green', Closed: 'gray',
}
const TICKET_STATUS_BADGE = { New: 'blue', Assigned: 'cyan', 'In Progress': 'orange', Resolved: 'green', Closed: 'gray' }

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function InfoField({ label, children }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800 font-medium">{children}</div>
    </div>
  )
}

function ResolveOutageModal({ isOpen, onClose, onSubmit }) {
  const [rootCause, setRootCause] = useState('')
  const [solution, setSolution] = useState('')
  const [actualRestorationTime, setActualRestorationTime] = useState('')
  const [finalCustomerMessage, setFinalCustomerMessage] = useState('')

  const valid = rootCause.trim() && solution.trim() && actualRestorationTime && finalCustomerMessage.trim()

  function handleSubmit() {
    if (!valid) return
    onSubmit({
      rootCause: rootCause.trim(), solution: solution.trim(),
      actualRestorationTime: new Date(actualRestorationTime).toISOString(),
      finalCustomerMessage: finalCustomerMessage.trim(),
    })
    setRootCause(''); setSolution(''); setActualRestorationTime(''); setFinalCustomerMessage('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve Outage" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid}>Mark as Resolved</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Root Cause" required>
          <Textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={2} placeholder="What caused this outage?" />
        </FormField>
        <FormField label="Solution" required>
          <Textarea value={solution} onChange={e => setSolution(e.target.value)} rows={2} placeholder="What was done to restore service?" />
        </FormField>
        <FormField label="Restoration Time (actual)" required>
          <Input type="datetime-local" value={actualRestorationTime} onChange={e => setActualRestorationTime(e.target.value)} />
        </FormField>
        <FormField label="Final Customer Message" required>
          <Textarea value={finalCustomerMessage} onChange={e => setFinalCustomerMessage(e.target.value)} rows={2} placeholder="What should customers be told now that this is resolved?" />
        </FormField>
      </div>
    </Modal>
  )
}

export default function OutageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [outage, setOutage] = useState(() => getOutage(id))
  const [resolveOpen, setResolveOpen] = useState(false)

  useEffect(() => setOutage(getOutage(id)), [id])
  useEffect(() => subscribeOutages(() => setOutage(getOutage(id))), [id])

  if (!outage) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/support/outages')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Outages
        </button>
        <p className="text-sm text-gray-400 mt-4">Outage {id} was not found.</p>
      </div>
    )
  }

  const isGated = outage.status === 'Resolved'
  const selectableStatuses = OUTAGE_STATUSES.filter(s => !GATED_OUTAGE_STATUSES.includes(s))
  const statusOptions = selectableStatuses.includes(outage.status) ? selectableStatuses : [outage.status, ...selectableStatuses]
  const linkedTickets = getLinkedTickets(outage.id)

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/outages')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 font-mono">{outage.id}</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{outage.title}</p>
        </div>
        <Badge variant={STATUS_BADGE[outage.status] ?? 'gray'} size="lg" className="ml-auto shrink-0">{outage.status}</Badge>
      </div>

      <Card>
        <CardHeader title="Outage Details" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
          <InfoField label="Outage Number"><span className="font-mono">{outage.id}</span></InfoField>
          <InfoField label="Outage Type">{outage.type}</InfoField>
          <InfoField label="Severity"><Badge variant={SEVERITY_BADGE[outage.severity]} size="sm" dot>{outage.severity}</Badge></InfoField>
          <InfoField label="Status">
            {isGated ? (
              <Badge variant={STATUS_BADGE[outage.status]} size="sm">{outage.status}</Badge>
            ) : (
              <Select value={outage.status} onChange={e => updateOutageStatus(outage.id, e.target.value, CURRENT_USER)}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            )}
          </InfoField>
          <InfoField label="Affected Area(s)">{outage.affectedAreas.join(', ')}</InfoField>
          <InfoField label="Affected Equipment">{outage.affectedEquipment}</InfoField>
          <InfoField label="Start Time">{formatDateTime(outage.startTime)}</InfoField>
          <InfoField label="Expected Restoration">{formatDateTime(outage.expectedRestorationTime)}</InfoField>
          <InfoField label="Affected Customers">{outage.affectedCustomerCount}</InfoField>
          <InfoField label="Linked Tickets">{linkedTickets.length}</InfoField>
        </div>
        <div className="mt-4 pt-4 border-t border-surface-border space-y-4">
          <InfoField label="Description"><p className="font-normal text-gray-700">{outage.description}</p></InfoField>
          <InfoField label="Customer Message"><p className="font-normal text-gray-700">{outage.customerMessage}</p></InfoField>
        </div>
      </Card>

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
          <TicketIcon size={15} className="text-brand-blue" />
          <h3 className="text-sm font-semibold text-gray-800">Linked Tickets</h3>
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{linkedTickets.length}</span>
        </div>
        {linkedTickets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No tickets linked to this outage yet.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {linkedTickets.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/support/tickets/${t.id}/overview`)}>
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-brand-blue">{t.id}</span>
                  <span className="text-sm text-gray-700 ml-2 truncate">{t.customerName} · {t.category}</span>
                </div>
                <Badge variant={TICKET_STATUS_BADGE[t.status] ?? 'gray'} size="sm">{t.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Resolution" />
        <div className="space-y-4">
          {outage.resolution ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <div className="col-span-2">
                <InfoField label="Root Cause"><p className="font-normal text-gray-700">{outage.resolution.rootCause}</p></InfoField>
              </div>
              <div className="col-span-2">
                <InfoField label="Solution"><p className="font-normal text-gray-700">{outage.resolution.solution}</p></InfoField>
              </div>
              <InfoField label="Actual Restoration Time">{formatDateTime(outage.resolution.actualRestorationTime)}</InfoField>
              <InfoField label="Resolved By">{outage.resolution.resolvedBy}</InfoField>
              <div className="col-span-2">
                <InfoField label="Final Customer Message"><p className="font-normal text-gray-700">{outage.resolution.finalCustomerMessage}</p></InfoField>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">This outage has not been resolved yet.</p>
          )}
          <div className="pt-2 border-t border-surface-border">
            <Button icon={<CheckCircle2 size={14} />} disabled={isGated} onClick={() => setResolveOpen(true)}>
              Resolve Outage
            </Button>
          </div>
        </div>
      </Card>

      <ResolveOutageModal isOpen={resolveOpen} onClose={() => setResolveOpen(false)}
        onSubmit={data => { resolveOutage(outage.id, data, CURRENT_USER); setResolveOpen(false) }} />
    </div>
  )
}
