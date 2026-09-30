import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Copy, Check, Percent, IndianRupee,
  Tag, ToggleLeft, ToggleRight,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import {
  getDiscounts, subscribeDiscounts, saveDiscount,
  setDiscountStatus, deleteDiscount,
} from '../data/discountStore'
import {
  getCoupons, subscribeCoupons, saveCoupon,
  setCouponStatus, deleteCoupon, applyCoupon as validateCoupon,
} from '../data/couponStore'
import { getPlans } from '../data/packagesStore'

const today = new Date().toISOString().split('T')[0]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(validTo) {
  return validTo && today > validTo
}

function TypeBadge({ discountType, value }) {
  if (discountType === 'percentage') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <Percent size={10} />{value}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <IndianRupee size={10} />₹{value}
    </span>
  )
}

function PackageNames({ applicablePackages, plans }) {
  if (!applicablePackages || applicablePackages.includes('all')) return <span className="text-gray-700">All Packages</span>
  const names = applicablePackages.map(id => plans.find(p => p.id === id)?.name ?? id).join(', ')
  return <span className="text-gray-700">{names}</span>
}

function ValidityCell({ validFrom, validTo }) {
  if (isExpired(validTo)) {
    return <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Expired</span>
  }
  return (
    <span className="text-xs text-gray-600">
      {fmtDate(validFrom)} – {validTo ? fmtDate(validTo) : 'No expiry'}
    </span>
  )
}

