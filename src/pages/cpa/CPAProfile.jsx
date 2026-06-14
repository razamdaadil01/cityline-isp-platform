import React, { useState } from 'react'
import { User, Briefcase, Clock, CreditCard, Bell, Shield, Plus, X, Save } from 'lucide-react'
import { CPA_PROFILE } from '../../data/cpaData'

const TABS = [
  { label: 'Public Profile', icon: User },
  { label: 'Services & Pricing', icon: Briefcase },
  { label: 'Availability', icon: Clock },
  { label: 'Bank & Payouts', icon: CreditCard },
  { label: 'Notifications', icon: Bell },
  { label: 'Security', icon: Shield },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SAMPLE_SERVICES = [
  { id: 1, name: 'Tax Filing', price: 25000, duration: '60 min' },
  { id: 2, name: 'Audit & Assurance', price: 75000, duration: '90 min' },
  { id: 3, name: 'CFO Advisory', price: 120000, duration: '120 min' },
  { id: 4, name: 'VAT Returns', price: 35000, duration: '60 min' },
  { id: 5, name: 'Payroll Management', price: 40000, duration: '60 min' },
]

export default function CPAProfile() {
  const [activeTab, setActiveTab] = useState('Public Profile')
  const [profile, setProfile] = useState({ ...CPA_PROFILE })
  const [services, setServices] = useState(SAMPLE_SERVICES)
  const [newService, setNewService] = useState({ name: '', price: '', duration: '60 min' })
  const [showAddService, setShowAddService] = useState(false)
  const [availability, setAvailability] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { enabled: !['Saturday', 'Sunday'].includes(d), start: '09:00', end: '17:00' } }), {})
  )
  const [notifications, setNotifications] = useState({
    newAppointment: true, appointmentReminder: true, newMessage: true,
    invoicePaid: true, newReview: false, marketingEmails: false,
  })
  const [saved, setSaved] = useState(false)

  const saveProfile = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addService = () => {
    if (!newService.name || !newService.price) return
    setServices(prev => [...prev, { id: Date.now(), ...newService, price: parseFloat(newService.price) }])
    setNewService({ name: '', price: '', duration: '60 min' })
    setShowAddService(false)
  }

  const removeService = (id) => setServices(prev => prev.filter(s => s.id !== id))

  const fmt = (n) => '₦' + n.toLocaleString()

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Profile & Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your professional profile and account settings</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {TABS.map(t => (
            <button key={t.label} onClick={() => setActiveTab(t.label)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === t.label ? 'bg-[#1B3A5C] text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 space-y-5">
          {activeTab === 'Public Profile' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-[#1B3A5C]">Public Profile</h2>
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#E8541A] flex items-center justify-center text-white text-2xl font-bold">
                  EO
                </div>
                <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Change Photo
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name' },
                  { label: 'Email', key: 'email' },
                  { label: 'Phone', key: 'phone' },
                  { label: 'City', key: 'city' },
                  { label: 'ICAN Number', key: 'ican' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input value={profile[f.key] || ''} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Experience</label>
                  <select value={profile.experience} onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="0-2">0–2 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="6-10">6–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Bio</label>
                <textarea value={profile.bio || ''} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={4} maxLength={500}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30 resize-none" />
                <p className="text-xs text-gray-400 text-right mt-1">{(profile.bio || '').length}/500</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map(s => (
                    <span key={s} className="px-3 py-1 bg-[#2E75B6]/10 text-[#2E75B6] rounded-full text-sm">{s}</span>
                  ))}
                </div>
              </div>
              <button onClick={saveProfile}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  saved ? 'bg-green-600 text-white' : 'bg-[#1B3A5C] text-white hover:bg-[#2E75B6]'
                }`}>
                <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'Services & Pricing' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1B3A5C]">Services & Pricing</h2>
                <button onClick={() => setShowAddService(true)}
                  className="flex items-center gap-1.5 bg-[#E8541A] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600">
                  <Plus size={14} /> Add Service
                </button>
              </div>
              <div className="space-y-3">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                    <div>
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.duration}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-[#1B3A5C]">{fmt(s.price)}</p>
                      <button onClick={() => removeService(s.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {showAddService && (
                <div className="border border-[#2E75B6]/30 bg-blue-50 rounded-xl p-4 space-y-3">
                  <h3 className="font-medium text-[#1B3A5C] text-sm">Add New Service</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <input value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))}
                      placeholder="Service name"
                      className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                    <input value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))}
                      type="number" placeholder="Price (₦)"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                    <select value={newService.duration} onChange={e => setNewService(s => ({ ...s, duration: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                      <option>30 min</option>
                      <option>45 min</option>
                      <option>60 min</option>
                      <option>90 min</option>
                      <option>120 min</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addService} className="px-4 py-2 bg-[#2E75B6] text-white rounded-lg text-sm font-medium hover:bg-[#1B3A5C]">Add</button>
                    <button onClick={() => setShowAddService(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Availability' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-[#1B3A5C]">Weekly Availability</h2>
              <div className="space-y-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28 flex items-center gap-2">
                      <button onClick={() => setAvailability(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))}
                        className={`w-9 h-5 rounded-full transition-colors relative ${availability[day].enabled ? 'bg-[#2E75B6]' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${availability[day].enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className={`text-sm ${availability[day].enabled ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{day.slice(0, 3)}</span>
                    </div>
                    {availability[day].enabled ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={availability[day].start}
                          onChange={e => setAvailability(prev => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                        <span className="text-gray-400">to</span>
                        <input type="time" value={availability[day].end}
                          onChange={e => setAvailability(prev => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={saveProfile}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3A5C] text-white rounded-lg text-sm font-medium hover:bg-[#2E75B6] transition-colors">
                <Save size={14} /> Save Availability
              </button>
            </div>
          )}

          {activeTab === 'Bank & Payouts' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-[#1B3A5C]">Bank & Payout Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Bank Name', placeholder: 'e.g. Zenith Bank' },
                  { label: 'Account Name', placeholder: 'Account holder name' },
                  { label: 'Account Number', placeholder: '10-digit account number' },
                  { label: 'BVN', placeholder: 'Bank Verification Number' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Bank details are encrypted and used only for payout processing. Changes require re-verification.
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3A5C] text-white rounded-lg text-sm font-medium hover:bg-[#2E75B6] transition-colors">
                <Save size={14} /> Save Bank Details
              </button>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-[#1B3A5C]">Notification Preferences</h2>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, val]) => {
                  const labels = {
                    newAppointment: 'New appointment booked',
                    appointmentReminder: 'Appointment reminders (24h before)',
                    newMessage: 'New message from client',
                    invoicePaid: 'Invoice paid notification',
                    newReview: 'New review received',
                    marketingEmails: 'Marketing and promotional emails',
                  }
                  return (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{labels[key]}</p>
                      </div>
                      <button onClick={() => setNotifications(prev => ({ ...prev, [key]: !val }))}
                        className={`w-10 h-6 rounded-full transition-colors relative ${val ? 'bg-[#2E75B6]' : 'bg-gray-200'}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${val ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-[#1B3A5C]">Security Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Change Password</h3>
                  <div className="space-y-3">
                    {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                      <div key={label}>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                        <input type="password" placeholder="••••••••"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
                      </div>
                    ))}
                  </div>
                  <button className="mt-3 px-5 py-2 bg-[#1B3A5C] text-white rounded-lg text-sm font-medium hover:bg-[#2E75B6] transition-colors">
                    Update Password
                  </button>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account.</p>
                  <button className="px-5 py-2 border border-[#2E75B6] text-[#2E75B6] rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                    Enable 2FA
                  </button>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
                  <button className="px-5 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                    Deactivate Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
