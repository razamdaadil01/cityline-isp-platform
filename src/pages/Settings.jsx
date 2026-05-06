import { Save } from 'lucide-react'
import Button from '../components/ui/Button'
import { Input, Select, FormField, Textarea } from '../components/ui/FormInputs'

const SECTIONS = [
  { id: 'company', label: 'Company Info' },
  { id: 'billing', label: 'Billing' },
  { id: 'network', label: 'Network / NMS' },
  { id: 'sms', label: 'SMS / Email' },
  { id: 'users', label: 'Users & Roles' },
]

export default function Settings() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-44 shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((s, i) => (
              <button key={s.id}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${i === 0 ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-card border border-surface-border p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 pb-4 border-b border-surface-border">Company Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company Name" required>
              <Input defaultValue="Cityline Networks Pvt Ltd" />
            </FormField>
            <FormField label="Business Type">
              <Select defaultValue="isp">
                <option value="isp">Internet Service Provider</option>
                <option value="cable">Cable Operator</option>
              </Select>
            </FormField>
            <FormField label="GST Number" required>
              <Input defaultValue="27AABCC1234D1Z5" />
            </FormField>
            <FormField label="License Number">
              <Input defaultValue="MH/ISP/2018/0042" />
            </FormField>
            <FormField label="Contact Email" required>
              <Input type="email" defaultValue="admin@citylinenetworks.in" />
            </FormField>
            <FormField label="Support Phone">
              <Input type="tel" defaultValue="+91 22 4567 8900" />
            </FormField>
          </div>

          <FormField label="Registered Address">
            <Textarea defaultValue="404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Currency">
              <Select defaultValue="inr"><option value="inr">INR (₹)</option></Select>
            </FormField>
            <FormField label="Timezone">
              <Select defaultValue="ist"><option value="ist">Asia/Kolkata (IST, UTC+5:30)</option></Select>
            </FormField>
          </div>

          <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
            <Button variant="secondary" size="sm">Cancel</Button>
            <Button size="sm" icon={<Save size={14} />}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
