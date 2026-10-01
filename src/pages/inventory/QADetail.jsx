import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ClipboardCheck, CheckCircle, XCircle, Clock, PackageOpen,
  ChevronRight, AlertCircle,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getQARecord, subscribeQARecords, updateQARecord } from '../../data/qaStore'
import { confirmStockFromQA } from '../../data/purchaseStore'

const STATUS_BADGE = {
  Pending: 'yellow',
  'In Progress': 'blue',
  Passed: 'green',
  Failed: 'red',
  'Partially Passed': 'purple',
}

const CONDITIONS = ['', 'Good', 'Acceptable', 'Damaged', 'Defective']

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function computeOverallStatus(items) {
  const anyFailed = items.some(it => (it.failedQty ?? 0) > 0)
  const anyPassed = items.some(it => (it.passedQty ?? 0) > 0)
  const allPassed = items.every(it => (it.failedQty ?? 0) === 0 && (it.passedQty ?? 0) === (it.receivedQty ?? 0))
  const allFailed = items.every(it => (it.passedQty ?? 0) === 0 && (it.failedQty ?? 0) > 0)
  if (allPassed) return 'Passed'
  if (allFailed) return 'Failed'
  if (anyPassed || anyFailed) return 'Partially Passed'
  return 'In Progress'
}

