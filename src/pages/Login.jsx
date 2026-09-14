import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input } from '../components/ui/FormInputs'
import { login } from '../data/sessionStore'

// Demo-grade login screen for the demo-grade session layer in
// sessionStore.js — a plaintext email/password check against userStore.js's
// seed data, nothing more. Not production authentication.
export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (login(email.trim(), password)) {
      navigate('/', { replace: true })
    } else {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-surface-border shadow-card p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
            <Wifi size={22} className="text-brand-blue" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Cityline ISP Platform</h1>
          <p className="text-xs text-gray-500">Sign in to continue</p>
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
          <FormField label="Password" required>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </FormField>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" className="w-full justify-center" disabled={!email.trim() || !password}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
