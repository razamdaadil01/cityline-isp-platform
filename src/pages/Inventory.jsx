import { useState, useMemo } from 'react'
import {
  Plus, ArrowRightLeft, UserCheck, PackageCheck,
  Cable, ArrowDownToLine, Send, CheckSquare, Filter,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'

// ── Mock data ────────────────────────────────────────────────────────────────

const STORES = ['All Stores', 'Main Warehouse', 'Andheri Store', 'Bandra Store', 'Thane Store']
const CATEGORIES = ['All Categories', 'CPE', 'Router', 'Cable', 'Fiber', 'Hardware', 'Networking']
const ENGINEERS = ['Rajesh Kumar', 'Suresh Patil', 'Amit Shah', 'Deepak Rao', 'Priya Nair']

const STOCK = [
  { id: 'SKU-001', name: 'ONT Device - ZTE F660', category: 'CPE',     company: 42, engineer: 18, customer: 60,  threshold: 15 },
  { id: 'SKU-002', name: 'TP-Link Router AC1200',  category: 'Router',  company: 8,  engineer: 5,  customer: 62,  threshold: 10 },
  { id: 'SKU-003', name: 'ONT Device - Huawei HG8145V5', category: 'CPE', company: 55, engineer: 12, customer: 48, threshold: 20 },
  { id: 'SKU-004', name: 'SC/APC Connector',       category: 'Fiber',   company: 6,  engineer: 12, customer: 482, threshold: 50 },
  { id: 'SKU-005', name: 'Outdoor Enclosure Box',  category: 'Hardware',company: 2,  engineer: 1,  customer: 28,  threshold: 5  },
  { id: 'SKU-006', name: 'SFP Module 1G',          category: 'Networking', company: 14, engineer: 4, customer: 22, threshold: 8 },
  { id: 'SKU-007', name: 'Cat6 Cable (50m roll)',  category: 'Cable',   company: 22, engineer: 8,  customer: 20,  threshold: 10 },
  { id: 'SKU-008', name: 'Power Adapter 12V',      category: 'Hardware',company: 30, engineer: 10, customer: 55,  threshold: 15 },
  { id: 'SKU-009', name: 'GPON Splitter 1:8',      category: 'Fiber',   company: 4,  engineer: 2,  customer: 14,  threshold: 10 },
  { id: 'SKU-010', name: 'LC/UPC Pigtail',         category: 'Fiber',   company: 18, engineer: 22, customer: 60,  threshold: 20 },
]

const WIRE_MY = [
  { id: 'W-001', type: 'CAT6', length: '200m', store: 'Andheri Store',     assignedTo: 'Rajesh Kumar', date: '2026-04-28' },
  { id: 'W-002', type: 'Fiber OFC', length: '500m', store: 'Main Warehouse', assignedTo: 'Amit Shah',  date: '2026-05-01' },
  { id: 'W-003', type: 'Drop Wire', length: '150m', store: 'Bandra Store',   assignedTo: 'Suresh Patil', date: '2026-05-03' },
]

const WIRE_TRANSFERS = [
  { id: 'WT-001', type: 'CAT6', length: '300m', from: 'Main Warehouse', to: 'Andheri Store', status: 'Pending', date: '2026-05-05' },
  { id: 'WT-002', type: 'Fiber OFC', length: '1km', from: 'Bandra Store', to: 'Thane Store', status: 'In Transit', date: '2026-05-04' },
  { id: 'WT-003', type: 'Drop Wire', length: '200m', from: 'Andheri Store', to: 'Bandra Store', status: 'Completed', date: '2026-04-30' },
]

const WIRE_VERIFICATIONS = [
  { id: 'WV-001', type: 'Fiber OFC', length: '500m', engineer: 'Rajesh Kumar', submittedOn: '2026-05-04', status: 'Pending' },
  { id: 'WV-002', type: 'CAT6',      length: '250m', engineer: 'Suresh Patil', submittedOn: '2026-05-03', status: 'Verified' },
  { id: 'WV-003', type: 'Drop Wire', length: '100m', engineer: 'Deepak Rao',   submittedOn: '2026-05-02', status: 'Rejected' },
]

const WIRE_TYPES = ['CAT6', 'Fiber OFC', 'Drop Wire', 'Co-axial', 'Ethernet']
const TRANSFER_STATUS_VARIANT = { Pending: 'yellow', 'In Transit': 'blue', Completed: 'green' }
const VERIF_STATUS_VARIANT    = { Pending: 'yellow', Verified: 'green', Rejected: 'red' }

// ── Helpers ──────────────────────────────────────────────────────────────────

function stockStatus(row) {
  const available = row.company + row.engineer
  if (available <= 0) return 'critical'
  if (available < row.threshold) return 'low'
  return 'ok'
}
const STATUS_VARIANT = { ok: 'green', low: 'yellow', critical: 'red' }
const STATUS_LABEL   = { ok: 'OK', low: 'Low Stock', critical: 'Critical' }

// ── Sub-components ───────────────────────────────────────────────────────────

function StockRow({ item, onAssign }) {
  const st = stockStatus(item)
  const total = item.company + item.engineer + item.customer
  return (
    <tr className={`hover:bg-gray-50/70 transition-colors ${st === 'critical' ? 'bg-red-50/40' : st === 'low' ? 'bg-amber-50/30' : ''}`}>
      <td className="px-4 py-3 font-medium text-gray-800 text-sm">{item.name}</td>
      <td className="px-4 py-3">
        <Badge variant="gray" size="sm">{item.category}</Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-semibold text-gray-900">{item.company}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-semibold text-brand-blue">{item.engineer}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-medium text-gray-600">{item.customer}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs text-gray-500">{total}</span>
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_VARIANT[st]} dot size="sm">{STATUS_LABEL[st]}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={() => onAssign(item)}>Assign</Button>
        </div>
      </td>
    </tr>
  )
}