export default function QADetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [record, setRecord] = useState(() => getQARecord(id))

  useEffect(() => {
    return subscribeQARecords(all => {
      setRecord(all.find(r => r.id === id) ?? null)
    })
  }, [id])

  const canEdit = record && (record.status === 'Pending' || record.status === 'In Progress')

  const [items, setItems] = useState(() => record?.items?.map(it => ({ ...it })) ?? [])
  const [remarks, setRemarks] = useState(() => record?.remarks ?? '')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (record) {
      setItems(record.items.map(it => ({ ...it })))
      setRemarks(record.remarks ?? '')
    }
  }, [record?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function updateItem(idx, field, val) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: val }
      if (field === 'passedQty') {
        const passed = Math.max(0, Math.min(Number(val) || 0, it.receivedQty))
        updated.passedQty = passed
        updated.failedQty = it.receivedQty - passed
      }
      return updated
    }))
  }

  const stats = useMemo(() => {
    const totalItems = items.length
    const totalReceived = items.reduce((s, it) => s + (it.receivedQty ?? 0), 0)
    const totalPassed = items.reduce((s, it) => s + (it.passedQty ?? 0), 0)
    const totalFailed = items.reduce((s, it) => s + (it.failedQty ?? 0), 0)
    const passRate = totalReceived > 0 ? Math.round((totalPassed / totalReceived) * 100) : 0
    return { totalItems, totalReceived, totalPassed, totalFailed, passRate }
  }, [items])

  function handleSave() {
    if (!canEdit) return
    setSaving(true)
    updateQARecord(id, {
      status: 'In Progress',
      items: items.map(it => ({ ...it })),
      remarks,
    })
    setSaving(false)
    showToast('Progress saved.')
  }

  function handleSubmit() {
    if (!canEdit) return
    setSubmitting(true)
    const finalStatus = computeOverallStatus(items)
    updateQARecord(id, {
      status: finalStatus,
      items: items.map(it => ({ ...it })),
      remarks,
      inspectedAt: new Date().toISOString(),
    })
    if (finalStatus === 'Passed' || finalStatus === 'Partially Passed') {
      confirmStockFromQA(record.purchaseId)
    }
    setSubmitting(false)
    showToast(`Inspection submitted — ${finalStatus}`, finalStatus === 'Failed' ? 'error' : 'success')
    setTimeout(() => navigate('/inventory/qa'), 1200)
  }

  if (!record) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate('/inventory/qa')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm text-gray-500">QA Inspection</span>
        </div>
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-10 text-center text-sm text-gray-400">
          <AlertCircle size={32} className="mx-auto mb-2 text-gray-200" />
          QA record not found.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory/qa')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
              <span>QA Inspection</span>
              <ChevronRight size={12} />
              <span className="font-mono">{record.id}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-brand-blue shrink-0" />
              {record.id}
              <Badge variant={STATUS_BADGE[record.status] ?? 'gray'} dot size="sm">{record.status}</Badge>
            </h1>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium border border-surface-border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Progress'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1.5 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Inspection'}
            </button>
          </div>
        )}
      </div>

      {/* Body: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Items */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Inspection Items</h2>
              {!canEdit && (
                <span className="text-xs text-gray-400 italic">Read-only — inspection {record.status.toLowerCase()}</span>
              )}
            </div>

            <div className="divide-y divide-surface-border">
              {items.map((it, idx) => (
                <div key={it.purchaseItemId} className="px-4 py-4 space-y-3">
                  {/* Product header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{it.productName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Received: <span className="font-semibold text-gray-600">{it.receivedQty}</span> {it.unit}
                        {it.sku ? <> · SKU: <span className="font-mono">{it.sku}</span></> : null}
                      </p>
                    </div>
                    {!canEdit && (
                      <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                        <span className="text-emerald-600 font-semibold">✓ {it.passedQty} passed</span>
                        {it.failedQty > 0 && <span className="text-red-500 font-semibold">✗ {it.failedQty} failed</span>}
                      </div>
                    )}
                  </div>

                  {/* Editable fields */}
                  {canEdit ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Passed Qty</label>
                        <input
                          type="number"
                          min={0}
                          max={it.receivedQty}
                          value={it.passedQty}
                          onChange={e => updateItem(idx, 'passedQty', e.target.value)}
                          className="w-full border border-surface-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Failed Qty</label>
                        <input
                          type="number"
                          readOnly
                          value={it.failedQty ?? 0}
                          className="w-full border border-surface-border rounded-lg px-2.5 py-1.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Condition</label>
                        <select
                          value={it.condition}
                          onChange={e => updateItem(idx, 'condition', e.target.value)}
                          className="w-full border border-surface-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white"
                        >
                          {CONDITIONS.map(c => <option key={c} value={c}>{c || '— Select —'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Notes</label>
                        <input
                          type="text"
                          value={it.conditionNotes}
                          onChange={e => updateItem(idx, 'conditionNotes', e.target.value)}
                          placeholder="Optional notes…"
                          className="w-full border border-surface-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                      <div><span className="text-gray-400">Condition:</span> <span className="text-gray-700">{it.condition || '—'}</span></div>
                      {it.conditionNotes && <div className="sm:col-span-2"><span className="text-gray-400">Notes:</span> <span className="text-gray-700">{it.conditionNotes}</span></div>}
                    </div>
                  )}

                  {/* Serials */}
                  {it.serials?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 mb-1.5">Serial Numbers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {it.serials.map(s => (
                          <span key={s} className="inline-block font-mono text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MACs */}
                  {it.macs?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 mb-1.5">MAC Addresses</p>
                      <div className="flex flex-wrap gap-1.5">
                        {it.macs.map(m => (
                          <span key={m} className="inline-block font-mono text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 space-y-2">
            <label className="block text-sm font-semibold text-gray-800">Inspection Remarks</label>
            {canEdit ? (
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add overall inspection notes or remarks…"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-600 min-h-[2.5rem]">{record.remarks || <span className="text-gray-400 italic">No remarks.</span>}</p>
            )}
          </div>

          {/* Action buttons (bottom) */}
          {canEdit && (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium border border-surface-border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Progress'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Inspection'}
              </button>
            </div>
          )}
        </div>

        {/* Right: Info + Stats */}
        <div className="space-y-4">
          {/* QA Information */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 pb-1 border-b border-surface-border">QA Information</h2>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">QA ID</dt>
                <dd className="font-mono font-semibold text-brand-blue">{record.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd><Badge variant={STATUS_BADGE[record.status] ?? 'gray'} dot size="sm">{record.status}</Badge></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Purchase No</dt>
                <dd>
                  <Link
                    to={`/inventory/purchases/${record.purchaseId}`}
                    className="font-mono text-brand-blue hover:underline flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    {record.purchaseNumber}
                    <PackageOpen size={10} />
                  </Link>
                </dd>
              </div>
              {record.poNumber && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">PO Number</dt>
                  <dd className="font-mono text-gray-600">{record.poNumber}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-400">Vendor</dt>
                <dd className="text-gray-700 text-right max-w-[160px]">{record.vendorName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Store</dt>
                <dd className="text-gray-700">{record.storeName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Purchase Date</dt>
                <dd className="text-gray-700">{record.purchaseDate || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Inspected By</dt>
                <dd className="text-gray-700">{record.inspectedBy || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Inspected At</dt>
                <dd className="text-gray-500">{fmt(record.inspectedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Created At</dt>
                <dd className="text-gray-500">{fmt(record.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 pb-1 border-b border-surface-border">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Items',    value: stats.totalItems,    icon: ClipboardCheck, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
                { label: 'Total Received', value: stats.totalReceived, icon: PackageOpen,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Passed',         value: stats.totalPassed,   icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Failed',         value: stats.totalFailed,   icon: XCircle,        color: 'text-red-500',    bg: 'bg-red-50' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                      <Icon size={14} className={s.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-gray-900 leading-none">{s.value}</p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pass rate bar */}
            <div className="pt-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Pass Rate</span>
                <span className={`font-semibold ${stats.passRate >= 80 ? 'text-emerald-600' : stats.passRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {stats.passRate}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stats.passRate >= 80 ? 'bg-emerald-500' : stats.passRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${stats.passRate}%` }}
                />
              </div>
            </div>

            {/* Status preview when in progress */}
            {canEdit && stats.totalReceived > 0 && (stats.totalPassed + stats.totalFailed) > 0 && (
              <div className="pt-1 border-t border-surface-border">
                <p className="text-[11px] text-gray-400 mb-1">Expected outcome if submitted now:</p>
                <Badge variant={STATUS_BADGE[computeOverallStatus(items)] ?? 'gray'} dot size="sm">
                  {computeOverallStatus(items)}
                </Badge>
              </div>
            )}
          </div>

          {/* Status hint for pending */}
          {record.status === 'Pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-700">
              <Clock size={14} className="shrink-0 mt-0.5" />
              <p>Fill in passed/failed quantities for each item, then submit to complete this inspection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
