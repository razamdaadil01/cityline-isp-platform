import { UserPlus, Trash2 } from 'lucide-react'
import { FormField, Input } from '../ui/FormInputs'

// Shared repeatable-contact editor — originally built for the Add Store
// modal, reused as-is (not duplicated) by the Add/Edit Vendor modal so both
// forms grow/shrink their contact list the same way and stay visually
// consistent. Each contact is a plain { name, phone, email } record; the
// caller owns the array and gets a full replacement back via onChange.
export const EMPTY_CONTACT = { name: '', phone: '', email: '' }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Shared validation so both callers require the same fields (contact person
// required, email format checked only when provided) and produce errors
// keyed the same way ContactsEditor itself looks them up.
export function validateContacts(contacts) {
  const errs = {}
  contacts.forEach((c, i) => {
    if (!c.name.trim()) errs[`contact_${i}_name`] = 'Contact person is required.'
    if (c.email.trim() && !EMAIL_REGEX.test(c.email.trim())) errs[`contact_${i}_email`] = 'Enter a valid email address.'
  })
  return errs
}

export default function ContactsEditor({
  contacts, onChange, errors = {}, clearError = () => {},
  title = 'Contacts', personLabel = 'Contact Person',
  namePlaceholder = 'e.g. Vinod Sharma', phonePlaceholder = 'e.g. 98200 44556', emailPlaceholder = 'e.g. contact@example.com',
}) {
  function setContactField(idx, k, v) {
    onChange(contacts.map((c, i) => i === idx ? { ...c, [k]: v } : c))
    clearError(`contact_${idx}_${k}`)
  }

  function addContact() {
    onChange([...contacts, { ...EMPTY_CONTACT }])
  }

  function removeContact(idx) {
    onChange(contacts.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <button type="button" onClick={addContact} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark">
          <UserPlus size={13} /> Add Another Contact
        </button>
      </div>

      {contacts.map((c, i) => (
        <div key={i} className="rounded-lg border border-surface-border p-3.5 space-y-3 relative">
          {contacts.length > 1 && (
            <button
              type="button"
              onClick={() => removeContact(i)}
              className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 pr-8">
            <FormField label={personLabel} required error={errors[`contact_${i}_name`]}>
              <Input placeholder={namePlaceholder} value={c.name} onChange={e => setContactField(i, 'name', e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <Input placeholder={phonePlaceholder} value={c.phone} onChange={e => setContactField(i, 'phone', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Email" error={errors[`contact_${i}_email`]}>
            <Input type="email" placeholder={emailPlaceholder} value={c.email} onChange={e => setContactField(i, 'email', e.target.value)} />
          </FormField>
        </div>
      ))}
    </div>
  )
}
