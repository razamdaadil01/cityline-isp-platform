import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Phone, User, CalendarDays, Wifi, FileText, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getLead, saveLead, deleteLead, subscribeLeads,
  INTERCOM_STAGES, INTERCOM_PLANS, INTERCOM_STAFF,
} from '../data/intercomLeadsStore'

const STAGE_BADGE = {
  'New Inquiry': 'blue',
  'Feasibility': 'orange',
  'Booked':      'purple',
  'Converted':   'green',
  'Lost':        'red',
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function IntercomLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [lead, setLead] = useState(() => getLead(id))
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [form, setForm] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => subscribeLeads(() => setLead(getLead(id))), [id])
  useEffect(() => { setLead(getLead(id)) }, [id])
  useEffect(() => {
    if (searchParams.get('edit') === '1') { setEditing(true); setForm(lead) }
  }, [searchParams.get('edit')])

  function startEdit() {
    setForm(lead)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
    setSearchParams({})
  }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSave() {
    saveLead({ ...lead, ...form })
    setEditing(false)
    setForm(null)
    setSearchParams({})
  }

  function confirmDelete() {
    deleteLead(id)
    setDeleteOpen(false)
    navigate('/intercom/leads')
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-sm font-semibold text-gray-700">Lead not found</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">This intercom lead may have been deleted.</p>
        <Button variant="secondary" onClick={() => navigate('/intercom/leads')}>Back to Leads</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/intercom/leads')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{lead.leadName}</h1>
                <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">{lead.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <>
                <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>Delete</Button>
                <Button onClick={startEdit}>Edit Lead</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Customer Info" />
              <InfoRow icon={User} label="Customer" value={lead.customer} />
              <InfoRow icon={Phone} label="Mobile" value={lead.mobile} />
              <InfoRow icon={Wifi} label="Plan" value={lead.plan} />
            </Card>
            <Card>
              <CardHeader title="Assignment & Follow-up" />
              <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${lead.assignedColor}`}>
                  {lead.assignedInitials}
                </span>
                <div>
                  <p className="text-[11px] text-gray-400">Assigned To</p>
                  <p className="text-sm font-medium text-gray-800">{lead.assigned || '—'}</p>
                </div>
              </div>
              <InfoRow icon={CalendarDays} label="Follow-up Date" value={lead.followUp} />
              <InfoRow icon={CalendarDays} label="Created" value={lead.createdAt} />
            </Card>
            <Card className="col-span-2">
              <CardHeader title="Notes" />
              <div className="flex items-start gap-3">
                <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes || 'No notes added.'}</p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5 max-w-2xl">
            <p className="text-sm font-bold text-gray-700 mb-4">Edit Lead Details</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <FormField label="Customer Name">
                <Input value={form.customer} onChange={e => set('customer', e.target.value)} />
              </FormField>
              <FormField label="Mobile Number">
                <Input value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </FormField>
              <FormField label="Plan">
                <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
                  {INTERCOM_PLANS.map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Stage">
                <Select value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {INTERCOM_STAGES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="Assigned To">
                <Select value={form.assigned} onChange={e => set('assigned', e.target.value)}>
                  <option value="">Select user…</option>
                  {INTERCOM_STAFF.map(s => <option key={s.name}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Follow-up Date">
                <Input type="date" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
              </FormField>
              <div className="col-span-2">
                <FormField label="Notes">
                  <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
                </FormField>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this lead?" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Lead</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{lead.leadName}</span>{' '}
          will be permanently removed from the intercom leads list.
        </p>
      </Modal>

    </div>
  )
}
