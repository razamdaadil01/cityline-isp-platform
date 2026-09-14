import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wifi, KeyRound, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input } from '../components/ui/FormInputs'
import ResetLinkPanel from '../components/ResetLinkPanel'
import { getUsers } from '../data/userStore'
import { createResetToken } from '../data/passwordResetStore'

// Demo-grade self-service "forgot password" entry point — generates a
// token via passwordResetStore.js (see that file's top-of-file comment)
// the same way UserManagement.jsx's admin-triggered "Reset Password"
// action does, and shows it with the same ResetLinkPanel. A real app would
// always show the generic "if this email exists…" message regardless of
// whether it matched, to avoid revealing which emails are registered — but
// since there's no email service here to actually deliver the link, that
// message is only shown on no-match; a match shows the real link directly
// so this flow is actually usable for testing. Reachable while logged out,
// same as Login.jsx and ResetPassword.jsx (no RequireAuth gate).
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [found, setFound] = useState(null) // { email, token } once a match generates a token

  function handleSubmit(e) {
    e.preventDefault()
    const user = getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase())
    setFound(user ? { email: user.email, token: createResetToken(user.id).token } : null)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-surface-border shadow-card p-8">
          {found ? (
            <>
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                  <KeyRound size={22} className="text-brand-blue" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">Password Reset Link</h1>
              </div>
              <ResetLinkPanel email={found.email} token={found.token} />
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Check your email</h1>
              <p className="text-sm text-gray-500">If this email exists, a reset link has been generated.</p>
            </div>
          )}

          <Link to="/login" className="block text-center text-sm text-brand-blue font-medium hover:underline mt-6">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-surface-border shadow-card p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
            <Wifi size={22} className="text-brand-blue" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-xs text-gray-500 text-center">Enter your account email and we'll generate a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" required>
            <Input
              type="email"
              placeholder="you@cityline.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </FormField>

          <Button type="submit" className="w-full justify-center" disabled={!email.trim()}>
            Send Reset Link
          </Button>
        </form>

        <Link to="/login" className="block text-center text-sm text-brand-blue font-medium hover:underline mt-4">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
