import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign, FileText, MessageSquare, Send, Check, X, Plus } from 'lucide-react'
import { CPA_CLIENTS, CPA_APPOINTMENTS, CPA_DOCUMENTS, CPA_INVOICES, CPA_MESSAGES, CPA_ENGAGEMENTS } from '../../data/cpaData'

const fmt = (n) => '₦' + n.toLocaleString()

const StatusBadge = ({ status }) => {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-600',
    Paid: 'bg-green-100 text-green-700',
    Sent: 'bg-blue-100 text-blue-700',
    Overdue: 'bg-red-100 text-red-700',
    Draft: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

const STAGES = ['Initiated', 'In Progress', 'Under Review', 'Pending Approval', 'Completed']

function EngagementCard({ eng }) {
  const [checklist, setChecklist] = useState(eng.checklist)
  const done = checklist.filter(c => c.done).length
  const pct = Math.round((done / checklist.length) * 100)

  const toggle = (id) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[#1B3A5C]">{eng.service}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Due: {eng.dueDate}</p>
        </div>
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{eng.status}</span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{pct}% complete</span>
          <span>{done}/{checklist.length} tasks</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#2E75B6] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stages */}
      <div className="flex items-center gap-0">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i < eng.stage ? 'bg-[#2E75B6] border-[#2E75B6] text-white' :
                i === eng.stage ? 'bg-white border-[#2E75B6] text-[#2E75B6]' :
                'bg-white border-gray-200 text-gray-300'
              }`}>{i + 1}</div>
              <span className="text-[10px] text-gray-400 mt-1 text-center w-14 leading-tight">{stage}</span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${i < eng.stage ? 'bg-[#2E75B6]' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(item.id)}>
            <div className={`w-4 h-4 rounded flex items-center justify-center border ${item.done ? 'bg-[#2E75B6] border-[#2E75B6]' : 'border-gray-300'}`}>
              {item.done && <Check size={10} className="text-white" />}
            </div>
            <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
          </div>
        ))}
      </div>

      {eng.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
          <p className="text-xs text-amber-800">{eng.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function CPAClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = CPA_CLIENTS.find(c => c.id === id)
  const [activeTab, setActiveTab] = useState('Overview')
  const [messages, setMessages] = useState(CPA_MESSAGES[id] || [])
  const [msgInput, setMsgInput] = useState('')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [internalNote, setInternalNote] = useState('')

  const clientAppts = CPA_APPOINTMENTS.filter(a => a.clientId === id)
  const clientDocs = CPA_DOCUMENTS.filter(d => d.clientId === id)
  const clientInvoices = CPA_INVOICES.filter(i => i.clientId === id)
  const clientEngagements = CPA_ENGAGEMENTS.filter(e => e.clientId === id)

  const [invoiceForm, setInvoiceForm] = useState({ service: '', amount: '', note: '' })
  const [invoices, setInvoices] = useState(clientInvoices)

  if (!client) return (
    <div className="p-6 text-center text-gray-500">
      <p>Client not found.</p>
      <button onClick={() => navigate('/cpa/clients')} className="mt-2 text-[#2E75B6] underline">Go back</button>
    </div>
  )

  const TABS = ['Overview', 'Engagements', 'Documents', 'Messages', 'Invoices & Billing']

  const sendMessage = () => {
    if (!msgInput.trim()) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'cpa', text: msgInput.trim(), time: new Date().toISOString().slice(0, 16).replace('T', ' ') }])
    setMsgInput('')
  }

  const createInvoice = () => {
    const amount = parseFloat(invoiceForm.amount) || 0
    const vat = Math.round(amount * 0.075)
    const inv = {
      id: `INV-CPA-NEW-${Date.now()}`,
      clientId: id, clientName: client.name,
      service: invoiceForm.service,
      amount, vat, total: amount + vat,
      issued: new Date().toISOString().slice(0, 10),
      due: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'Draft', avatar: client.avatar,
    }
    setInvoices(prev => [...prev, inv])
    setShowInvoiceModal(false)
    setInvoiceForm({ service: '', amount: '', note: '' })
  }

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/cpa/clients')} className="flex items-center gap-1 text-gray-500 hover:text-[#2E75B6] text-sm">
        <ArrowLeft size={14} /> Back to Clients
      </button>

      {/* Client Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {client.avatar}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#1B3A5C]">{client.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {client.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                client.type === 'Individual' ? 'bg-indigo-100 text-indigo-700' :
                client.type === 'SME' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
              }`}>{client.type}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm text-gray-500"><Phone size={13} /> {client.phone}</span>
              <span className="flex items-center gap-1 text-sm text-gray-500"><Mail size={13} /> {client.email}</span>
              <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin size={13} /> {client.city}</span>
            </div>
            <div className="flex gap-1 mt-2">
              {client.tags.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Appointments', value: client.appointments },
              { label: 'Total Billed', value: fmt(client.totalBilled) },
              { label: 'Outstanding', value: client.outstanding > 0 ? fmt(client.outstanding) : '—' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-bold text-[#1B3A5C]">{m.value}</p>
                <p className="text-xs text-gray-400">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t ? 'border-[#2E75B6] text-[#2E75B6]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-[#1B3A5C] mb-3">Recent Appointments</h3>
              {clientAppts.length === 0 ? <p className="text-sm text-gray-400">No appointments yet.</p> : (
                <div className="space-y-2">
                  {clientAppts.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.service}</p>
                        <p className="text-xs text-gray-400">{a.date} · {a.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{fmt(a.amount)}</p>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-[#1B3A5C] mb-3">Internal Notes</h3>
              <textarea
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
                placeholder="Add private notes about this client..."
                className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30"
              />
              <button className="mt-2 w-full py-2 bg-[#1B3A5C] text-white rounded-lg text-sm font-medium hover:bg-[#2E75B6] transition-colors">
                Save Note
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-[#1B3A5C] mb-3">Client Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Joined</span><span className="font-medium">{client.joinedDate}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Last Activity</span><span className="font-medium">{client.lastActivity}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Client ID</span><span className="font-mono text-xs text-gray-500">{client.id}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Engagements' && (
        <div className="space-y-4">
          {clientEngagements.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No engagements found for this client.</div>
          ) : clientEngagements.map(eng => <EngagementCard key={eng.id} eng={eng} />)}
        </div>
      )}

      {activeTab === 'Documents' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-[#1B3A5C]">Documents ({clientDocs.length})</h3>
          </div>
          {clientDocs.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No documents yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  {['Name', 'Type', 'Uploaded By', 'Date', 'Size'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {clientDocs.map(d => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${d.ext === 'pdf' ? 'bg-red-100 text-red-600' : d.ext === 'xlsx' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {d.ext.toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-800">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{d.type}</td>
                      <td className="px-5 py-3 text-gray-600">{d.uploadedBy}</td>
                      <td className="px-5 py-3 text-gray-500">{d.date}</td>
                      <td className="px-5 py-3 text-gray-500">{d.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Messages' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col" style={{ height: '520px' }}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <p className="font-medium text-[#1B3A5C]">Chat with {client.name}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">No messages yet. Start the conversation!</p>
            ) : messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'cpa' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                  m.from === 'cpa' ? 'bg-[#2E75B6] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.from === 'cpa' ? 'text-white/60' : 'text-gray-400'}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <input
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30"
            />
            <button onClick={sendMessage} className="bg-[#2E75B6] text-white px-4 py-2 rounded-lg hover:bg-[#1B3A5C] transition-colors">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Invoices & Billing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-[#1B3A5C]">Invoices ({invoices.length})</h3>
            <button onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-1.5 bg-[#E8541A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
              <Plus size={14} /> Create Invoice
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  {['Invoice ID', 'Service', 'Amount', 'VAT', 'Total', 'Issued', 'Due', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{inv.id}</td>
                      <td className="px-5 py-3 text-gray-800">{inv.service}</td>
                      <td className="px-5 py-3 text-gray-700">{fmt(inv.amount)}</td>
                      <td className="px-5 py-3 text-gray-500">{fmt(inv.vat)}</td>
                      <td className="px-5 py-3 font-bold text-[#1B3A5C]">{fmt(inv.total)}</td>
                      <td className="px-5 py-3 text-gray-500">{inv.issued}</td>
                      <td className="px-5 py-3 text-gray-500">{inv.due}</td>
                      <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#1B3A5C]">Create Invoice for {client.name}</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Service Description</label>
                <input value={invoiceForm.service} onChange={e => setInvoiceForm(f => ({ ...f, service: e.target.value }))}
                  placeholder="e.g. Tax Filing Q2 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (₦)</label>
                <input value={invoiceForm.amount} onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                  type="number" placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
              </div>
              {invoiceForm.amount && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Amount</span><span>{fmt(parseFloat(invoiceForm.amount) || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VAT (7.5%)</span><span>{fmt(Math.round((parseFloat(invoiceForm.amount) || 0) * 0.075))}</span></div>
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>Total</span><span>{fmt(Math.round((parseFloat(invoiceForm.amount) || 0) * 1.075))}</span></div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowInvoiceModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={createInvoice} className="flex-1 py-2 bg-[#E8541A] text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
