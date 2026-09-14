import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { KeyRound, XCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input } from '../components/ui/FormInputs'
import { hashPassword, updateUser } from '../data/userStore'
import { getResetToken, validateResetToken, markResetTokenUsed } from '../data/passwordResetStore'

// Demo-grade reset page for passwordResetStore.js's demo-grade token flow —
// see that file's top-of-file comment. Reachable while logged out, same as
// Login.jsx (no RequireAuth gate).
const ERROR_COPY = {
  invalid: "This reset link isn't valid.",
  expired: 'This reset link has expired. Reset links are valid for 30 minutes — ask an admin for a new one.',
  used: 'This reset link has already been used.',
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const status = useMemo(() => validateResetToken(token), [token])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    const entry = getResetToken(token)
    updateUser({ id: entry.userId, password: hashPassword(password) })
    markResetTokenUsed(token)
    navigate('/login', { replace: true, state: { message: 'Password reset — sign in with your new password.' } })
  }

  if (status !== 'valid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-surface-border shadow-card p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle size={22} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">Reset link problem</h1>
          <p className="text-sm text-gray-500 mb-6">{ERROR_COPY[status] ?? ERROR_COPY.invalid}</p>
          <Link to="/login" className="text-sm text-brand-blue font-medium hover:underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-surface-border shadow-card p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
            <KeyRound size={22} className="text-brand-blue" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Set a new password</h1>
          <p className="text-xs text-gray-500 text-center">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="New Password" required>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField label="Confirm Password" required>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </FormField>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" className="w-full justify-center" disabled={!password || !confirm}>
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  )
}
