import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Download, CreditCard, Edit2, Building2, MapPin, Phone, FileText,
  ClipboardList, Receipt, Wallet, Plus,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import { getVendor, subscribeVendors, recordVendorPayment } from '../../data/vendorStore'

const TABS = ['Purchase History', 'Ledger Statement', 'Purchase Orders', 'Payments']
const TAB_SLUGS = {
  'Purchase History': 'purchase-history',
  'Ledger Statement': 'ledger-statement',
  'Purchase Orders': 'purchase-orders',
  'Payments': 'payments',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

const PAYMENT_METHODS = ['Bank Transfer / NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash']

function EmptyStateTable({ columns, icon: Icon = FileText }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/60 border-b border-surface-border">
            {columns.map(c => (
              <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} className="px-4 py-14 text-center text-sm text-gray-400">
              <Icon size={28} className="mx-auto mb-2 text-gray-200" />
              No records yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RecordPaymentModal({ isOpen, onClose, vendor }) {
  const [form, setForm] = useState({ paymentDate: '', amount: '', method: PAYMENT_METHODS[0], reference: '', notes: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setForm({ paymentDate: new Date().toISOString().slice(0, 10), amount: '', method: PAYMENT_METHODS[0], reference: '', notes: '' })
      setErrors({})
    }
  }, [isOpen])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required.'
    if (form.amount === '' || Number.isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = 'Enter a valid payment amount.'
    if (!form.reference.trim()) errs.reference = 'Transaction / reference number is required.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    recordVendorPayment(vendor.id, { amount: Number(form.amount), paymentDate: form.paymentDate })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Record Payment" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<CreditCard size={14} />} onClick={handleSave}>Save Payment</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 flex items-center justify-between">
          <span className="font-medium">{vendor.companyName}</span>
          <span className="text-red-600 font-semibold">Outstanding: ₹{vendor.outstanding.toLocaleString('en-IN')}</span>
        </div>
        <FormField label="Payment Date" required error={errors.paymentDate}>
          <Input type="date" value={form.paymentDate} onChange={e => setField('paymentDate', e.target.value)} />
        </FormField>
        <FormField label="Amount" required error={errors.amount}>
          <Input type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setField('amount', e.target.value)} />
        </FormField>
        <FormField label="Payment Method" required>
          <Select value={form.method} onChange={e => setField('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </FormField>
        <FormField label="Transaction / Reference Number" required error={errors.reference}>
          <Input placeholder="e.g. UTR12345678" value={form.reference} onChange={e => setField('reference', e.target.value)} />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={2} placeholder="Optional note" value={form.notes} onChange={e => setField('notes', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}

export default function VendorDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()

  // Subscribing (without using the list directly) just forces a re-render
  // whenever vendorStore changes, so the getVendor(id) lookup below always
  // reflects the latest saved/payment-recorded state.
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeVendors(() => forceRerender(n => n + 1)), [])
  const vendor = getVendor(id)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const activeTab = SLUG_TO_TAB[tab] ?? 'Purchase History'

  useEffect(() => {
    if (vendor && !tab) navigate(`/inventory/vendors/${id}/purchase-history`, { replace: true })
  }, [id, tab, vendor, navigate])

  if (!vendor) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-10 text-center">
          <p className="text-sm text-gray-500 mb-3">Vendor not found.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/vendors')}>Back to Vendor Management</Button>
        </div>
      </div>
    )
  }

  function setActiveTab(tabName) {
    navigate(`/inventory/vendors/${id}/${TAB_SLUGS[tabName]}`)
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
        <div className="px-5 lg:px-6 xl:px-7 2xl:px-8 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <button onClick={() => navigate('/inventory/vendors')} className="text-gray-400 hover:underline transition-colors">
            Vendor Management
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{vendor.id}</span>
        </div>
        <div className="border-t border-surface-border" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md">
              {vendor.companyName.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{vendor.companyName}</h1>
                <Badge variant={vendor.status === 'active' ? 'green' : 'gray'} dot>{vendor.status === 'active' ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2">
                <span className="font-mono font-semibold text-brand-blue">{vendor.id}</span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1"><Building2 size={12} /> GST: {vendor.gstNumber}</span>
                <span className="text-gray-300">·</span>
                <span>{vendor.primaryContact?.name}</span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1"><Phone size={12} /> {vendor.primaryContact?.phone}</span>
                <span className="text-gray-300">·</span>
                <span>{vendor.paymentTerms}</span>
              </p>
              <p className="text-xs text-gray-400 flex items-start gap-1">
                <MapPin size={12} className="mt-0.5 shrink-0" /> {vendor.address}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Purchases', value: `₹${vendor.totalPurchases.toLocaleString('en-IN')}`, color: 'text-gray-900' },
              { label: 'Total Paid',      value: `₹${vendor.totalPaid.toLocaleString('en-IN')}`,      color: 'text-emerald-600' },
              { label: 'Outstanding',     value: `₹${vendor.outstanding.toLocaleString('en-IN')}`,     color: vendor.outstanding > 0 ? 'text-red-600' : 'text-emerald-600' },
              { label: 'Last Purchase',   value: vendor.lastPurchaseDate || '—',                       color: 'text-gray-700' },
              { label: 'Last Payment',    value: vendor.lastPaymentDate || '—',                        color: 'text-gray-700' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-border">
            <Button variant="secondary" size="sm" icon={<Download size={13} />}>Export Excel</Button>
            <Button variant="secondary" size="sm" icon={<CreditCard size={13} />} onClick={() => setPaymentModalOpen(true)}>Record Payment</Button>
            <Button variant="secondary" size="sm" icon={<Edit2 size={13} />}>Edit Vendor</Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                ${activeTab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'Purchase History' && (
            <EmptyStateTable icon={ClipboardList} columns={['PO Number', 'Date', 'Items', 'Quantity', 'Amount', 'Status']} />
          )}
          {activeTab === 'Ledger Statement' && (
            <EmptyStateTable icon={Receipt} columns={['Date', 'Description', 'Debit', 'Credit', 'Balance']} />
          )}
          {activeTab === 'Purchase Orders' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" icon={<Plus size={14} />} disabled>Create Purchase Order</Button>
              </div>
              <EmptyStateTable icon={ClipboardList} columns={['PO Number', 'Date', 'Expected Delivery', 'Amount', 'Status']} />
            </div>
          )}
          {activeTab === 'Payments' && (
            <EmptyStateTable icon={Wallet} columns={['Payment Date', 'Amount', 'Method', 'Reference No.', 'Notes']} />
          )}
        </div>
      </div>

      <RecordPaymentModal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} vendor={vendor} />
    </div>
  )
}
