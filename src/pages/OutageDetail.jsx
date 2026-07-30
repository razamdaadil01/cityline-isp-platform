import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Ticket as TicketIcon, Bell, Send, Plus, Pencil, ChevronDown, Search, X } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Card, { CardHeader } from '../components/ui/Card'
import AreaMultiSelect from '../components/ui/AreaMultiSelect'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'
import {
  getOutage, subscribeOutages, updateOutageStatus, resolveOutage, getLinkedTickets,
  getAffectedCustomers, updateOutageAreaEquipment, logNotification,
  OUTAGE_STATUSES, GATED_OUTAGE_STATUSES,
} from '../data/outagesStore'
import { getTickets, subscribeTickets, linkTicketsToOutage, CLOSED_STATUSES, PRIORITY_LABEL } from '../data/ticketsStore'
import { getAllLocalitiesGrouped } from '../data/areaMappingStore'

const CURRENT_USER = 'Admin User'

const SEVERITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'gray' }
const STATUS_BADGE = {
  Confirmed: 'blue', 'Work in Progress': 'orange', Monitoring: 'yellow', Resolved: 'green', Closed: 'gray',
}
const TICKET_STATUS_BADGE = { New: 'blue', Assigned: 'cyan', 'In Progress': 'orange', Resolved: 'green', Closed: 'gray' }
const PRIORITY_BADGE = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }
const CONNECTION_STATUS_LABEL = { active: 'Connected', suspended: 'Suspended', inactive: 'Disconnected', expired: 'Disconnected' }
const CONNECTION_STATUS_BADGE = { active: 'green', suspended: 'yellow', inactive: 'gray', expired: 'red' }

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

// ── Edit Affected Area(s) / Affected Equipment — re-runs the auto-link match on save ──

