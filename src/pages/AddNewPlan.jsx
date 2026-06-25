import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { savePlan } from '../data/packagesStore'

const PLAN_BILLING_TYPES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One Time']

const EMPTY_MMP_ROW = { name: '', billingType: 'Monthly', price: '' }

const EMPTY_FORM = {
  planType: 'Bandwidth',
  name: '',
  bandwidthPackageId: '',
  serviceType: 'Plan',
  pipeline: '',
  noOfRecharge: '1',
  sortOrder: '',
  packageInfo: '',
  multipleMonthPricing: false,
  billingType: 'Monthly',
  price: '',
  mmpRows: [{ ...EMPTY_MMP_ROW }, { ...EMPTY_MMP_ROW }],
  bundleOTT: false,
  ottType: '',
  ottPackage: '',
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${value ? 'bg-[#0A8DCD]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

export default function AddNewPlan() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit() {
    const newPlan = {
      ...form,
      id: Date.now(),
      price: Number(form.price),
      sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
      ottBundle: form.bundleOTT,
      status: 'active',
    }
    savePlan(newPlan)
    navigate('/packages')
  }

  const canSave =
    form.name.trim() &&
    (form.multipleMonthPricing
      ? form.mmpRows.every(r => r.name.trim() && r.price)
      : !!form.price)

  const fieldCls = "w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"

  const sectionLabel = "text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4"

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/packages')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add New Plan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create a new service plan</p>
          </div>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex gap-5 px-6 pb-24 items-start">

        {/* ── LEFT PANEL (60%) ─────────────────────────────────── */}
        <div className="flex-[3] min-w-0 bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">

          {/* Plan Type */}
          <div>
            <p className={sectionLabel}>Plan Type</p>
            <div className="flex items-center gap-6">
              {['Bandwidth', 'Other Package'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="planType"
                    value={opt}
                    checked={form.planType === opt}
                    onChange={() => setField('planType', opt)}
                    className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Basic Details */}
          <div className="border-t border-surface-border pt-5">
            <p className={sectionLabel}>Basic Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">

              <FormField label="Package Name" required>
                <Input
                  placeholder="e.g. 100 Mbps Monthly FTTH"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                />
              </FormField>

              <FormField label="Bandwidth Package ID" required>
                <Input
                  placeholder="e.g. PKG-001"
                  value={form.bandwidthPackageId}
                  onChange={e => setField('bandwidthPackageId', e.target.value)}
                />
              </FormField>

              <FormField label="Service Type" required>
                <Select value={form.serviceType} onChange={e => setField('serviceType', e.target.value)}>
                  <option value="Plan">Plan</option>
                  <option value="Other Package">Other Package</option>
                </Select>
              </FormField>

              <FormField label="Pipeline" required>
                <Select value={form.pipeline} onChange={e => setField('pipeline', e.target.value)}>
                  <option value="">Select pipeline…</option>
                  <option value="Residential">Residential</option>
                  <option value="Enterprise">Enterprise</option>
                </Select>
              </FormField>

              <FormField label="No. of Recharge" required>
                <Select value={form.noOfRecharge} onChange={e => setField('noOfRecharge', e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Sort Order" required>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.sortOrder}
                  onChange={e => setField('sortOrder', e.target.value)}
                />
              </FormField>

              <div className="col-span-2">
                <FormField label="Package Info">
                  <Textarea
                    rows={3}
                    placeholder="Additional details about this plan"
                    value={form.packageInfo}
                    onChange={e => setField('packageInfo', e.target.value)}
                  />
                </FormField>
              </div>

            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-surface-border pt-5">
            <p className={sectionLabel}>Pricing</p>
            <div className="space-y-4">

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.multipleMonthPricing}
                  onChange={e => setField('multipleMonthPricing', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-sm font-medium text-gray-700">Multiple Month Pricing</span>
              </label>

              {!form.multipleMonthPricing && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <FormField label="Billing Type" required>
                    <Select value={form.billingType} onChange={e => setField('billingType', e.target.value)}>
                      {PLAN_BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Price (₹)" required>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={e => setField('price', e.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {form.multipleMonthPricing && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 mb-1">
                    <p className="text-xs font-medium text-gray-500">Name <span className="text-red-400">*</span></p>
                    <p className="text-xs font-medium text-gray-500">Billing Type <span className="text-red-400">*</span></p>
                    <p className="text-xs font-medium text-gray-500">Price <span className="text-red-400">*</span></p>
                    <div />
                  </div>
                  {form.mmpRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Name"
                        value={row.name}
                        onChange={e => {
                          const rows = form.mmpRows.map((r, j) => j === i ? { ...r, name: e.target.value } : r)
                          setField('mmpRows', rows)
                        }}
                        className={fieldCls}
                      />
                      <select
                        value={row.billingType}
                        onChange={e => {
                          const rows = form.mmpRows.map((r, j) => j === i ? { ...r, billingType: e.target.value } : r)
                          setField('mmpRows', rows)
                        }}
                        className={fieldCls}
                      >
                        {PLAN_BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
                      </select>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.price}
                          onChange={e => {
                            const rows = form.mmpRows.map((r, j) => j === i ? { ...r, price: e.target.value } : r)
                            setField('mmpRows', rows)
                          }}
                          className={`${fieldCls} pl-7`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setField('mmpRows', [...form.mmpRows, { ...EMPTY_MMP_ROW }])}
                          className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors font-bold text-base leading-none"
                        >+</button>
                        {form.mmpRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setField('mmpRows', form.mmpRows.filter((_, j) => j !== i))}
                            className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors font-bold text-base leading-none"
                          >−</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* OTT */}
          <div className="border-t border-surface-border pt-5">
            <p className={sectionLabel}>OTT</p>
            <div className="space-y-4">

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.bundleOTT}
                  onChange={e => setField('bundleOTT', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-sm font-medium text-gray-700">Bundle with OTT</span>
              </label>

              {form.bundleOTT && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pl-7">
                  <FormField label="OTT Type" required>
                    <Select value={form.ottType} onChange={e => setField('ottType', e.target.value)}>
                      <option value="">Select OTT Type…</option>
                      <option>Play Box</option>
                    </Select>
                  </FormField>
                  <FormField label="Select Package" required>
                    <Select value={form.ottPackage} onChange={e => setField('ottPackage', e.target.value)}>
                      <option value="">Select Package…</option>
                      {[
                        'Cityline TV Gold Half Yearly',
                        'Cityline TV Gold Yearly',
                        'Cityline TV Gold Monthly',
                        'Cityline TV Gold Quarterly',
                        'Cityline_Plus (Y)',
                        'Cityline TV Platinum Monthly',
                        'Cityline TV Platinum Half Yearly',
                        'Cityline TV Platinum Quarterly',
                        'Cityline TV Platinum Yearly',
                      ].map(o => <option key={o}>{o}</option>)}
                    </Select>
                  </FormField>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* ── RIGHT PANEL (40%) ────────────────────────────────── */}
        <div className="flex-[2] min-w-0 bg-white rounded-xl border border-surface-border shadow-card p-6">
          <p className={sectionLabel}>Settings</p>
          <div className="space-y-3">

            {[
              { key: 'editable', title: 'Is Package Editable?',        icon: '✏️', desc: 'Allow sales team to modify price during lead stage. If Yes → approval flow triggered' },
              { key: 'landline', title: 'Landline Number Applicable?', icon: '📞', desc: 'Does this package support landline/VOIP assignment? If Yes → shown in lead form' },
              { key: 'offer',    title: 'Is Offer Package?',           icon: '🎁', desc: 'Mark as introductory/special offer. Applicable once per customer only' },
            ].map(opt => (
              <div key={opt.key} className="flex items-start justify-between p-4 border border-gray-200 rounded-xl gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none mt-0.5">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
                <Toggle
                  value={form[opt.key] ?? false}
                  onChange={val => setField(opt.key, val)}
                />
              </div>
            ))}

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <p className="text-sm font-semibold text-gray-800">Status</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{form.status !== false ? 'Active' : 'Inactive'}</span>
                <Toggle
                  value={form.status !== false}
                  onChange={val => setField('status', val)}
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Bottom Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <p className="text-xs text-gray-400">Fields marked <span className="text-red-400">*</span> are required</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/packages')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSave}>Save Plan</Button>
        </div>
      </div>

    </div>
  )
}
