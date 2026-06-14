import React, { useState, useRef, useEffect } from 'react'
import { Send, Search } from 'lucide-react'
import { CPA_CLIENTS, CPA_MESSAGES } from '../../data/cpaData'

const CLIENTS_WITH_MESSAGES = CPA_CLIENTS.filter(c => CPA_MESSAGES[c.id])

export default function CPAMessages() {
  const [selectedClientId, setSelectedClientId] = useState(CLIENTS_WITH_MESSAGES[0]?.id || null)
  const [conversations, setConversations] = useState(
    Object.fromEntries(Object.entries(CPA_MESSAGES).map(([k, v]) => [k, [...v]]))
  )
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)

  const selectedClient = CPA_CLIENTS.find(c => c.id === selectedClientId)
  const messages = conversations[selectedClientId] || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedClientId])

  const sendMessage = () => {
    if (!input.trim() || !selectedClientId) return
    setConversations(prev => ({
      ...prev,
      [selectedClientId]: [
        ...(prev[selectedClientId] || []),
        { id: Date.now(), from: 'cpa', text: input.trim(), time: new Date().toISOString().slice(0, 16).replace('T', ' ') }
      ]
    }))
    setInput('')
  }

  const filteredClients = CLIENTS_WITH_MESSAGES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const getLastMessage = (clientId) => {
    const msgs = conversations[clientId] || []
    return msgs[msgs.length - 1]
  }

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Left Panel */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1B3A5C] mb-3">Messages</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredClients.map(c => {
            const last = getLastMessage(c.id)
            return (
              <button key={c.id} onClick={() => setSelectedClientId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                  selectedClientId === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium truncate ${selectedClientId === c.id ? 'text-[#2E75B6]' : 'text-gray-800'}`}>{c.name}</p>
                      {last && <p className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{last.time.slice(5, 10)}</p>}
                    </div>
                    {last && <p className="text-xs text-gray-400 truncate mt-0.5">{last.from === 'cpa' ? 'You: ' : ''}{last.text}</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedClient ? (
          <>
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold">
                {selectedClient.avatar}
              </div>
              <div>
                <p className="font-semibold text-[#1B3A5C]">{selectedClient.name}</p>
                <p className="text-xs text-gray-400">{selectedClient.type} · {selectedClient.city}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.from === 'cpa' ? 'justify-end' : 'justify-start'}`}>
                  {m.from === 'client' && (
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                      {selectedClient.avatar}
                    </div>
                  )}
                  <div className={`max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    m.from === 'cpa'
                      ? 'bg-[#2E75B6] text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                  }`}>
                    <p className="leading-relaxed">{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.from === 'cpa' ? 'text-white/60' : 'text-gray-400'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="bg-white border-t border-gray-200 p-4 flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={`Message ${selectedClient.name}...`}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30"
              />
              <button onClick={sendMessage}
                className="bg-[#2E75B6] text-white px-4 py-2.5 rounded-xl hover:bg-[#1B3A5C] transition-colors flex items-center gap-2">
                <Send size={15} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