// ─── Applicable Packages Multi-select ──────────────────────────────────────
function PackageMultiSelect({ value, onChange, plans }) {
  const allSelected = value.includes('all')

  function toggle(id) {
    if (id === 'all') {
      onChange(['all'])
      return
    }
    const next = value.filter(v => v !== 'all')
    if (next.includes(id)) {
      const removed = next.filter(v => v !== id)
      onChange(removed.length ? removed : ['all'])
    } else {
      onChange([...next, id])
    }
  }

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden divide-y divide-surface-border">
      <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onChange(['all'])}
          className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
        />
        <span className="text-sm text-gray-700 font-medium">All Packages</span>
      </label>
      {plans.map(p => (
        <label key={p.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 ${allSelected ? 'opacity-40 pointer-events-none' : ''}`}>
          <input
            type="checkbox"
            checked={!allSelected && value.includes(p.id)}
            onChange={() => toggle(p.id)}
            className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
          />
          <span className="text-sm text-gray-700">{p.name}</span>
          <span className="text-xs text-gray-400 ml-auto">₹{p.price.toLocaleString('en-IN')}</span>
        </label>
      ))}
    </div>
  )
}

// ─── Discount Modal ─────────────────────────────────────────────────────────
function DiscountModal({ existing, onClose, plans }) {
  const [name, setName] = useState(existing?.name ?? '')
  const [discountType, setDiscountType] = useState(existing?.discountType ?? 'percentage')
  const [value, setValue] = useState(existing?.value ?? '')
  const [applicablePackages, setApplicablePackages] = useState(existing?.applicablePackages ?? ['all'])
  const [validFrom, setValidFrom] = useState(existing?.validFrom ?? today)
  const [validTo, setValidTo] = useState(existing?.validTo ?? '')
  const [noExpiry, setNoExpiry] = useState(!existing?.validTo)
  const [maxUses, setMaxUses] = useState(existing?.maxUses ?? 0)
  const [unlimited, setUnlimited] = useState(!existing?.maxUses)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Required'
    if (!value || Number(value) <= 0) e.value = 'Must be > 0'
    if (!applicablePackages.length) e.packages = 'Select at least one'
    if (!validFrom) e.validFrom = 'Required'
    if (!noExpiry && validTo && validTo <= validFrom) e.validTo = 'Must be after Valid From'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    saveDiscount({
      ...(existing || {}),
      name: name.trim(),
      discountType,
      value: Number(value),
      applicablePackages,
      validFrom,
      validTo: noExpiry ? '' : validTo,
      maxUses: unlimited ? 0 : Number(maxUses),
      usedCount: existing?.usedCount ?? 0,
      status: existing?.status ?? true,
    })
    onClose()
  }

  const inputCls = (err) => `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue ${err ? 'border-red-400' : 'border-surface-border'}`

  return (
    <Modal isOpen onClose={onClose} title={existing ? 'Edit Discount' : 'Add Discount'}>
      <div className="space-y-4 py-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Name <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })) }} className={inputCls(errors.name)} placeholder="e.g. Diwali Offer" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type <span className="text-red-500">*</span></label>
          <div className="flex gap-4">
            {['percentage', 'flat'].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={discountType === t} onChange={() => setDiscountType(t)} className="text-brand-blue focus:ring-brand-blue/30" />
                <span className="text-sm text-gray-700">{t === 'percentage' ? 'Percentage' : 'Flat Amount'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">({discountType === 'percentage' ? '%' : '₹'})</span>
          </label>
          <input type="number" min="0.01" step="0.01" value={value} onChange={e => { setValue(e.target.value); setErrors(v => ({ ...v, value: '' })) }} className={inputCls(errors.value)} placeholder="0" />
          {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Packages <span className="text-red-500">*</span></label>
          <PackageMultiSelect value={applicablePackages} onChange={setApplicablePackages} plans={plans} />
          {errors.packages && <p className="text-xs text-red-500 mt-1">{errors.packages}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From <span className="text-red-500">*</span></label>
            <input type="date" value={validFrom} onChange={e => { setValidFrom(e.target.value); setErrors(v => ({ ...v, validFrom: '' })) }} className={inputCls(errors.validFrom)} />
            {errors.validFrom && <p className="text-xs text-red-500 mt-1">{errors.validFrom}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
            <input type="date" value={validTo} disabled={noExpiry} onChange={e => { setValidTo(e.target.value); setErrors(v => ({ ...v, validTo: '' })) }} className={inputCls(errors.validTo)} />
            {errors.validTo && <p className="text-xs text-red-500 mt-1">{errors.validTo}</p>}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer -mt-1">
          <input type="checkbox" checked={noExpiry} onChange={e => { setNoExpiry(e.target.checked); if (e.target.checked) setValidTo('') }} className="rounded border-gray-300 text-brand-blue" />
          <span className="text-sm text-gray-600">No expiry</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
          <input type="number" min="0" value={maxUses} disabled={unlimited} onChange={e => setMaxUses(e.target.value)} className={inputCls(false)} placeholder="0" />
          <label className="flex items-center gap-2 cursor-pointer mt-1.5">
            <input type="checkbox" checked={unlimited} onChange={e => { setUnlimited(e.target.checked); if (e.target.checked) setMaxUses(0) }} className="rounded border-gray-300 text-brand-blue" />
            <span className="text-sm text-gray-600">Unlimited uses</span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Coupon Modal ────────────────────────────────────────────────────────────
function CouponModal({ existing, onClose, plans }) {
  const [code, setCode] = useState(existing?.code ?? '')
  const [discountType, setDiscountType] = useState(existing?.discountType ?? 'percentage')
  const [value, setValue] = useState(existing?.value ?? '')
  const [applicablePackages, setApplicablePackages] = useState(existing?.applicablePackages ?? ['all'])
  const [validFrom, setValidFrom] = useState(existing?.validFrom ?? today)
  const [validTo, setValidTo] = useState(existing?.validTo ?? '')
  const [noExpiry, setNoExpiry] = useState(!existing?.validTo)
  const [usageLimit, setUsageLimit] = useState(existing?.usageLimit ?? 0)
  const [perCustomerLimit, setPerCustomerLimit] = useState(existing?.perCustomerLimit ?? 1)
  const [errors, setErrors] = useState({})

  function autoGenerate() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const result = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setCode(result)
    setErrors(v => ({ ...v, code: '' }))
  }

  function validate() {
    const e = {}
    if (!code.trim()) e.code = 'Required'
    else {
      const duplicate = getCoupons().find(c =>
        c.code.toUpperCase() === code.toUpperCase() && c.id !== existing?.id
      )
      if (duplicate) e.code = 'This code is already in use'
    }
    if (!value || Number(value) <= 0) e.value = 'Must be > 0'
    if (!applicablePackages.length) e.packages = 'Select at least one'
    if (!validFrom) e.validFrom = 'Required'
    if (!noExpiry && validTo && validTo <= validFrom) e.validTo = 'Must be after Valid From'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    saveCoupon({
      ...(existing || {}),
      code: code.trim().toUpperCase(),
      discountType,
      value: Number(value),
      applicablePackages,
      validFrom,
      validTo: noExpiry ? '' : validTo,
      usageLimit: Number(usageLimit),
      perCustomerLimit: Number(perCustomerLimit),
      status: existing?.status ?? true,
    })
    onClose()
  }

  const inputCls = (err) => `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue ${err ? 'border-red-400' : 'border-surface-border'}`

  return (
    <Modal isOpen onClose={onClose} title={existing ? 'Edit Coupon' : 'Add Coupon'}>
      <div className="space-y-4 py-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setErrors(v => ({ ...v, code: '' })) }}
              className={`${inputCls(errors.code)} font-mono`}
              placeholder="e.g. DIWALI20"
            />
            <Button variant="secondary" size="sm" onClick={autoGenerate} className="shrink-0 whitespace-nowrap">Auto-generate</Button>
          </div>
          {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type <span className="text-red-500">*</span></label>
          <div className="flex gap-4">
            {['percentage', 'flat'].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={discountType === t} onChange={() => setDiscountType(t)} className="text-brand-blue focus:ring-brand-blue/30" />
                <span className="text-sm text-gray-700">{t === 'percentage' ? 'Percentage' : 'Flat Amount'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">({discountType === 'percentage' ? '%' : '₹'})</span>
          </label>
          <input type="number" min="0.01" step="0.01" value={value} onChange={e => { setValue(e.target.value); setErrors(v => ({ ...v, value: '' })) }} className={inputCls(errors.value)} placeholder="0" />
          {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Packages <span className="text-red-500">*</span></label>
          <PackageMultiSelect value={applicablePackages} onChange={setApplicablePackages} plans={plans} />
          {errors.packages && <p className="text-xs text-red-500 mt-1">{errors.packages}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From <span className="text-red-500">*</span></label>
            <input type="date" value={validFrom} onChange={e => { setValidFrom(e.target.value); setErrors(v => ({ ...v, validFrom: '' })) }} className={inputCls(errors.validFrom)} />
            {errors.validFrom && <p className="text-xs text-red-500 mt-1">{errors.validFrom}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
            <input type="date" value={validTo} disabled={noExpiry} onChange={e => { setValidTo(e.target.value); setErrors(v => ({ ...v, validTo: '' })) }} className={inputCls(errors.validTo)} />
            {errors.validTo && <p className="text-xs text-red-500 mt-1">{errors.validTo}</p>}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer -mt-1">
          <input type="checkbox" checked={noExpiry} onChange={e => { setNoExpiry(e.target.checked); if (e.target.checked) setValidTo('') }} className="rounded border-gray-300 text-brand-blue" />
          <span className="text-sm text-gray-600">No expiry</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
            <input type="number" min="0" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className={inputCls(false)} placeholder="0 = unlimited" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Per Customer</label>
            <div className="flex flex-col gap-1.5">
              {[{ label: '1 use per customer', v: 1 }, { label: 'Unlimited', v: 0 }].map(opt => (
                <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={perCustomerLimit === opt.v} onChange={() => setPerCustomerLimit(opt.v)} className="text-brand-blue focus:ring-brand-blue/30" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────
function DeleteConfirm({ label, onConfirm, onCancel }) {
  return (
    <Modal isOpen onClose={onCancel} title="Confirm Delete">
      <div className="space-y-4 py-1">
        <p className="text-sm text-gray-600">Delete <span className="font-semibold text-gray-900">{label}</span>? This cannot be undone.</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 border-red-600">Delete</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Discounts Tab ───────────────────────────────────────────────────────────
function DiscountsTab({ plans }) {
  const [discounts, setDiscounts] = useState(getDiscounts)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => subscribeDiscounts(setDiscounts), [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{discounts.length} discount{discounts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setShowModal(true) }}>
          Add Discount
        </Button>
      </div>

      {discounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No discounts yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-surface-border">
              <tr>
                {['DISCOUNT NAME', 'TYPE', 'VALUE', 'APPLICABLE PACKAGES', 'VALIDITY', 'USES', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-white">
              {discounts.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{d.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.discountType === 'percentage' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {d.discountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {d.discountType === 'percentage' ? `${d.value}%` : `₹${d.value}`}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <PackageNames applicablePackages={d.applicablePackages} plans={plans} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ValidityCell validFrom={d.validFrom} validTo={d.validTo} />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                    {d.usedCount} / {d.maxUses === 0 ? '∞' : d.maxUses}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDiscountStatus(d.id, !d.status)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${d.status ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {d.status ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {d.status ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setEditing(d); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleting(d)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <DiscountModal existing={editing} onClose={() => setShowModal(false)} plans={plans} />
      )}
      {deleting && (
        <DeleteConfirm
          label={deleting.name}
          onConfirm={() => { deleteDiscount(deleting.id); setDeleting(null) }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

// ─── Coupons Tab ─────────────────────────────────────────────────────────────
function CouponsTab({ plans }) {
  const [coupons, setCoupons] = useState(getCoupons)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => subscribeCoupons(setCoupons), [])

  function handleCopy(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setShowModal(true) }}>
          Add Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No coupons yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-surface-border">
              <tr>
                {['COUPON CODE', 'TYPE', 'VALUE', 'APPLICABLE PACKAGES', 'VALIDITY', 'USED / LIMIT', 'PER CUSTOMER', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-white">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 group">
                      <span className="font-mono font-semibold text-gray-900 tracking-wider">{c.code}</span>
                      <button
                        onClick={() => handleCopy(c.code)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-brand-blue transition-all"
                        title="Copy"
                      >
                        {copied === c.code ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.discountType === 'percentage' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {c.discountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {c.discountType === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <PackageNames applicablePackages={c.applicablePackages} plans={plans} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ValidityCell validFrom={c.validFrom} validTo={c.validTo} />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                    {c.usedCount} / {c.usageLimit === 0 ? '∞' : c.usageLimit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {c.perCustomerLimit === 1 ? '1 use' : 'Unlimited'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setCouponStatus(c.id, !c.status)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${c.status ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {c.status ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {c.status ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setEditing(c); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <div className="relative group/del">
                        <button
                          onClick={() => { if (c.usedCount === 0) setDeleting(c) }}
                          disabled={c.usedCount > 0}
                          className={`p-1.5 rounded-lg transition-colors ${c.usedCount > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                          title={c.usedCount > 0 ? 'Cannot delete a coupon that has been used' : 'Delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                        {c.usedCount > 0 && (
                          <div className="absolute right-0 bottom-full mb-1.5 whitespace-nowrap text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover/del:opacity-100 pointer-events-none z-10 transition-opacity">
                            Cannot delete a coupon that has been used
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CouponModal existing={editing} onClose={() => setShowModal(false)} plans={plans} />
      )}
      {deleting && (
        <DeleteConfirm
          label={deleting.code}
          onConfirm={() => { deleteCoupon(deleting.id); setDeleting(null) }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Discounts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'coupons' ? 'coupons' : 'discounts'
  const plans = getPlans().filter(p => p.serviceType === 'Bandwidth' && p.status === 'Active')

  function setTab(t) {
    setSearchParams({ tab: t })
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Discounts &amp; Coupons</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage package-level discounts and coupon codes</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-border">
        <div className="flex gap-1">
          {[{ id: 'discounts', label: 'Discounts' }, { id: 'coupons', label: 'Coupons' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'discounts' ? (
          <DiscountsTab plans={plans} />
        ) : (
          <CouponsTab plans={plans} />
        )}
      </div>
    </div>
  )
}
