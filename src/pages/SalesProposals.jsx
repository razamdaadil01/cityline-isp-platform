import { useState, useRef } from 'react'
import {
  Plus, FileText, Download, Eye, Edit3, Trash2,
  Copy, CheckCircle, Send, CornerDownRight, PenLine,
  Variable, AlertCircle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

// ── Constants ─────────────────────────────────────────────────────────────────

const VARIABLES = [
  { key: '{{customer_name}}', label: 'Customer Name'    },
  { key: '{{phone}}',         label: 'Phone'            },
  { key: '{{area}}',          label: 'Area'             },
  { key: '{{plan_name}}',     label: 'Plan Name'        },
  { key: '{{monthly_price}}', label: 'Monthly Price'    },
  { key: '{{connection_type}}',label:'Connection Type'  },
  { key: '{{address}}',       label: 'Address'          },
  { key: '{{sales_agent}}',   label: 'Sales Agent'      },
  { key: '{{date}}',          label: 'Date'             },
]

const SAMPLE_DATA = {
  '{{customer_name}}':  'Ramesh Nair',
  '{{phone}}':          '9876001122',
  '{{area}}':           'Koramangala',
  '{{plan_name}}':      '100 Mbps Home',
  '{{monthly_price}}':  '999',
  '{{connection_type}}':'Fiber Optic',
  '{{address}}':        'No. 42, 3rd Cross, Koramangala, Bengaluru - 560034',
  '{{sales_agent}}':    'Arjun Kumar',
  '{{date}}':           new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
}

const DEFAULT_TEMPLATE = `Dear {{customer_name}},

We are pleased to present our internet connectivity proposal for your consideration.

PROPOSED SERVICE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan Name        : {{plan_name}}
Monthly Price    : ₹{{monthly_price}}/month
Connection Type  : {{connection_type}}
Service Area     : {{area}}
Customer Phone   : {{phone}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INCLUSIONS

• High-speed fiber internet connectivity
• 24/7 customer support — dedicated helpline
• Free professional installation and router
• 99.9% uptime SLA guarantee
• No hidden charges — transparent billing

This proposal has been prepared by {{sales_agent}} specifically for your requirements at {{address}}.

Please review the details and revert at your earliest convenience. We look forward to serving you.

Warm regards,
{{sales_agent}}
Cityline Networks Pvt Ltd
Proposed on: {{date}}


ACCEPTANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CUSTOMER SIGNATURE]`

const PIPELINES = ['B2C', 'B2B', 'ILL', 'Custom']
const STATUSES  = ['Draft', 'Sent', 'Accepted', 'Rejected']

const STATUS_BADGE   = { Draft: 'gray', Sent: 'blue', Accepted: 'green', Rejected: 'red' }
const PIPELINE_BADGE = { B2C: 'blue', B2B: 'navy', ILL: 'purple', Custom: 'orange' }

const INIT_PROPOSALS = [
  {
    id: 'PR-001', customer: 'Meena Iyer', phone: '9123887766',
    pipeline: 'B2B', status: 'Sent',
    created: '2026-05-14', content: DEFAULT_TEMPLATE,
  },
  {
    id: 'PR-002', customer: 'Sanjay Rao', phone: '9654321098',
    pipeline: 'ILL', status: 'Draft',
    created: '2026-05-15', content: DEFAULT_TEMPLATE,
  },
  {
    id: 'PR-003', customer: 'Ramesh Nair', phone: '9876001122',
    pipeline: 'B2C', status: 'Accepted',
    created: '2026-05-12', content: DEFAULT_TEMPLATE,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderContent(content, data) {
  let out = content
  Object.entries(data).forEach(([k, v]) => {
    out = out.replace(new RegExp(k.replace(/[{}]/g, '\\$&'), 'g'), v)
  })
  return out
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ── Proposal Editor Modal ─────────────────────────────────────────────────────

function ProposalEditor({ isOpen, onClose, onSave, initial }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(initial ?? {
    customer: '',
    phone: '',
    pipeline: 'B2C',
    status: 'Draft',
    content: DEFAULT_TEMPLATE,
  })
  const [tab, setTab]           = useState('edit')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const textareaRef             = useRef(null)

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function insertAtCursor(text) {
    const ta = textareaRef.current
    if (!ta) { set('content', form.content + text); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const next  = form.content.substring(0, start) + text + form.content.substring(end)
    set('content', next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }

  function insertSignatureBlock() {
    insertAtCursor('\n\n[CUSTOMER SIGNATURE]\n_____________________________\nCustomer Name: ________________\nDate: _________________________\n')
  }

  const previewData = {
    ...SAMPLE_DATA,
    '{{customer_name}}': form.customer || SAMPLE_DATA['{{customer_name}}'],
    '{{phone}}':         form.phone    || SAMPLE_DATA['{{phone}}'],
  }

  const today   = todayISO()
  const refNum  = `REF-${isEdit ? initial.id.replace('PR-', '') : Date.now().toString().slice(-6)}`
  const preview = renderContent(form.content, previewData)

  async function handleGeneratePDF() {
    setGenerating(true)
    setGenError(null)
    try {
      await loadJsPDF()
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const navy   = [15, 39, 68]
      const blue   = [10, 141, 205]
      const orange = [232, 84, 26]

      // ── Header bar ──
      doc.setFillColor(...navy)
      doc.rect(0, 0, 210, 32, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('CITYLINE', 18, 14)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 185, 220)
      doc.text('Networks Pvt Ltd', 18, 20)
      doc.text('Connecting you to what matters.', 18, 25)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE PROPOSAL', 192, 12, { align: 'right' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 185, 220)
      doc.text(`Ref: ${refNum}`, 192, 19, { align: 'right' })
      doc.text(`Date: ${today}`, 192, 24, { align: 'right' })

      // ── Blue accent bar ──
      doc.setFillColor(...blue)
      doc.rect(0, 32, 210, 2, 'F')

      // ── Content ──
      let y = 48

      doc.setTextColor(30, 30, 30)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')

      const formattedContent = preview.replace('[CUSTOMER SIGNATURE]',
        '\n_____________________________\nCustomer Signature\n\nDate: _________________________')

      const lines = doc.splitTextToSize(formattedContent, 168)
      lines.forEach(line => {
        if (y > 265) {
          doc.addPage()
          y = 20
        }
        // Bold lines that look like section headers (ALL CAPS)
        if (line && line === line.toUpperCase() && line.trim().length > 3 && /[A-Z]/.test(line)) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...navy)
        } else {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(40, 40, 40)
        }
        doc.text(line, 20, y)
        y += 5.5
      })

      // ── Orange divider before footer ──
      doc.setDrawColor(...orange)
      doc.setLineWidth(0.8)
      doc.line(20, 274, 190, 274)

      // ── Footer ──
      doc.setFillColor(...navy)
      doc.rect(0, 276, 210, 21, 'F')

      doc.setTextColor(150, 185, 220)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('Cityline Networks Pvt Ltd', 105, 284, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.text('support@cityline.in  |  www.cityline.in  |  1800-XXX-XXXX', 105, 289, { align: 'center' })
      doc.setTextColor(100, 140, 180)
      doc.text('This document is confidential and intended solely for the addressed recipient.', 105, 294, { align: 'center' })

      const customerSlug = (form.customer || 'Customer').replace(/\s+/g, '_')
      doc.save(`Proposal_${customerSlug}_${today}.pdf`)
    } catch (err) {
      setGenError('Failed to load PDF library. Please check your internet connection.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Proposal — ${initial.customer}` : 'New Proposal'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="ghost"
            icon={<Download size={14} />}
            onClick={handleGeneratePDF}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate PDF'}
          </Button>
          <Button onClick={() => {
            onSave({
              ...form,
              id:      isEdit ? initial.id : `PR-${Date.now()}`,
              created: isEdit ? initial.created : todayISO(),
            })
            onClose()
          }}>
            {isEdit ? 'Save Changes' : 'Create Proposal'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {genError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0" />
            {genError}
          </div>
        )}

        {/* Customer + pipeline meta */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Customer Name" required>
            <Input
              value={form.customer}
              onChange={e => set('customer', e.target.value)}
              placeholder="Ramesh Nair"
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              type="tel"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Pipeline">
              <Select value={form.pipeline} onChange={e => set('pipeline', e.target.value)}>
                {PIPELINES.map(p => <option key={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'edit',    label: 'Edit Template', icon: PenLine },
            { id: 'preview', label: 'Preview',       icon: Eye     },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Edit tab */}
        {tab === 'edit' && (
          <div className="flex gap-3" style={{ minHeight: 360 }}>
            {/* Template textarea */}
            <div className="flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={e => set('content', e.target.value)}
                className="flex-1 w-full text-sm border border-surface-border rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-mono leading-relaxed"
                placeholder="Type your proposal content here. Use the variables panel to insert dynamic fields…"
                style={{ minHeight: 360 }}
              />
            </div>

            {/* Variables panel */}
            <div className="w-52 shrink-0 space-y-3">
              <div className="bg-gray-50 border border-surface-border rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <Variable size={12} /> Variables
                </p>
                <p className="text-[10px] text-gray-400">Click to insert at cursor</p>
                <div className="space-y-1">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      onClick={() => insertAtCursor(v.key)}
                      className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue/5 text-gray-700 font-mono transition-colors truncate"
                      title={v.key}
                    >
                      <span className="text-brand-blue font-semibold">{v.key}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={insertSignatureBlock}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:border-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/5 transition-all"
              >
                <CornerDownRight size={13} />
                Signature Block
              </button>
            </div>
          </div>
        )}

        {/* Preview tab */}
        {tab === 'preview' && (
          <div className="bg-gray-100 rounded-xl p-4" style={{ minHeight: 400 }}>
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              {/* Preview header */}
              <div className="px-8 py-5" style={{ backgroundColor: '#0F2744' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white text-xl font-bold tracking-wide">CITYLINE</p>
                    <p className="text-blue-300/70 text-xs mt-0.5">Networks Pvt Ltd</p>
                    <p className="text-blue-300/50 text-xs">Connecting you to what matters.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-bold">SERVICE PROPOSAL</p>
                    <p className="text-blue-300/60 text-xs mt-1">Ref: {refNum}</p>
                    <p className="text-blue-300/60 text-xs">Date: {today}</p>
                  </div>
                </div>
              </div>

              {/* Blue accent */}
              <div className="h-0.5" style={{ backgroundColor: '#0A8DCD' }} />

              {/* Preview content */}
              <div className="px-8 py-6">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {preview}
                </pre>
              </div>

              {/* Preview footer */}
              <div className="px-8 py-3" style={{ backgroundColor: '#0F2744' }}>
                <p className="text-center text-[10px] text-blue-300/60">
                  Cityline Networks Pvt Ltd  |  support@cityline.in  |  www.cityline.in
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ isOpen, onClose, proposal, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Proposal"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Delete</Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Delete proposal for <strong>{proposal?.customer}</strong>? This action cannot be undone.
      </p>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalesProposals() {
  const [proposals, setProposals] = useState(INIT_PROPOSALS)
  const [editing, setEditing]     = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')

  const displayed = filterStatus === 'All'
    ? proposals
    : proposals.filter(p => p.status === filterStatus)

  function saveProposal(p) {
    setProposals(prev => {
      const exists = prev.find(x => x.id === p.id)
      return exists ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]
    })
  }

  function deleteProposal() {
    setProposals(prev => prev.filter(p => p.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Proposals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage customer service proposals</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          New Proposal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: proposals.length,                              color: 'text-gray-700',    bg: 'bg-gray-100'        },
          { label: 'Draft',    value: proposals.filter(p => p.status === 'Draft').length,    color: 'text-gray-600',    bg: 'bg-gray-100'        },
          { label: 'Sent',     value: proposals.filter(p => p.status === 'Sent').length,     color: 'text-brand-blue',  bg: 'bg-brand-blue/10'   },
          { label: 'Accepted', value: proposals.filter(p => p.status === 'Accepted').length, color: 'text-emerald-600', bg: 'bg-emerald-100'     },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['All', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filterStatus === s
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              filterStatus === s ? 'bg-brand-blue/10 text-brand-blue' : 'bg-gray-200 text-gray-500'
            }`}>
              {s === 'All' ? proposals.length : proposals.filter(p => p.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No proposals found</p>
            <p className="text-sm mt-1">Click "New Proposal" to create one</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                {['Customer', 'Pipeline', 'Status', 'Created', 'Actions'].map(h => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                      h === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {displayed.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.customer}</p>
                        {p.phone && <p className="text-xs text-gray-500 font-mono">{p.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={PIPELINE_BADGE[p.pipeline] ?? 'gray'} size="sm">{p.pipeline}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_BADGE[p.status] ?? 'gray'} size="sm">{p.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{p.created}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditing(p) }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        onClick={async () => {
                          // Quick PDF download
                          const proposal = p
                          try {
                            await loadJsPDF()
                            const { jsPDF } = window.jspdf
                            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
                            const navy = [15, 39, 68]; const blue = [10, 141, 205]
                            doc.setFillColor(...navy)
                            doc.rect(0, 0, 210, 32, 'F')
                            doc.setTextColor(255, 255, 255)
                            doc.setFontSize(20); doc.setFont('helvetica', 'bold')
                            doc.text('CITYLINE', 18, 14)
                            doc.setFontSize(8); doc.setFont('helvetica', 'normal')
                            doc.setTextColor(150, 185, 220)
                            doc.text('Networks Pvt Ltd', 18, 20)
                            doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
                            doc.text('SERVICE PROPOSAL', 192, 12, { align: 'right' })
                            doc.setFontSize(8); doc.setFont('helvetica', 'normal')
                            doc.setTextColor(150, 185, 220)
                            doc.text(`Date: ${todayISO()}`, 192, 24, { align: 'right' })
                            doc.setFillColor(...blue)
                            doc.rect(0, 32, 210, 2, 'F')
                            const content = renderContent(proposal.content, {
                              ...SAMPLE_DATA,
                              '{{customer_name}}': proposal.customer,
                              '{{phone}}': proposal.phone || SAMPLE_DATA['{{phone}}'],
                            })
                            let y = 48
                            doc.setTextColor(40, 40, 40); doc.setFontSize(9.5); doc.setFont('helvetica', 'normal')
                            doc.splitTextToSize(content, 168).forEach(line => {
                              if (y > 265) { doc.addPage(); y = 20 }
                              doc.text(line, 20, y); y += 5.5
                            })
                            doc.setFillColor(...navy); doc.rect(0, 276, 210, 21, 'F')
                            doc.setTextColor(150, 185, 220); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
                            doc.text('Cityline Networks Pvt Ltd  |  support@cityline.in', 105, 289, { align: 'center' })
                            doc.save(`Proposal_${proposal.customer.replace(/\s+/g, '_')}_${todayISO()}.pdf`)
                          } catch {}
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-brand-orange hover:bg-brand-orange/5 rounded-lg transition-colors"
                      >
                        <Download size={12} /> PDF
                      </button>
                      <button
                        onClick={() => setDeleting(p)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ProposalEditor
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSave={saveProposal}
        />
      )}
      {editing && (
        <ProposalEditor
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSave={saveProposal}
          initial={editing}
        />
      )}
      {deleting && (
        <DeleteConfirm
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          proposal={deleting}
          onConfirm={deleteProposal}
        />
      )}
    </div>
  )
}
