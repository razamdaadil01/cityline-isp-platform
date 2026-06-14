import React, { useState } from 'react'
import { CheckCircle, Upload, Plus, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STEPS = ['Personal Info', 'Professional Details', 'Services & Pricing', 'KYC Documents', 'Review & Submit']
const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu', 'Kaduna', 'Benin City', 'Onitsha', 'Aba']
const SPECIALIZATIONS_LIST = ['Tax Compliance', 'Audit & Assurance', 'VAT Returns', 'CFO Advisory', 'Payroll Management', 'Bookkeeping', 'Financial Advisory', 'IFRS Reporting', 'Forensic Accounting']
const LANGUAGES_LIST = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin']
const DOC_TYPES = ['ICAN Certificate', 'Government-issued ID (NIN/Passport)', 'Proof of Address', 'Professional Indemnity Insurance']

export default function CPARegister() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '', password: '', confirmPassword: '', photo: null,
    ican: '', icanYear: '', experience: '', specializations: [], languages: [], bio: '', linkedin: '',
    services: [],
    docs: {},
  })
  const [newService, setNewService] = useState({ name: '', price: '', duration: '60 min' })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleSpec = (s) => {
    update('specializations', form.specializations.includes(s)
      ? form.specializations.filter(x => x !== s)
      : [...form.specializations, s])
  }

  const toggleLang = (l) => {
    update('languages', form.languages.includes(l)
      ? form.languages.filter(x => x !== l)
      : [...form.languages, l])
  }

  const addService = () => {
    if (!newService.name || !newService.price) return
    update('services', [...form.services, { id: Date.now(), ...newService }])
    setNewService({ name: '', price: '', duration: '60 min' })
  }

  const removeService = (id) => update('services', form.services.filter(s => s.id !== id))

  const canNext = () => {
    if (step === 0) return form.name && form.email && form.phone && form.city && form.password && form.confirmPassword
    if (step === 1) return form.ican && form.icanYear && form.experience && form.specializations.length > 0 && form.bio
    return true
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1B3A5C] mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-6">Your CPA profile has been submitted for verification. You will receive a confirmation email within 24–48 hours.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <p className="text-sm font-medium text-gray-700">Application Summary</p>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Name</span><span className="font-medium">{form.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">ICAN No.</span><span className="font-medium">{form.ican}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Specializations</span><span className="font-medium">{form.specializations.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Services Listed</span><span className="font-medium">{form.services.length}</span></div>
          </div>
          <button onClick={() => navigate('/cpa/dashboard')} className="w-full py-3 bg-[#1B3A5C] text-white rounded-xl font-medium hover:bg-[#2E75B6] transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1B3A5C] text-white px-4 py-1.5 rounded-full text-sm font-medium mb-4">CPA Connect</div>
          <h1 className="text-3xl font-bold text-[#1B3A5C]">Register as a CPA</h1>
          <p className="text-gray-500 mt-1">Join Nigeria's leading accounting professional network</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  i < step ? 'bg-[#2E75B6] border-[#2E75B6] text-white' :
                  i === step ? 'bg-white border-[#E8541A] text-[#E8541A]' :
                  'bg-white border-gray-200 text-gray-300'
                }`}>{i < step ? <CheckCircle size={14} /> : i + 1}</div>
                <span className="text-[10px] text-gray-400 mt-1 hidden sm:block text-center w-20 leading-tight">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-10 sm:w-16 h-0.5 mb-4 mx-1 ${i < step ? 'bg-[#2E75B6]' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#1B3A5C]">Step {step + 1}: {STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"><Upload size={20} /></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Profile Photo</p>
                  <p className="text-xs text-gray-400">JPG or PNG, max 5MB</p>
                  <button className="mt-1 text-xs text-[#2E75B6] underline">Upload Photo</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name', placeholder: 'e.g. Emeka Okonkwo' },
                  { label: 'Email Address', key: 'email', placeholder: 'your@email.com', type: 'email' },
                  { label: 'Phone Number', key: 'phone', placeholder: '+234 800 000 0000' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input value={form[f.key]} onChange={e => update(f.key, e.target.value)}
                      type={f.type || 'text'} placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">City</label>
                  <select value={form.city} onChange={e => update('city', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">Select city...</option>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
                  <input value={form.password} onChange={e => update('password', e.target.value)}
                    type="password" placeholder="Min 8 characters"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm Password</label>
                  <input value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                    type="password" placeholder="Repeat password"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30 ${
                      form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300' : 'border-gray-200'
                    }`} />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ICAN Number</label>
                  <input value={form.ican} onChange={e => update('ican', e.target.value)}
                    placeholder="ICAN-YYYY-XXXXX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ICAN Year</label>
                  <input value={form.icanYear} onChange={e => update('icanYear', e.target.value)}
                    type="number" placeholder="e.g. 2019"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Experience</label>
                  <select value={form.experience} onChange={e => update('experience', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">Select...</option>
                    <option value="0-2">0–2 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="6-10">6–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Specializations (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS_LIST.map(s => (
                    <button key={s} onClick={() => toggleSpec(s)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.specializations.includes(s)
                          ? 'bg-[#2E75B6] text-white border-[#2E75B6]'
                          : 'border-gray-200 text-gray-600 hover:border-[#2E75B6] hover:text-[#2E75B6]'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Languages</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES_LIST.map(l => (
                    <button key={l} onClick={() => toggleLang(l)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.languages.includes(l)
                          ? 'bg-[#E8541A] text-white border-[#E8541A]'
                          : 'border-gray-200 text-gray-600 hover:border-[#E8541A] hover:text-[#E8541A]'
                      }`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Professional Bio</label>
                <textarea value={form.bio} onChange={e => update('bio', e.target.value)}
                  placeholder="Describe your expertise, experience, and the value you bring to clients..."
                  rows={4} maxLength={500}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                <p className="text-xs text-gray-400 text-right">{form.bio.length}/500</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">LinkedIn URL (optional)</label>
                <input value={form.linkedin} onChange={e => update('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {form.services.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.duration}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-[#1B3A5C] text-sm">₦{parseFloat(s.price).toLocaleString()}</p>
                      <button onClick={() => removeService(s.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gray-600">Add a Service</p>
                <div className="grid grid-cols-3 gap-3">
                  <input value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))}
                    placeholder="Service name"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <input value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))}
                    type="number" placeholder="Price (₦)"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <select value={newService.duration} onChange={e => setNewService(s => ({ ...s, duration: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option>30 min</option><option>45 min</option><option>60 min</option><option>90 min</option><option>120 min</option>
                  </select>
                </div>
                <button onClick={addService}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#2E75B6] text-white rounded-lg text-sm font-medium hover:bg-[#1B3A5C] transition-colors">
                  <Plus size={14} /> Add Service
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Please upload clear copies of the following documents for verification.</p>
              {DOC_TYPES.map(doc => (
                <div key={doc} className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-[#2E75B6] transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.docs[doc] ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {form.docs[doc] ? <CheckCircle size={16} className="text-green-600" /> : <Upload size={16} className="text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{doc}</p>
                      <p className="text-xs text-gray-400">{form.docs[doc] ? 'File uploaded' : 'PDF or JPG, max 10MB'}</p>
                    </div>
                    <button onClick={() => update('docs', { ...form.docs, [doc]: true })}
                      className="text-xs text-[#2E75B6] underline">
                      {form.docs[doc] ? 'Change' : 'Upload'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Please review your information before submitting.</p>
              {[
                { label: 'Full Name', value: form.name },
                { label: 'Email', value: form.email },
                { label: 'Phone', value: form.phone },
                { label: 'City', value: form.city },
                { label: 'ICAN Number', value: form.ican },
                { label: 'Experience', value: form.experience ? `${form.experience} years` : '—' },
                { label: 'Specializations', value: form.specializations.join(', ') || '—' },
                { label: 'Languages', value: form.languages.join(', ') || '—' },
                { label: 'Services Listed', value: `${form.services.length} service(s)` },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-800 text-right max-w-xs">{item.value || '—'}</span>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                By submitting, you agree to our Terms of Service and Privacy Policy. Your profile will be reviewed within 24–48 hours.
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-5">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} /> {step === 0 ? 'Back to Home' : 'Previous'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                canNext() ? 'bg-[#1B3A5C] text-white hover:bg-[#2E75B6]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => setSubmitted(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#E8541A] text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
              Submit Application <CheckCircle size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