// ── Wire Sub-tabs ─────────────────────────────────────────────────────────────

function WireIn({ onAdd }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<ArrowDownToLine size={14} />} onClick={onAdd}>Wire In Entry</Button>
      </div>
      <p className="text-sm text-gray-500 text-center py-8">No wire-in entries today. Click "Wire In Entry" to record received wire stock.</p>
    </div>
  )
}

function MyWire() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/60 border-b border-surface-border">
            {['ID', 'Wire Type', 'Length', 'Store', 'Assigned To', 'Date'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {WIRE_MY.map(w => (
            <tr key={w.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.id}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{w.type}</td>
              <td className="px-4 py-3 text-gray-700">{w.length}</td>
              <td className="px-4 py-3 text-gray-600">{w.store}</td>
              <td className="px-4 py-3 text-brand-blue font-medium">{w.assignedTo}</td>
              <td className="px-4 py-3 text-gray-500">{w.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WireTransfer({ onTransfer }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<ArrowRightLeft size={14} />} onClick={onTransfer}>New Transfer</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              {['ID', 'Wire Type', 'Length', 'From', 'To', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {WIRE_TRANSFERS.map(w => (
              <tr key={w.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{w.type}</td>
                <td className="px-4 py-3 text-gray-700">{w.length}</td>
                <td className="px-4 py-3 text-gray-600">{w.from}</td>
                <td className="px-4 py-3 text-brand-blue font-medium">{w.to}</td>
                <td className="px-4 py-3"><Badge variant={TRANSFER_STATUS_VARIANT[w.status]} size="sm">{w.status}</Badge></td>
                <td className="px-4 py-3 text-gray-500">{w.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WireVerification() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/60 border-b border-surface-border">
            {['ID', 'Wire Type', 'Length', 'Engineer', 'Submitted On', 'Status', 'Action'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {WIRE_VERIFICATIONS.map(w => (
            <tr key={w.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.id}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{w.type}</td>
              <td className="px-4 py-3 text-gray-700">{w.length}</td>
              <td className="px-4 py-3 text-brand-blue font-medium">{w.engineer}</td>
              <td className="px-4 py-3 text-gray-500">{w.submittedOn}</td>
              <td className="px-4 py-3"><Badge variant={VERIF_STATUS_VARIANT[w.status]} size="sm">{w.status}</Badge></td>
              <td className="px-4 py-3">
                {w.status === 'Pending' && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="xs">Verify</Button>
                    <Button variant="ghost" size="xs">Reject</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────

function StockInModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ product: '', qty: '', store: '', vendor: '', date: '', invoice: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock In — Receive Items" size="md"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<PackageCheck size={14} />} onClick={onClose}>Confirm Stock In</Button>
      </>}>
      <div className="space-y-4">
        <FormField label="Product / SKU" required>
          <Select value={form.product} onChange={e => set('product', e.target.value)}>
            <option value="">Select product…</option>
            {STOCK.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantity" required>
            <Input type="number" min="1" placeholder="0" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </FormField>
          <FormField label="Store" required>
            <Select value={form.store} onChange={e => set('store', e.target.value)}>
              <option value="">Select store…</option>
              {STORES.slice(1).map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Vendor Name">
          <Input placeholder="e.g. ZTE India Ltd" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Purchase Date" required>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </FormField>
          <FormField label="Invoice No.">
            <Input placeholder="INV-2026-XXXX" value={form.invoice} onChange={e => set('invoice', e.target.value)} />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}

function AssignEngineerModal({ isOpen, onClose, item }) {
  const [form, setForm] = useState({ engineer: '', qty: '', note: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign to Engineer" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<UserCheck size={14} />} onClick={onClose}>Assign</Button>
      </>}>
      <div className="space-y-4">
        {item && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700">
            <span className="font-medium">{item.name}</span>
            <span className="text-gray-400 ml-2">Company stock: {item.company}</span>
          </div>
        )}
        <FormField label="Engineer" required>
          <Select value={form.engineer} onChange={e => set('engineer', e.target.value)}>
            <option value="">Select engineer…</option>
            {ENGINEERS.map(e => <option key={e}>{e}</option>)}
          </Select>
        </FormField>
        <FormField label="Quantity" required>
          <Input type="number" min="1" placeholder="0" value={form.qty} onChange={e => set('qty', e.target.value)} />
        </FormField>
        <FormField label="Note">
          <Input placeholder="Optional note for engineer" value={form.note} onChange={e => set('note', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}

function StockTransferModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ product: '', from: '', to: '', qty: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock Transfer Between Stores" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<ArrowRightLeft size={14} />} onClick={onClose}>Transfer</Button>
      </>}>
      <div className="space-y-4">
        <FormField label="Product" required>
          <Select value={form.product} onChange={e => set('product', e.target.value)}>
            <option value="">Select product…</option>
            {STOCK.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </FormField>
        <FormField label="From Store" required>
          <Select value={form.from} onChange={e => set('from', e.target.value)}>
            <option value="">Select source…</option>
            {STORES.slice(1).map(s => <option key={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="To Store" required>
          <Select value={form.to} onChange={e => set('to', e.target.value)}>
            <option value="">Select destination…</option>
            {STORES.slice(1).map(s => <option key={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Quantity" required>
          <Input type="number" min="1" placeholder="0" value={form.qty} onChange={e => set('qty', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}

function WireInModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ type: '', length: '', store: '', vendor: '', date: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Wire In — Record Wire Receipt" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<ArrowDownToLine size={14} />} onClick={onClose}>Save Entry</Button>
      </>}>
      <div className="space-y-4">
        <FormField label="Wire Type" required>
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="">Select type…</option>
            {WIRE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Length (metres)" required>
            <Input type="number" min="1" placeholder="500" value={form.length} onChange={e => set('length', e.target.value)} />
          </FormField>
          <FormField label="Store" required>
            <Select value={form.store} onChange={e => set('store', e.target.value)}>
              <option value="">Select store…</option>
              {STORES.slice(1).map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Vendor">
          <Input placeholder="Vendor name" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </FormField>
        <FormField label="Receipt Date" required>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}

function WireTransferModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ type: '', length: '', from: '', to: '', engineer: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Wire Transfer" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Send size={14} />} onClick={onClose}>Initiate Transfer</Button>
      </>}>
      <div className="space-y-4">
        <FormField label="Wire Type" required>
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="">Select type…</option>
            {WIRE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Length (metres)" required>
          <Input type="number" min="1" placeholder="300" value={form.length} onChange={e => set('length', e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="From Store">
            <Select value={form.from} onChange={e => set('from', e.target.value)}>
              <option value="">Source…</option>
              {STORES.slice(1).map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="To Store">
            <Select value={form.to} onChange={e => set('to', e.target.value)}>
              <option value="">Destination…</option>
              {STORES.slice(1).map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Assign to Engineer">
          <Select value={form.engineer} onChange={e => set('engineer', e.target.value)}>
            <option value="">Select engineer (optional)…</option>
            {ENGINEERS.map(e => <option key={e}>{e}</option>)}
          </Select>
        </FormField>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const MAIN_TABS  = ['Stock Register', 'Wire Management']
const WIRE_TABS  = ['Wire In', 'My Wire', 'Wire Transfer', 'Wire Verification']

export default function Inventory() {
  const [mainTab,   setMainTab]   = useState('Stock Register')
  const [wireTab,   setWireTab]   = useState('Wire In')
  const [store,     setStore]     = useState('All Stores')
  const [category,  setCategory]  = useState('All Categories')
  const [assignItem, setAssignItem] = useState(null)

  const [showStockIn,    setShowStockIn]    = useState(false)
  const [showTransfer,   setShowTransfer]   = useState(false)
  const [showWireIn,     setShowWireIn]     = useState(false)
  const [showWireXfer,   setShowWireXfer]   = useState(false)

  const filtered = useMemo(() => STOCK.filter(s =>
    (category === 'All Categories' || s.category === category)
  ), [category])

  const lowCount      = STOCK.filter(s => stockStatus(s) === 'low').length
  const criticalCount = STOCK.filter(s => stockStatus(s) === 'critical').length
  const totalItems    = STOCK.reduce((a, s) => a + s.company + s.engineer + s.customer, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track equipment, CPE devices and stock levels across all stores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<ArrowRightLeft size={14} />} onClick={() => setShowTransfer(true)}>
            Stock Transfer
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowStockIn(true)}>
            Stock In
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total SKUs',     value: STOCK.length,  color: 'text-gray-900' },
          { label: 'Total Units',    value: totalItems,    color: 'text-brand-blue' },
          { label: 'Low Stock',      value: lowCount,      color: 'text-amber-600' },
          { label: 'Critical Stock', value: criticalCount, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {MAIN_TABS.map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${mainTab === t
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Stock Register Tab ── */}
      {mainTab === 'Stock Register' && (
        <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-3">
            <Filter size={14} className="text-gray-400" />
            <Select className="w-44 text-sm py-1.5" value={store} onChange={e => setStore(e.target.value)}>
              {STORES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select className="w-44 text-sm py-1.5" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <span className="ml-auto text-xs text-gray-400">{filtered.length} items</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-gray-50/60">
                  {['Product Name', 'Category', 'Company Stock', 'Engineer Stock', 'Customer Stock', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                      ${['Company Stock','Engineer Stock','Customer Stock','Total'].includes(h) ? 'text-center' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map(item => (
                  <StockRow key={item.id} item={item} onAssign={setAssignItem} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Wire Management Tab ── */}
      {mainTab === 'Wire Management' && (
        <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
          {/* Wire sub-tabs */}
          <div className="flex gap-1 px-5 pt-4 border-b border-surface-border">
            {WIRE_TABS.map(t => (
              <button key={t} onClick={() => setWireTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                  ${wireTab === t
                    ? 'border-brand-blue text-brand-blue bg-blue-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="p-5">
            {wireTab === 'Wire In'           && <WireIn onAdd={() => setShowWireIn(true)} />}
            {wireTab === 'My Wire'           && <MyWire />}
            {wireTab === 'Wire Transfer'     && <WireTransfer onTransfer={() => setShowWireXfer(true)} />}
            {wireTab === 'Wire Verification' && <WireVerification />}
          </div>
        </div>
      )}

      {/* Modals */}
      <StockInModal       isOpen={showStockIn}  onClose={() => setShowStockIn(false)} />
      <StockTransferModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} />
      <AssignEngineerModal
        isOpen={!!assignItem}
        onClose={() => setAssignItem(null)}
        item={assignItem}
      />
      <WireInModal       isOpen={showWireIn}   onClose={() => setShowWireIn(false)} />
      <WireTransferModal isOpen={showWireXfer} onClose={() => setShowWireXfer(false)} />
    </div>
  )
}
