import React, { useState } from 'react'
import { Users, Calendar, DollarSign, Eye, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { CPA_PROFILE, CPA_APPOINTMENTS, REVENUE_MONTHLY } from '../../data/cpaData'

const fmt = (n) => '₦' + n.toLocaleString()

const StatusBadge = ({ status }) => {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

export default function CPADashboard() {
  const navigate = useNavigate()
  const upcoming = CPA_APPOINTMENTS.filter(a => a.status === 'Pending' || a.status === 'Confirmed').slice(0, 5)
  const monthAppts = CPA_APPOINTMENTS.filter(a => a.date.startsWith('2026-06')).length

  const stats = [
    { label: 'Active Clients', value: CPA_PROFILE.activeClients, icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+2 this month' },
    { label: 'June Appointments', value: monthAppts, icon: Calendar, color: 'bg-amber-50 text-amber-600', trend: '3 pending' },
    { label: 'Monthly Earnings', value: fmt(CPA_PROFILE.monthlyEarnings), icon: DollarSign, color: 'bg-green-50 text-green-600', trend: '+12% vs May' },
    { label: 'Profile Views', value: CPA_PROFILE.profileViews, icon: Eye, color: 'bg-purple-50 text-purple-600', trend: 'Last 30 days' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A5C]">Good morning, {CPA_PROFILE.name.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's your practice overview for June 2026</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-500">
            {'★'.repeat(5)}
          </div>
          <p className="text-sm text-gray-500">{CPA_PROFILE.rating} · {CPA_PROFILE.reviewCount} reviews</p>
        </div>
      </div>

      {/* Compliance Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">FIRS VAT Deadline: June 21, 2026</p>
          <p className="text-xs text-amber-700 mt-0.5">2 clients (Ngozi Adeyemi, Chukwudi Eze) have pending VAT returns. Act now to avoid penalties.</p>
        </div>
        <button className="text-xs text-amber-700 font-medium underline whitespace-nowrap">View Details</button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{s.label}</span>
              <span className={`p-2 rounded-lg ${s.color}`}><s.icon size={15} /></span>
            </div>
            <p className="text-2xl font-bold text-[#1B3A5C]">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.trend}</p>
          </div>
        ))}
      </div>

      {/* Charts + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1B3A5C]">Revenue Trend 2026</h2>
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><TrendingUp size={14} /> +12% MoM</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REVENUE_MONTHLY} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E75B6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2E75B6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '0' : `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => ['₦' + v.toLocaleString(), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#2E75B6" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Month Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-[#1B3A5C]">June Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Completed Sessions', value: '2', icon: CheckCircle, color: 'text-green-500' },
              { label: 'Pending Appointments', value: '3', icon: Clock, color: 'text-amber-500' },
              { label: 'Invoices Sent', value: '2', icon: DollarSign, color: 'text-blue-500' },
              { label: 'Outstanding Balance', value: '₦195,000', icon: AlertTriangle, color: 'text-red-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <item.icon size={14} className={item.color} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-[#1B3A5C]">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-2 bg-[#1B3A5C] rounded-lg p-3 text-center">
            <p className="text-white/70 text-xs">June Earnings</p>
            <p className="text-white text-xl font-bold">₦485,000</p>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-[#1B3A5C]">Upcoming Appointments</h2>
          <button onClick={() => navigate('/cpa/appointments')} className="text-[#2E75B6] text-sm font-medium flex items-center gap-1 hover:underline">
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Client</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Service</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Date & Time</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Amount</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(apt => (
                <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold">
                        {apt.clientName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{apt.clientName}</p>
                        <p className="text-xs text-gray-400">{apt.clientType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{apt.service}</td>
                  <td className="px-5 py-3 text-gray-600">{apt.date} · {apt.time}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{fmt(apt.amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={apt.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-[#1B3A5C] mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { text: 'Tunde Bakare uploaded Income Statement 2025.pdf', time: '2 hours ago', icon: '📄' },
            { text: 'New appointment booked by Ngozi Adeyemi for Payroll Management', time: '5 hours ago', icon: '📅' },
            { text: 'Invoice INV-CPA-003 sent to Ifeanyi Okafor', time: '1 day ago', icon: '🧾' },
            { text: 'Review received from Tunde Bakare — 5 stars', time: '2 days ago', icon: '⭐' },
            { text: 'Appointment completed with Blessing Osei — Bookkeeping', time: '3 days ago', icon: '✅' },
          ].map((act, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-base">{act.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{act.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
