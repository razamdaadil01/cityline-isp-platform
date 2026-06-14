import React, { useState } from 'react'
import { Search, Grid, List, Upload, FileText, AlertCircle } from 'lucide-react'
import { CPA_DOCUMENTS, CPA_CLIENTS } from '../../data/cpaData'

const EXT_COLORS = {
  pdf: 'bg-red-100 text-red-600',
  xlsx: 'bg-green-100 text-green-600',
  jpg: 'bg-blue-100 text-blue-600',
  png: 'bg-blue-100 text-blue-600',
  docx: 'bg-indigo-100 text-indigo-600',
}

const DocCard = ({ doc }) => {
  const colorClass = EXT_COLORS[doc.ext] || 'bg-gray-100 text-gray-600'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs mb-3 ${colorClass}`}>
        {doc.ext.toUpperCase()}
      </div>
      <p className="font-medium text-gray-800 text-sm leading-tight truncate" title={doc.name}>{doc.name}</p>
      <p className="text-xs text-gray-400 mt-1">{doc.type}</p>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          <p>{doc.clientName}</p>
          <p>{doc.date}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs px-1.5 py-0.5 rounded ${doc.uploadedBy === 'CPA' ? 'bg-[#2E75B6]/10 text-[#2E75B6]' : 'bg-gray-100 text-gray-500'}`}>
            {doc.uploadedBy}
          </span>
          <p className="text-xs text-gray-400 mt-1">{doc.size}</p>
        </div>
      </div>
    </div>
  )
}

export default function CPADocuments() {
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('All')
  const [filterType, setFilterType] = useState('All')

  const filtered = CPA_DOCUMENTS.filter(d => {
    const ms = d.name.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase())
    const mc = filterClient === 'All' || d.clientName === filterClient
    const mt = filterType === 'All' || d.type === filterType
    return ms && mc && mt
  })

  const totalSize = CPA_DOCUMENTS.length
  const byClient = CPA_DOCUMENTS.reduce((acc, d) => { acc[d.clientId] = (acc[d.clientId] || 0) + 1; return acc }, {})
  const topClient = Object.entries(byClient).sort((a, b) => b[1] - a[1])[0]
  const topClientName = CPA_CLIENTS.find(c => c.id === topClient?.[0])?.name

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A5C]">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalSize} files stored</p>
        </div>
        <button className="flex items-center gap-2 bg-[#E8541A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          <Upload size={15} /> Upload Document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: CPA_DOCUMENTS.length },
          { label: 'PDFs', value: CPA_DOCUMENTS.filter(d => d.ext === 'pdf').length },
          { label: 'Spreadsheets', value: CPA_DOCUMENTS.filter(d => d.ext === 'xlsx').length },
          { label: 'Most Active Client', value: topClientName || '—' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-lg font-bold text-[#1B3A5C] mt-1 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30 w-52" />
          </div>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none">
            <option value="All">All Clients</option>
            {CPA_CLIENTS.map(c => <option key={c.id}>{c.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none">
            <option value="All">All Types</option>
            {[...new Set(CPA_DOCUMENTS.map(d => d.type))].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
            <Grid size={15} />
          </button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Pending Document Requests</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Chukwudi Eze — Q1 Bank Statement · Amina Suleiman — Board Resolution Letter
          </p>
        </div>
        <button className="ml-auto text-xs text-amber-700 underline whitespace-nowrap">View All</button>
      </div>

      {/* Document Grid/List */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(doc => <DocCard key={doc.id} doc={doc} />)}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-10 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p>No documents found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'Type', 'Client', 'Uploaded By', 'Date', 'Size'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${EXT_COLORS[d.ext] || 'bg-gray-100 text-gray-600'}`}>
                          {d.ext.toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-800">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{d.type}</td>
                    <td className="px-5 py-3 text-gray-600">{d.clientName}</td>
                    <td className="px-5 py-3 text-gray-500">{d.uploadedBy}</td>
                    <td className="px-5 py-3 text-gray-500">{d.date}</td>
                    <td className="px-5 py-3 text-gray-500">{d.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
