import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, Bell } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Input, Textarea } from '../ui/FormInputs'
import DynamicFieldInput, { isFieldFilled } from '../ui/DynamicFieldInput'
import { getStageFields, getStageMeta } from '../../data/stageFieldsStore'

// Shared staff directory used for the follow-up "Notifiers" picker below —
// kept here (rather than duplicated per caller) since MoveStageModal is the
// only place it's rendered.
export const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
  { name: 'Admin User',   initials: 'AU', color: 'bg-gray-500'     },
]

const PIPELINE_MAP = { B2C: 'PL-001', Enterprise: 'PL-003' }

export function findStageId(pipelines, pipelineKey, stageName) {
  const pipeline = pipelines.find(p => p.id === (PIPELINE_MAP[pipelineKey] ?? ''))
  return pipeline?.stages.find(s => s.name === stageName)?.id ?? null
}

// Originally the Leads move-stage flow's own modal (still opened from
// /sales/leads/:leadId?action=move-stage) — also reused as-is by Feasibility
// Request Detail's "Feasibility Details" edit trigger, since both flows edit
// the same s4-f* (Feasibility stage) fields, just against different records.
// The `lead` prop only needs to duck-type a subset of a real lead's shape
// (name, pipeline, locality/subLocality/address/landmark, siteType,
// customerRequirement, branchCode, remarks) — a Feasibility Request can be
// mapped into that shape by its caller to pre-fill from its own data.
export default function MoveStageModal({ isOpen, onClose, lead, pipelines, onSave, targetStage = '', title }) {
  const [fieldVals, setFieldVals]             = useState({})
  const [followupEnabled, setFollowupEnabled] = useState(false)
  const [fuForm, setFuForm]                   = useState({ date: '', time: '10:00', note: '', notifyTo: [] })
  const [loading, setLoading]                 = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pre-fill the Feasibility stage fields (s4-f*, see stageFieldsStore.js) from the
      // source record's own address data when this modal is opened specifically to check
      // feasibility — same field IDs handleMoveStage/handleSave already reads when it
      // builds the feasibility request, so this only seeds fields that overlap.
      setFieldVals(targetStage === 'Feasibility' && lead ? {
        's4-f1': lead.locality ?? lead.area ?? '',
        's4-f2': lead.subLocality ?? '',
        's4-f3': lead.address ?? '',
        's4-f4': lead.landmark ?? '',
        's4-f5': ['FTTH', 'Sector', 'Village'].includes(lead.siteType) ? lead.siteType : '',
        's4-f6': lead.customerRequirement ?? '',
        's4-f7': ['CNPL-001', 'CNPL-002', 'CNPL-WHI-01', 'CNPL-MAR-01', 'CNPL-IND-01', 'CNPL-NOI-01'].includes(lead.branchCode) ? lead.branchCode : '',
        's4-f8': lead.remarks ?? '',
      } : {})
      setFollowupEnabled(false)
      setFuForm({ date: '', time: '10:00', note: '', notifyTo: [] })
    }
  }, [isOpen, targetStage, lead])

  const needsFeasConfirm = false
  // Each fixed context gets its own shorter follow-up label and submit button text;
  // any other/future fixed stage falls back to the original "Move Stage" wording.
  const isFeasibility  = targetStage === 'Feasibility'
  const isLost         = targetStage === 'Lost'
  const targetStageId  = findStageId(pipelines, lead?.pipeline, targetStage)
  const stageMeta      = targetStageId ? getStageMeta(targetStageId) : {}
  const stageFields    = (targetStageId ? getStageFields(targetStageId) : []).filter(f => f.active !== false)
  const visibleFields  = stageFields.filter(f => !f.conditionalOn || fieldVals[f.conditionalOn.fieldId] === f.conditionalOn.value)
  const requiredFields = visibleFields.filter(f => f.required)
  const requiredFilled = requiredFields.every(f => isFieldFilled(f, fieldVals[f.id]))
  const filledCount    = visibleFields.filter(f => isFieldFilled(f, fieldVals[f.id])).length

  function setField(id, val) { setFieldVals(p => ({ ...p, [id]: val })) }

  function toggleNotify(name) {
    setFuForm(p => ({ ...p, notifyTo: p.notifyTo.includes(name) ? p.notifyTo.filter(n => n !== name) : [...p.notifyTo, name] }))
  }

  function handleMove() {
    if (!targetStage || !requiredFilled) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onSave(targetStage, fieldVals, followupEnabled ? fuForm : null)
      onClose()
    }, 600)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title ?? `Move Stage — ${lead?.name}`} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button icon={loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            onClick={handleMove} disabled={!targetStage || loading || !requiredFilled}>
            {isFeasibility
              ? (loading ? 'Submitting…' : 'Submit')
              : isLost
                ? (loading ? 'Closing…' : 'Close Lead')
                : (loading ? 'Moving…' : 'Move Stage')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Dynamic stage fields */}
        {!needsFeasConfirm && targetStage && targetStage !== 'New Inquiry' && stageFields.length > 0 && (
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                Stage Fields — {targetStage}
              </p>
              <span className="text-[11px] text-gray-500 font-medium bg-white border border-surface-border rounded-full px-2 py-0.5">
                {filledCount}/{visibleFields.length} filled
                {requiredFields.length > 0 && ` · ${requiredFields.length} required`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {visibleFields.map(f => {
                const isWide = ['Textarea', 'Multi-select', 'Radio', 'File Upload'].includes(f.type)
                return (
                  <div key={f.id} className={isWide ? 'col-span-2' : ''}>
                    <FormField label={f.label} required={f.required} hint={f.help || undefined}>
                      <DynamicFieldInput
                        field={f}
                        value={fieldVals[f.id]}
                        onChange={val => setField(f.id, val)}
                      />
                    </FormField>
                  </div>
                )
              })}
            </div>
            {stageMeta.showFeasibilityBanner && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg mt-3">
                <span className="text-xs text-amber-700 font-medium">Feasibility Status will be set to:</span>
                <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            )}
          </div>
        )}

        {/* Follow-up toggle */}
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <button type="button" onClick={() => setFollowupEnabled(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-brand-orange" />
              {isFeasibility || isLost ? 'Set follow-up' : 'Set a follow-up after moving'}
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors relative ${followupEnabled ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${followupEnabled ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>
          {followupEnabled && (
            <div className="px-4 pb-4 pt-1 border-t border-surface-border space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date" required>
                  <Input type="date" value={fuForm.date} onChange={e => setFuForm(p => ({ ...p, date: e.target.value }))} />
                </FormField>
                <FormField label="Time">
                  <Input type="time" value={fuForm.time} onChange={e => setFuForm(p => ({ ...p, time: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Note">
                <Textarea value={fuForm.note} onChange={e => setFuForm(p => ({ ...p, note: e.target.value }))} rows={2} placeholder="Context for follow-up…" />
              </FormField>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Notifiers</p>
                <div className="flex flex-wrap gap-2">
                  {STAFF.slice(0, 4).map(s => (
                    <button key={s.name} type="button" onClick={() => toggleNotify(s.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                        fuForm.notifyTo.includes(s.name)
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-surface-border text-gray-600 hover:border-brand-blue/40'
                      }`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}>{s.initials}</div>
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
