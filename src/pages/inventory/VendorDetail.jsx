import { useState, useEffect, useRef, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Download, CreditCard, Edit2, Building2, MapPin, Phone, FileText,
  ClipboardList, Receipt, Wallet, ChevronDown, Eye, Wrench, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import { getVendor, subscribeVendors, recordVendorPayment, getContacts } from '../../data/vendorStore'
import { getPurchases } from '../../data/purchaseStore'
import { getPurchaseOrders, getPoStatusLabel } from '../../data/purchaseOrderStore'
import { getUnits, getUnitTrail } from '../../data/inventoryLedger'
import { getRepairsByVendor } from '../../data/repairStore'
import { usePermission } from '../../data/rolesStore'
import { exportWorkbook } from '../../utils/excelExport'

// PO statuses that count as "closed" for the Purchase Orders tab's
// Active/Previous split — anything not in this set is still in flight.
const CLOSED_PO_STATUSES = ['Fully Received', 'Cancelled', 'Closed']

// Mirrors PODetail.jsx's own STATUS_BADGE map so a PO's status badge looks
// identical whether viewed from PODetail itself or from this tab.
const PO_STATUS_BADGE = {
  Draft: 'gray',
  'Approval Request': 'yellow',
  'Correction Required': 'red',
  Sent: 'indigo',
  'Partially Received': 'orange',
  'Fully Received': 'green',
  Closed: 'slate',
  Cancelled: 'red',
}

const TABS = ['Purchase History', 'Ledger Statement', 'Purchase Orders', 'Payments', 'Repairing Pending']
const TAB_SLUGS = {
  'Purchase History': 'purchase-history',
  'Ledger Statement': 'ledger-statement',
  'Purchase Orders': 'purchase-orders',
  'Payments': 'payments',
  'Repairing Pending': 'repairing-pending',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

const PAYMENT_METHODS = ['Bank Transfer / NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash']

// Same page size + "Showing X–Y of Z" / Prev-Next-numbered-pages pattern
// already used by Customers.jsx (and AuditLog/OTTManagement/Packages/
// Resellers/Sales/Settings) — generalized into one local component here
// since this page needs it six times (every tab's table, Purchase Orders'
// Active/Previous groups counted separately) rather than the single time
// each of those pages needs it.
const PAGE_SIZE = 10

function paginateSlice(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return { paginated: items.slice((safePage - 1) * pageSize, safePage * pageSize), totalPages, safePage }
}

function TablePagination({ page, totalPages, totalItems, pageSize, onChange, itemLabel = 'results' }) {
  if (totalItems <= pageSize) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
      <p className="text-xs text-gray-500">
        Showing {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${p === page ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

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
    recordVendorPayment(vendor.id, {
      amount: Number(form.amount), paymentDate: form.paymentDate,
      method: form.method, reference: form.reference.trim(), notes: form.notes.trim(),
    })
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

// ── Purchase History line-item drill-down (Qty click) ───────────────────────
// Serial/MAC status comes straight from inventoryLedger.js's per-unit
// records (live status — Available/Assigned to Engineer/etc — not a
// snapshot from receipt time), narrowed to units that actually trace back
// to this specific Purchase.

function LineItemDetailModal({ detail, onClose }) {
  const isOpen = !!detail
  const { purchase, item } = detail ?? {}
  const isSerialOrMac = isOpen && ((item.serials?.length ?? 0) > 0 || (item.macs?.length ?? 0) > 0)
  const units = isSerialOrMac
    ? getUnits({ productId: item.productId, storeId: purchase.storeId }).filter(u => u.purchaseId === purchase.id)
    : []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item?.productName ?? ''} size="sm">
      {isOpen && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <span className="text-gray-500">Purchase</span>
            <span className="font-mono font-semibold text-gray-800">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total Qty Received</span>
            <span className="font-semibold text-gray-900">{item.receivedQty}</span>
          </div>

          {isSerialOrMac ? (
            units.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No serial/MAC records found for this line.</p>
            ) : (
              <div className="border border-surface-border rounded-lg divide-y divide-surface-border max-h-72 overflow-y-auto">
                {units.map(u => (
                  <div key={u.value} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-mono text-gray-700">{u.value}</span>
                    <Badge variant={u.status === 'Available' ? 'green' : 'purple'} size="sm" dot>{u.status}</Badge>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-xs text-gray-400">This product isn't individually serial/MAC tracked — only the total quantity is recorded.</p>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Repairing Pending: serial click → full unit history popup ───────────────
// Reuses inventoryLedger.js's own getUnitTrail(unit) — the same function
// Inventory Overview's Units tab expands inline against a unit row — so a
// unit's purchase/assignment/transfer/repair history reads identically
// whether it's opened from there or from here.

function UnitHistoryModal({ unit, onClose }) {
  const isOpen = !!unit
  const trail = isOpen ? getUnitTrail(unit) : []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={unit ? `${unit.value} · ${unit.serial && unit.mac ? 'Serial + MAC' : unit.kind === 'mac' ? 'MAC' : 'Serial'}` : ''} size="sm">
      {isOpen && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <span className="text-gray-500">Current Status</span>
            <Badge variant={unit.status === 'Available' ? 'green' : unit.status === 'Replaced' ? 'red' : 'purple'} size="sm" dot>{unit.status}</Badge>
          </div>
          <div className="space-y-2">
            {trail.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1 shrink-0" />
                <div>
                  <span className="font-medium text-gray-700">{step.action}</span>
                  <span className="text-gray-400"> — {step.detail}</span>
                  <p className="text-[11px] text-gray-400">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Header "Actions" dropdown (Export Excel / Record Payment / Edit Vendor) ──
// Same trigger + menu pattern as SupportTicketDetail.jsx's HeaderActionsMenu.

function VendorActionsMenu({ onExport, onRecordPayment, canEdit }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" onClick={() => setOpen(o => !o)} iconRight={<ChevronDown size={14} />}>
        Actions
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 bg-white border border-surface-border rounded-xl shadow-lg py-1 text-sm">
          <button
            onClick={() => { setOpen(false); onExport() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={13} className="text-gray-400 shrink-0" /> Export Excel
          </button>
          <button
            onClick={() => { setOpen(false); onRecordPayment() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CreditCard size={13} className="text-gray-400 shrink-0" /> Record Payment
          </button>
          {canEdit && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit Vendor
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function VendorDetail() {
  const canEdit = usePermission('Inventory', 'Edit')

  const { id, tab } = useParams()
  const navigate = useNavigate()

  // Subscribing (without using the list directly) just forces a re-render
  // whenever vendorStore changes, so the getVendor(id) lookup below always
  // reflects the latest saved/payment-recorded state.
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeVendors(() => forceRerender(n => n + 1)), [])
  const vendor = getVendor(id)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [expandedPurchases, setExpandedPurchases] = useState(new Set())
  const [lineDetail, setLineDetail] = useState(null)
  const [unitHistory, setUnitHistory] = useState(null)

  // One page number per paginated table — Active/Previous POs count as two
  // independent tables since they're two independent lists.
  const [purchasePage, setPurchasePage] = useState(1)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [activePOPage, setActivePOPage] = useState(1)
  const [previousPOPage, setPreviousPOPage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [repairPage, setRepairPage] = useState(1)

  function togglePurchaseExpanded(purchaseId) {
    setExpandedPurchases(prev => {
      const next = new Set(prev)
      if (next.has(purchaseId)) next.delete(purchaseId)
      else next.add(purchaseId)
      return next
    })
  }

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

  const vendorPurchases = getPurchases()
    .filter(p => p.vendorId === vendor.id && p.status === 'Confirmed')
    .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
  const payments = vendor.payments ?? []
  // Stored, not recomputed — vendorStore.js's recordVendorPayment() appends a
  // ledger entry itself (PRD Sec 16), so this just reads + chronologically
  // sorts what's already there rather than re-deriving it from Purchases and
  // Payments separately.
  const ledgerRows = [...(vendor.ledgerEntries ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date))
  const vendorPOs = getPurchaseOrders()
    .filter(po => po.vendorId === vendor.id)
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
  const activePOs = vendorPOs.filter(po => !CLOSED_PO_STATUSES.includes(po.status))
  const previousPOs = vendorPOs.filter(po => CLOSED_PO_STATUSES.includes(po.status))

  // Paginated slices — safePage clamps back to the last valid page on its
  // own (e.g. after a payment is recorded and the list re-sorts), so there's
  // no need to reset these page states from anywhere else.
  const purchasePagination = paginateSlice(vendorPurchases, purchasePage, PAGE_SIZE)
  const ledgerPagination = paginateSlice(ledgerRows, ledgerPage, PAGE_SIZE)
  const activePOPagination = paginateSlice(activePOs, activePOPage, PAGE_SIZE)
  const previousPOPagination = paginateSlice(previousPOs, previousPOPage, PAGE_SIZE)
  const paymentsPagination = paginateSlice(payments, paymentsPage, PAGE_SIZE)

  // "Total Amount" = the underlying PO's full order value (grandTotal) —
  // what this purchase was ordered against; falls back to the purchase's
  // own totalPurchaseValue for an Outside PO receipt, since there's no PO
  // to compare it to. "Received Amount" is always totalPurchaseValue itself
  // — it's already derived from receivedQty (see purchaseStore.js's
  // summarizePurchase()), so on a short/partial receipt it's naturally
  // lower than the PO's ordered total.
  const purchaseOrdersById = Object.fromEntries(getPurchaseOrders().map(po => [po.id, po]))
  function totalAmountFor(purchase) {
    const po = purchase.poId ? purchaseOrdersById[purchase.poId] : null
    return po ? po.grandTotal : purchase.totalPurchaseValue
  }

  // Repairing Pending — each repair record's live status/history is read
  // straight off its matching ledger unit (inventoryLedger.js layers the
  // repair record's status onto that same unit), so this tab always shows
  // the current state, not a stale snapshot from when the unit was sent.
  const vendorRepairs = getRepairsByVendor(vendor.id).map(r => ({
    ...r, unit: getUnits({ productId: r.productId }).find(u => u.value === r.value) ?? null,
  }))
  const repairPagination = paginateSlice(vendorRepairs, repairPage, PAGE_SIZE)

  // Purchase Orders tab — one table renderer shared by the Active/Previous
  // groups below so both stay visually identical apart from which POs they
  // list. `allPos` is the full (unpaginated) list, used only for the empty
  // check and pagination's totalItems — `pos` is already the current page's
  // slice.
  function renderPOTable(allPos, pagination, setPage) {
    if (allPos.length === 0) {
      return <EmptyStateTable icon={ClipboardList} columns={['PO Number', 'PO Date', 'Delivery Date', 'Amount', 'Status', 'Action']} />
    }
    return (
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['PO Number', 'PO Date', 'Delivery Date', 'Amount', 'Status', 'Action'].map(c => (
                  <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {pagination.paginated.map(po => (
                <tr key={po.id}>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{po.poNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{po.orderDate}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{po.estimatedDeliveryDate}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{po.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><Badge variant={PO_STATUS_BADGE[po.status] ?? 'gray'} size="sm" dot>{getPoStatusLabel(po.status)}</Badge></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline"
                      title="View Purchase Order"
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={pagination.safePage} totalPages={pagination.totalPages} totalItems={allPos.length} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="purchase orders" />
      </div>
    )
  }

  function handleExport() {
    exportWorkbook(`${vendor.companyName.replace(/\s+/g, '_')}_${vendor.id}.xlsx`, [
      {
        name: 'Purchase History',
        rows: vendorPurchases.map(p => ({
          'Purchase ID': p.id, 'PO Number': p.poNumber ?? 'Outside PO', 'Purchase Date': p.purchaseDate,
          'Store': p.storeName, 'Total Amount': totalAmountFor(p), 'Received Amount': p.totalPurchaseValue,
          'Status': p.status,
        })),
      },
      {
        name: 'Ledger Statement',
        rows: ledgerRows.map(r => ({ Date: r.date, Reference: r.reference, Description: r.description, Debit: r.debit, Credit: r.credit, Balance: r.balance })),
      },
      {
        name: 'Payments',
        rows: payments.map(pay => ({
          'Payment Date': pay.paymentDate, 'Amount': pay.amount, 'Method': pay.method,
          'Reference No.': pay.reference, 'Notes': pay.notes,
        })),
      },
    ])
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
          <div className="flex flex-wrap items-start justify-between gap-5">
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
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} className="shrink-0" />
                    {getContacts(vendor).length === 0 ? '—' : getContacts(vendor).map((c, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-gray-300">, </span>}
                        {c.name}{c.phone ? ` (${c.phone})` : ''}
                      </span>
                    ))}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>{vendor.paymentTerms}</span>
                </p>
                <p className="text-xs text-gray-400 flex items-start gap-1">
                  <MapPin size={12} className="mt-0.5 shrink-0" /> {vendor.address}
                </p>
              </div>
            </div>

            <VendorActionsMenu
              onExport={handleExport}
              onRecordPayment={() => setPaymentModalOpen(true)}
              canEdit={canEdit}
            />
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
            vendorPurchases.length === 0 ? (
              <EmptyStateTable icon={ClipboardList} columns={['Purchase ID', 'PO Number', 'Purchase Date', 'Store', 'Total Amount', 'Received Amount', 'Status', 'Invoice']} />
            ) : (
              <div className="rounded-xl border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-surface-border">
                      {['Purchase ID', 'PO Number', 'Purchase Date', 'Store', 'Total Amount', 'Received Amount', 'Status', 'Invoice'].map(c => (
                        <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {purchasePagination.paginated.map(p => {
                      const isExpanded = expandedPurchases.has(p.id)
                      return (
                        <Fragment key={p.id}>
                          <tr className="cursor-pointer hover:bg-gray-50/50" onClick={() => togglePurchaseExpanded(p.id)}>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <ChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                {p.id}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{p.poNumber ?? 'Outside PO'}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.purchaseDate}</td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.storeName}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{totalAmountFor(p).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{p.totalPurchaseValue.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3"><Badge variant="green" size="sm" dot>{p.status}</Badge></td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => navigate(`/inventory/purchases/${p.id}/invoice`)}
                                className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline"
                                title="View Purchase Invoice"
                              >
                                <Eye size={13} /> View
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50/40">
                              <td colSpan={8} className="px-4 py-3">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400">
                                      <th className="text-left font-semibold py-1">Product Name</th>
                                      <th className="text-right font-semibold py-1 pr-2">Qty (Received)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-surface-border/60">
                                    {p.items.map(it => (
                                      <tr key={it.id}>
                                        <td className="py-1.5 text-gray-700">{it.productName}</td>
                                        <td className="py-1.5 text-right pr-2">
                                          <button
                                            onClick={e => { e.stopPropagation(); setLineDetail({ purchase: p, item: it }) }}
                                            className="font-semibold text-brand-blue hover:underline"
                                          >
                                            {it.receivedQty}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
                </div>
                <TablePagination page={purchasePagination.safePage} totalPages={purchasePagination.totalPages} totalItems={vendorPurchases.length} pageSize={PAGE_SIZE} onChange={setPurchasePage} itemLabel="purchases" />
              </div>
            )
          )}
          {activeTab === 'Ledger Statement' && (
            ledgerRows.length === 0 ? (
              <EmptyStateTable icon={Receipt} columns={['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance']} />
            ) : (
              <div className="rounded-xl border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-surface-border">
                      {['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'].map(c => (
                        <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {ledgerPagination.paginated.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{r.reference || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{r.description}</td>
                        <td className="px-4 py-3 text-xs text-red-600">{r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-emerald-600">{r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">₹{r.balance.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <TablePagination page={ledgerPagination.safePage} totalPages={ledgerPagination.totalPages} totalItems={ledgerRows.length} pageSize={PAGE_SIZE} onChange={setLedgerPage} itemLabel="ledger entries" />
              </div>
            )
          )}
          {activeTab === 'Purchase Orders' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">
                  Active POs <span className="text-gray-400 font-normal normal-case">({activePOs.length})</span>
                </h3>
                {renderPOTable(activePOs, activePOPagination, setActivePOPage)}
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">
                  Previous POs <span className="text-gray-400 font-normal normal-case">({previousPOs.length})</span>
                </h3>
                {renderPOTable(previousPOs, previousPOPagination, setPreviousPOPage)}
              </div>
            </div>
          )}
          {activeTab === 'Payments' && (
            payments.length === 0 ? (
              <EmptyStateTable icon={Wallet} columns={['Payment ID', 'Payment Date', 'Amount', 'Method', 'Reference No.', 'Notes', 'Recorded By']} />
            ) : (
              <div className="rounded-xl border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-surface-border">
                      {['Payment ID', 'Payment Date', 'Amount', 'Method', 'Reference No.', 'Notes', 'Recorded By'].map(c => (
                        <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {paymentsPagination.paginated.map(pay => (
                      <tr key={pay.id}>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{pay.id}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.paymentDate}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.method || '—'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{pay.reference || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{pay.notes || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.recordedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <TablePagination page={paymentsPagination.safePage} totalPages={paymentsPagination.totalPages} totalItems={payments.length} pageSize={PAGE_SIZE} onChange={setPaymentsPage} itemLabel="payments" />
              </div>
            )
          )}
          {activeTab === 'Repairing Pending' && (
            vendorRepairs.length === 0 ? (
              <EmptyStateTable icon={Wrench} columns={['Serial / Unit', 'Product Name', 'Expected Delivery Date', 'Status']} />
            ) : (
              <div className="rounded-xl border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-surface-border">
                      {['Serial / Unit', 'Product Name', 'Expected Delivery Date', 'Status'].map(c => (
                        <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {repairPagination.paginated.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <button
                            onClick={() => r.unit && setUnitHistory(r.unit)}
                            disabled={!r.unit}
                            className="font-mono font-semibold text-brand-blue hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-default"
                            title={r.unit ? 'View unit history' : 'Unit record not found'}
                          >
                            {r.value}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{r.productName}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.expectedDeliveryDate}</td>
                        <td className="px-4 py-3"><Badge variant={r.status === 'In Service' ? 'blue' : 'purple'} size="sm" dot>{(r.unit?.status ?? r.status)}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <TablePagination page={repairPagination.safePage} totalPages={repairPagination.totalPages} totalItems={vendorRepairs.length} pageSize={PAGE_SIZE} onChange={setRepairPage} itemLabel="repair records" />
              </div>
            )
          )}
        </div>
      </div>

      <RecordPaymentModal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} vendor={vendor} />
      <LineItemDetailModal detail={lineDetail} onClose={() => setLineDetail(null)} />
      <UnitHistoryModal unit={unitHistory} onClose={() => setUnitHistory(null)} />
    </div>
  )
}