function EditAreaEquipmentModal({ open, onClose, outage, areaGroups, onSave }) {
  const [areas, setAreas] = useState([])
  const [equipment, setEquipment] = useState('')

  useEffect(() => {
    if (!open) return
    setAreas(outage.affectedAreas)
    setEquipment(outage.affectedEquipment)
  }, [open, outage])

  const valid = areas.length > 0 && equipment.trim()

  function handleSave() {
    if (!valid) return
    onSave(areas, equipment.trim())
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit Affected Area / Equipment" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!valid}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Affected Area(s)" required hint="Editing this re-runs the auto-link match against open tickets">
          <AreaMultiSelect selected={areas} onChange={setAreas} groups={areaGroups} />
        </FormField>
        <FormField label="Affected Equipment" required>
          <Input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="e.g. OLT-AW-02, Junction Box #23" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Manual "Link Ticket" — search + multi-select among open, not-yet-linked tickets ──

function LinkTicketModal({ open, onClose, excludeIds, onLink }) {
  const [tickets, setTickets] = useState(getTickets)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState([])

  useEffect(() => subscribeTickets(setTickets), [])
  useEffect(() => {
    if (!open) return
    setSearch(''); setPicked([])
  }, [open])

  function toggle(id) { setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }

  const q = search.trim().toLowerCase()
  const candidates = tickets.filter(t => !excludeIds.includes(t.id) && !CLOSED_STATUSES.includes(t.status))
  const filtered = q
    ? candidates.filter(t =>
        t.id.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q) || t.phone.includes(search.trim())
      )
    : candidates

  function handleLink() {
    if (!picked.length) return
    onLink(picked)
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Link Ticket" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLink} disabled={picked.length === 0}>
            Link{picked.length > 0 ? ` (${picked.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {picked.map(id => (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                {id}
                <button type="button" onClick={() => toggle(id)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticket #, customer, phone..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
          />
        </div>

        <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[240px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No open, unlinked tickets found</p>
          ) : filtered.map(t => {
            const selected = picked.includes(t.id)
            return (
              <label key={t.id}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <input type="checkbox" checked={selected} onChange={() => toggle(t.id)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-semibold text-brand-blue">{t.id}</p>
                  <p className="text-xs text-gray-500 truncate">{t.customerName} · {t.category}</p>
                </div>
                <Badge variant={TICKET_STATUS_BADGE[t.status] ?? 'gray'} size="sm">{t.status}</Badge>
              </label>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

// ── Notify Customers — confirmation/preview, then logs a stub notification ──

function NotifyModal({ open, onClose, message, customerCount, onSend }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Notify Customers" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSend} icon={<Send size={13} />}>Send</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          This will notify <span className="font-semibold text-gray-800">{customerCount}</span> affected customer{customerCount !== 1 ? 's' : ''}:
        </p>
        <div className="p-3 rounded-lg bg-gray-50 border border-surface-border text-sm text-gray-700">
          {message || <span className="text-gray-400">No customer message on file.</span>}
        </div>
        <p className="text-[11px] text-gray-400">
          No SMS/email provider is connected yet — sending records this notification in the log below.
        </p>
      </div>
    </Modal>
  )
}

export default function OutageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [outage, setOutage] = useState(() => getOutage(id))
  const [resolveOpen, setResolveOpen] = useState(false)
  const [customersOpen, setCustomersOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [editAreaOpen, setEditAreaOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => setOutage(getOutage(id)), [id])
  useEffect(() => subscribeOutages(() => setOutage(getOutage(id))), [id])
  // Linking/unlinking tickets only changes ticketsStore, not this outage record —
  // re-render on ticket changes too so "Linked Tickets" stays live.
  const [, forceTicketsTick] = useState(0)
  useEffect(() => subscribeTickets(() => forceTicketsTick(x => x + 1)), [])

  const areaGroups = getAllLocalitiesGrouped()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

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
  const affectedCustomers = getAffectedCustomers(outage)

  function handleNotify() {
    logNotification(outage.id, { customerCount: affectedCustomers.length, message: outage.customerMessage }, CURRENT_USER)
    setNotifyOpen(false)
    setToast(`Notification sent to ${affectedCustomers.length} customer(s)`)
  }

  function handleSaveAreaEquipment(areas, equipment) {
    updateOutageAreaEquipment(outage.id, { affectedAreas: areas, affectedEquipment: equipment }, CURRENT_USER)
    setEditAreaOpen(false)
  }

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
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button size="sm" variant="secondary" icon={<Bell size={13} />} onClick={() => setNotifyOpen(true)}>
            Notify Customers
          </Button>
          <Badge variant={STATUS_BADGE[outage.status] ?? 'gray'} size="lg">{outage.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader title="Outage Details"
          action={
            <Button size="xs" variant="secondary" icon={<Pencil size={12} />} onClick={() => setEditAreaOpen(true)}>
              Edit Area/Equipment
            </Button>
          }
        />
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
          <InfoField label="Affected Customers">
            <button type="button" onClick={() => setCustomersOpen(o => !o)}
              className="inline-flex items-center gap-1 text-brand-blue hover:underline">
              {outage.affectedCustomerCount}
              <ChevronDown size={12} className={`transition-transform ${customersOpen ? 'rotate-180' : ''}`} />
            </button>
          </InfoField>
          <InfoField label="Linked Tickets">{linkedTickets.length}</InfoField>
        </div>

        {customersOpen && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Affected Customers ({affectedCustomers.length})
            </p>
            {affectedCustomers.length === 0 ? (
              <p className="text-sm text-gray-400">No customers found in the affected area(s).</p>
            ) : (
              <div className="border border-surface-border rounded-lg divide-y divide-surface-border max-h-64 overflow-y-auto">
                {affectedCustomers.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.id} · {c.phone}</p>
                    </div>
                    <Badge variant={CONNECTION_STATUS_BADGE[c.status] ?? 'gray'} size="sm">
                      {CONNECTION_STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          <Button size="xs" variant="secondary" className="ml-auto" icon={<Plus size={12} />} onClick={() => setLinkModalOpen(true)}>
            Link Ticket
          </Button>
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
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={PRIORITY_BADGE[t.priority]} size="sm" dot>{PRIORITY_LABEL[t.priority]}</Badge>
                  <Badge variant={TICKET_STATUS_BADGE[t.status] ?? 'gray'} size="sm">{t.status}</Badge>
                </div>
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

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
          <Bell size={15} className="text-brand-blue" />
          <h3 className="text-sm font-semibold text-gray-800">Notification Log</h3>
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{(outage.notificationLog ?? []).length}</span>
        </div>
        {(outage.notificationLog ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No notifications sent yet.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {[...outage.notificationLog].reverse().map((n, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700">Sent to {n.customerCount} customer{n.customerCount !== 1 ? 's' : ''}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{formatDateTime(n.time)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ResolveOutageModal isOpen={resolveOpen} onClose={() => setResolveOpen(false)}
        onSubmit={data => { resolveOutage(outage.id, data, CURRENT_USER); setResolveOpen(false) }} />

      <EditAreaEquipmentModal open={editAreaOpen} onClose={() => setEditAreaOpen(false)}
        outage={outage} areaGroups={areaGroups} onSave={handleSaveAreaEquipment} />

      <LinkTicketModal open={linkModalOpen} onClose={() => setLinkModalOpen(false)}
        excludeIds={linkedTickets.map(t => t.id)}
        onLink={ids => { linkTicketsToOutage(ids, outage.id); setLinkModalOpen(false) }} />

      <NotifyModal open={notifyOpen} onClose={() => setNotifyOpen(false)}
        message={outage.customerMessage} customerCount={affectedCustomers.length} onSend={handleNotify} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> {toast}
        </div>
      )}
    </div>
  )
}
