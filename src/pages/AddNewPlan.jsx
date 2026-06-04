import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { savePlan } from '../data/packagesStore'

const PLAN_BILLING_TYPES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One Time']

const EMPTY_MMP_ROW = { name: '', billingType: 'Monthly', price: '' }

const EMPTY_FORM = {
  serviceType: 'Plan',
  pipeline: '',
  bandwidthPackageId: '',
  packageType: 'Public',
  multipleMonthPricing: false,
  mmpGroupName: '',
  mmpRows: [{ ...EMPTY_MMP_ROW }, { ...EMPTY_MMP_ROW }],
  mmpNoOfRecharge: '1',
  billingType: 'Monthly',
  price: '',
  name: '',
  packageInfo: '',
  sortOrder: '',
  speed: '',
  packageAvailable: 'Yes',
  offerPackage: 'No',
  bundleOTT: false,
  doNotIncludeInCalc: false,
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
      offer: form.offerPackage === 'Yes',
      ottBundle: form.bundleOTT,
      status: 'active',
    }
    savePlan(newPlan)
    navigate('/packages')
  }

  const canSave =
    form.name.trim() &&
    (form.multipleMonthPricing
      ? form.mmpGroupName.trim() && form.mmpRows.every(r => r.name.trim() && r.price)
      : !!form.price)

  return (
    <div className="p-6 max-w-[1600px]">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/packages')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Packages
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Add New Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new service plan</p>
      </div>

      {/* Form Card */}
      <div className="w-full bg-white rounded-xl shadow-card border border-surface-border p-8">
        <div className="space-y-8">

          {/* ── Section 1: Basic Info ─────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Basic Info</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">

              <FormField label="Service Type" required>
                <Select value={form.serviceType} onChange={e => setField('serviceType', e.target.value)}>
                  <option value="Plan">Plan</option>
                  <option value="Other Package">Other Package</option>
                </Select>
              </FormField>

              {form.serviceType === 'Plan' ? (
                <FormField label="Pipeline" required>
                  <Select value={form.pipeline} onChange={e => setField('pipeline', e.target.value)}>
                    <option value="">Select pipeline…</option>
                    <option value="Residential">Residential</option>
                    <option value="Enterprise">Enterprise</option>
                  </Select>
                </FormField>
              ) : (
                <div />
              )}

              <FormField label="Package Type" required>
                <div className="flex items-center gap-6 py-2">
                  {['Public', 'Private'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="packageType"
                        value={opt}
                        checked={form.packageType === opt}
                        onChange={() => setField('packageType', opt)}
                        className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </FormField>

              <div className="flex items-center gap-3 pt-7">
                <input
                  type="checkbox"
                  id="multipleMonth"
                  checked={form.multipleMonthPricing}
                  onChange={e => setField('multipleMonthPricing', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <label htmlFor="multipleMonth" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Multiple Month Pricing
                </label>
              </div>

              {form.serviceType === 'Plan' && (
                <div className="col-span-2">
                  <FormField label="Bandwidth Package ID">
                    <Input
                      placeholder="e.g. PKG-001"
                      value={form.bandwidthPackageId}
                      onChange={e => setField('bandwidthPackageId', e.target.value)}
                    />
                  </FormField>
                </div>
              )}

            </div>
          </div>

          {/* ── Section 2: Package Details ────────────────────── */}
          <div className="border-t border-surface-border pt-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Package Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">

              <div className="col-span-2">
                {!form.multipleMonthPricing ? (
                  <FormField label="Package Name" required>
                    <Input
                      placeholder="e.g. 100 Mbps Monthly FTTH"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                    />
                  </FormField>
                ) : (
                  <FormField label="Group Name" required>
                    <Input
                      placeholder="Group Name"
                      value={form.mmpGroupName}
                      onChange={e => setField('mmpGroupName', e.target.value)}
                    />
                  </FormField>
                )}
              </div>

              {!form.multipleMonthPricing && (
                <>
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
                </>
              )}

              {form.multipleMonthPricing && (
                <div className="col-span-2 space-y-4">
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
                          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
                        />
                        <select
                          value={row.billingType}
                          onChange={e => {
                            const rows = form.mmpRows.map((r, j) => j === i ? { ...r, billingType: e.target.value } : r)
                            setField('mmpRows', rows)
                          }}
                          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
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
                            className="w-full pl-7 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
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

                  <FormField label="No Of Recharge" required>
                    <Select value={form.mmpNoOfRecharge} onChange={e => setField('mmpNoOfRecharge', e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              )}

              <FormField label="Sort Order">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.sortOrder}
                  onChange={e => setField('sortOrder', e.target.value)}
                />
              </FormField>

              <FormField label="Speed">
                <Input
                  placeholder="e.g. 100 Mbps"
                  value={form.speed}
                  onChange={e => setField('speed', e.target.value)}
                />
              </FormField>

              <div className="col-span-2">
                <FormField label="Package Info">
                  <Textarea
                    rows={3}
                    placeholder="Comment"
                    value={form.packageInfo}
                    onChange={e => setField('packageInfo', e.target.value)}
                  />
                </FormField>
              </div>

            </div>
          </div>

          {/* ── Section 3: Settings ───────────────────────────── */}
          <div className="border-t border-surface-border pt-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Settings</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">

              <FormField label="Package available" required>
                <div className="flex items-center gap-6 py-1">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="packageAvailable"
                        value={opt}
                        checked={form.packageAvailable === opt}
                        onChange={() => setField('packageAvailable', opt)}
                        className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {form.packageAvailable === 'No' && (
                  <p className="text-xs text-amber-600 mt-1.5">This package not available for new account</p>
                )}
              </FormField>

              <FormField label="Offer Package" required>
                <div className="flex items-center gap-6 py-1">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="offerPackage"
                        value={opt}
                        checked={form.offerPackage === opt}
                        onChange={() => setField('offerPackage', opt)}
                        className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {form.offerPackage === 'Yes' && (
                  <p className="text-xs text-amber-600 mt-1.5">This package will applicable only once</p>
                )}
              </FormField>

              <div className="col-span-2 flex flex-col gap-3 pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.bundleOTT}
                    onChange={e => setField('bundleOTT', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm font-medium text-gray-700">Bundle with OTT</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.doNotIncludeInCalc}
                    onChange={e => setField('doNotIncludeInCalc', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm font-medium text-gray-700">Do not include package amount in calculation</span>
                </label>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-surface-border">
          <Button variant="secondary" onClick={() => navigate('/packages')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave}>
            Save Plan
          </Button>
        </div>
      </div>
    </div>
  )
}
