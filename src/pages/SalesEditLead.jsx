import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getStates, getDistricts, getAreasList, getLocalities, getSubLocalities,
} from '../data/areaMappingStore'
import { getLeads, saveLead, subscribeLeads } from '../data/leadsStore'

const PIPELINE_COLORS = { B2C: '#0A8DCD', B2B: '#0F2744', Custom: '#E8541A' }
const PIPELINE_LABELS = { B2C: 'Residential', B2B: 'Corporate', Custom: 'Custom Pipeline' }

const STAGE_CHIP = {
  'New Inquiry':           'bg-blue-100 text-blue-700',
  'Contacted':             'bg-cyan-100 text-cyan-700',
  'Follow-up':             'bg-purple-100 text-purple-700',
  'Site Survey':           'bg-amber-100 text-amber-700',
  'Quotation Sent':        'bg-orange-100 text-orange-700',
  'Negotiation':           'bg-pink-100 text-pink-700',
  'Installation Visit':    'bg-purple-100 text-purple-700',
  'Won':                   'bg-emerald-100 text-emerald-700',
  'Lost':                  'bg-red-100 text-red-600',
  'Meeting Scheduled':     'bg-sky-100 text-sky-700',
  'Requirement Analysis':  'bg-indigo-100 text-indigo-700',
  'Technical Feasibility': 'bg-teal-100 text-teal-700',
  'Commercial Proposal':   'bg-orange-100 text-orange-600',
  'Legal/Agreement':       'bg-slate-100 text-slate-700',
  'Quotation':             'bg-amber-100 text-amber-700',
}

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
]

const SOURCES = ['Walk-in', 'Referral', 'Website', 'Cold Call', 'Social Media']
const PLANS   = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']

