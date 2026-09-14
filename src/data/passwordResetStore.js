// Demo-grade password-reset token store — in-memory only (like every other
// store in this app, it resets on refresh) and with NO real email delivery:
// there's no backend/mail service here, so UserManagement.jsx's "Reset
// Password" action generates a token and shows it directly to the admin
// (who would relay the link to the user out-of-band) instead of emailing
// it. This is a more realistic *shape* than a plaintext password lookup —
// the admin still never sees the user's actual new password, only a
// one-time link — but it is not a production reset flow: a real one issues
// tokens server-side and emails them, never displays one client-side.

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

let _tokens = []

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function createResetToken(userId) {
  const entry = {
    token: randomToken(),
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    used: false,
  }
  _tokens = [..._tokens, entry]
  return entry
}

export function getResetToken(token) {
  return _tokens.find(t => t.token === token) ?? null
}

// One of 'valid' | 'invalid' | 'expired' | 'used' — lets ResetPassword.jsx
// show a distinct message per failure case instead of one generic error.
export function validateResetToken(token) {
  const entry = getResetToken(token)
  if (!entry) return 'invalid'
  if (entry.used) return 'used'
  if (Date.now() > entry.expiresAt) return 'expired'
  return 'valid'
}

export function markResetTokenUsed(token) {
  _tokens = _tokens.map(t => t.token === token ? { ...t, used: true } : t)
}
