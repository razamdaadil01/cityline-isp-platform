// Demo-grade password-reset token store — in-memory only (like every other
// store in this app, it resets on refresh) and with NO real email delivery:
// there's no backend/mail service here, so both UserManagement.jsx's
// admin-triggered "Reset Password" action and ForgotPassword.jsx's
// self-service flow generate a token and show it directly (via
// ResetLinkPanel) instead of emailing it. This is a more realistic *shape*
// than a plaintext password lookup — nobody but the account owner ever
// learns the resulting password, only a one-time link — but it is not a
// production reset flow: a real one issues tokens server-side and emails
// them, never displays one client-side.
//
// KNOWN LIMITATION: tokens are in-memory only and won't survive opening
// the reset link in a different tab or browser window — that new tab
// loads a fresh copy of this module with an empty _tokens array, so
// ResetPassword.jsx there sees the token as 'invalid' even though it was
// just generated. This will work correctly once a real backend/database
// persists tokens server-side instead of in a page's JS memory. Not fixed
// here on purpose; for now, copy the generated link and open it in the
// SAME tab (or paste it into that tab's address bar) to test the flow
// end-to-end.

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
