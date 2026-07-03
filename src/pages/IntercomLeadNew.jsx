import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { saveLead, nextLeadId, INTERCOM_STAGES, INTERCOM_PLANS, INTERCOM_STAFF } from '../data/intercomLeadsStore'

const INIT_FORM = {
  customer: '', mobile: '', plan: INTERCOM_PLANS[0],
  stage: INTERCOM_STAGES[0], assigned: '', followUp: '', notes: '',
}

export default function IntercomLeadNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INIT_FORM)
  const [errors, setErrors] = useState({})

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function validate() {
    const e = {}
    if (!form.customer.trim())          e.customer = 'Customer name is required'
    if (!form.mobile.match(/^\d{10}$/)) e.mobile   = 'Enter a valid 10-digit number'
    return e
  }

  function handleCreate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const id = nextLeadId()
    const lead = saveLead({
      id,
      leadName: `${form.customer.trim()} — ${form.plan}`,
      customer: form.customer.trim(),
      mobile: form.mobile,
      plan: form.plan,
      stage: form.stage,
      assigned: form.assigned,
      followUp: form.followUp,
      notes: form.notes,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    navigate(`/intercom/leads/${lead.id}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/intercom/leads')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Intercom Lead</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details to add a new intercom service lead</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">Lead Details</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            <FormField label="Customer Name" required>
              <Input
                value={form.customer}
                onChange={e => { set('customer', e.target.value); setErrors(p => ({ ...p, customer: '' })) }}
                placeholder="Ramesh Nair"
                className={errors.customer ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
            </FormField>

            <FormField label="Mobile Number" required>
              <Input
                type="tel"
                value={form.mobile}
                onChange={e => {
                  set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                  setErrors(p => ({ ...p, mobile: '' }))
                }}
                placeholder="9876543210"
                className={errors.mobile ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
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
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes about this lead…" rows={3} />
              </FormField>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Fields marked <span className="text-red-400 font-semibold">*</span> are required
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/intercom/leads')}>Cancel</Button>
          <Button onClick={handleCreate}>Create Lead</Button>
        </div>
      </div>

    </div>
  )
}