export default function SalesEditLead() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [leads, setLeads] = useState(getLeads)
  const [form, setForm]   = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => subscribeLeads(setLeads), [])

  const lead = leads.find(l => l.id === id)

  useEffect(() => {
    if (lead && !form) {
      setForm({
        leadName:       lead.leadName       || '',
        name:           lead.name           || '',
        phone:          lead.phone          || '',
        alternatePhone: lead.alternateMobile|| '',
        email:          lead.email          || '',
        state:          lead.state          || '',
        district:       lead.district       || '',
        area:           lead.area           || '',
        locality:       lead.locality       || '',
        subLocality:    lead.subLocality    || '',
        source:         lead.source         || '',
        plan:           lead.plan           || '',
        assigned:       lead.assigned       || '',
        followUp:       lead.followUp       || '',
        notes:          lead.notes          || '',
      })
    }
  }, [lead])

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <p className="text-lg font-semibold text-gray-900 mb-2">Lead not found</p>
        <p className="text-sm text-gray-500 mb-6">
          The lead ID <code className="bg-gray-100 px-2 py-0.5 rounded">{id}</code> does not exist.
        </p>
        <Button onClick={() => navigate('/sales')}>Back to Sales Pipeline</Button>
      </div>
    )
  }

  if (!form) return null

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }))
    setErrors(e => ({ ...e, [f]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.leadName.trim())                 e.leadName = 'Lead name is required'
    if (!form.name.trim())                     e.name     = 'Full name is required'
    if (!form.phone.match(/^\d{10}$/))         e.phone    = 'Enter a valid 10-digit number'
    if (form.alternatePhone && !form.alternatePhone.match(/^\d{10}$/))
                                               e.alternatePhone = 'Enter a valid 10-digit number'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const staff = STAFF.find(s => s.name === form.assigned)
    const activityEntry = {
      id:   Date.now(),
      icon: '✏️',
      text: 'Lead details updated by Admin User',
      user: 'Admin User',
      time: 'just now',
    }

    saveLead({
      ...lead,
      leadName:         form.leadName,
      name:             form.name,
      phone:            form.phone,
      alternateMobile:  form.alternatePhone,
      email:            form.email,
      state:            form.state,
      district:         form.district,
      area:             form.area,
      locality:         form.locality,
      subLocality:      form.subLocality,
      source:           form.source,
      plan:             form.plan,
      assigned:         form.assigned,
      assignedInitials: staff?.initials ?? lead.assignedInitials,
      assignedColor:    staff?.color    ?? lead.assignedColor,
      followUp:         form.followUp,
      notes:            form.notes,
      lastActivity:     'Lead details updated',
      activityLog:      [activityEntry, ...(lead.activityLog ?? [])],
    })
    navigate(`/sales/leads/${id}`)
  }

  const states       = getStates()
  const districts    = form.state ? getDistricts(form.state) : []
  const areas        = form.state && form.district ? getAreasList(form.state, form.district) : []
  const localities   = form.state && form.district && form.area
    ? getLocalities(form.state, form.district, form.area) : []
  const subLocalities = form.state && form.district && form.area && form.locality
    ? getSubLocalities(form.state, form.district, form.area, form.locality) : []

  const plColor = PIPELINE_COLORS[lead.pipeline] ?? '#0A8DCD'
  const plLabel = PIPELINE_LABELS[lead.pipeline] ?? lead.pipeline
  const stageChip = STAGE_CHIP[lead.stage] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/sales/leads/${id}`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Lead</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update lead information · {lead.id}</p>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Read-only Pipeline + Stage */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-3">Pipeline &amp; Stage</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-surface-border rounded-lg">
              <Lock size={12} className="text-gray-400" />
              <span className="text-sm font-semibold" style={{ color: plColor }}>{plLabel}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-surface-border rounded-lg">
              <Lock size={12} className="text-gray-400" />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageChip}`}>{lead.stage}</span>
            </div>
            <p className="text-xs text-gray-400 italic">Pipeline and stage cannot be changed after creation</p>
          </div>
        </div>

        {/* Lead Details */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">Lead Details</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            <div className="col-span-2">
              <FormField label="Lead Name" required>
                <Input
                  value={form.leadName}
                  onChange={e => set('leadName', e.target.value)}
                  placeholder="e.g. Customer Name — Plan Interest"
                  className={errors.leadName ? 'border-red-400 focus:ring-red-400/30' : ''}
                />
                {errors.leadName && <p className="text-xs text-red-500 mt-1">{errors.leadName}</p>}
              </FormField>
            </div>

            <FormField label="Full Name" required>
              <Input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ramesh Nair"
                className={errors.name ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </FormField>

            <FormField label="Phone Number" required>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className={errors.phone ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </FormField>

            <FormField label="Alternate Number">
              <Input
                type="tel"
                value={form.alternatePhone}
                onChange={e => set('alternatePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className={errors.alternatePhone ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.alternatePhone && <p className="text-xs text-red-500 mt-1">{errors.alternatePhone}</p>}
            </FormField>

            <FormField label="Email Address">
              <Input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="ramesh@email.com"
              />
            </FormField>

            <FormField label="State">
              <Select
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value, district: '', area: '', locality: '', subLocality: '' }))}
              >
                <option value="">Select state…</option>
                {states.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>

            <FormField label="District">
              <Select
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value, area: '', locality: '', subLocality: '' }))}
                disabled={!form.state}
              >
                <option value="">Select district…</option>
                {districts.map(d => <option key={d}>{d}</option>)}
              </Select>
            </FormField>

            <FormField label="Area">
              <Select
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value, locality: '', subLocality: '' }))}
                disabled={!form.district}
              >
                <option value="">Select area…</option>
                {areas.map(a => <option key={a}>{a}</option>)}
              </Select>
            </FormField>

            <FormField label="Locality">
              <Select
                value={form.locality}
                onChange={e => setForm(f => ({ ...f, locality: e.target.value, subLocality: '' }))}
                disabled={!form.area}
              >
                <option value="">Select locality…</option>
                {localities.map(l => <option key={l}>{l}</option>)}
              </Select>
            </FormField>

            <FormField label="Sub Locality">
              <Select
                value={form.subLocality}
                onChange={e => set('subLocality', e.target.value)}
                disabled={!form.locality}
              >
                <option value="">Select sub locality…</option>
                {subLocalities.map(sl => <option key={sl.subLocality}>{sl.subLocality}</option>)}
              </Select>
            </FormField>

            <FormField label="Lead Source">
              <Select value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="">Select source…</option>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>

            <FormField label="Interested Plan">
              <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
                <option value="">Select plan…</option>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </Select>
            </FormField>

            <FormField label="Assigned To">
              <Select value={form.assigned} onChange={e => set('assigned', e.target.value)}>
                <option value="">Select sales rep…</option>
                {STAFF.map(s => <option key={s.name}>{s.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Follow-up Date">
              <Input type="date" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
            </FormField>

            <div className="col-span-2">
              <FormField label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes about this lead…"
                  rows={3}
                />
              </FormField>
            </div>

          </div>
        </div>

      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Fields marked <span className="text-red-400 font-semibold">*</span> are required
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate(`/sales/leads/${id}`)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

    </div>
  )
}
