import { useState } from 'react'
import { KeyRound, Copy, Check } from 'lucide-react'
import Button from './ui/Button'
import { FormField, Input } from './ui/FormInputs'

// The "here's the link that would be emailed" content, shared between
// UserManagement.jsx's admin-triggered Reset Password action (shown inside
// a Modal) and ForgotPassword.jsx's self-service flow (shown inline on the
// page) — same passwordResetStore.js token underneath either way, so both
// surfaces show identical copy. See passwordResetStore.js's top-of-file
// comment for what "demo-grade" means for this whole flow.
export default function ResetLinkPanel({ email, token }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/reset-password?token=${token}`

  function handleCopy() {
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <KeyRound size={15} className="text-brand-blue shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed">
          In production this would be emailed to <span className="font-semibold">{email}</span>.
          There's no email service in this demo — copy the link below and use it (or share it)
          directly. It expires in 30 minutes and can only be used once.
        </p>
      </div>

      <FormField label="Reset Link">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Input readOnly value={link} className="font-mono text-xs" onFocus={e => e.target.select()} />
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </FormField>
    </div>
  )
}
