// Per-ticket OTP store for the Resolution / Close flow.
// A fresh 6-digit code is generated when staff click "Send OTP to Customer"
// and cleared on a successful verify (one-time use per ticket).
// No SMS gateway is wired up — the generated code is surfaced in the UI
// as a "Demo OTP (SMS not connected)" hint for demo/testing purposes.
const _otps = new Map()

export function generateResolutionOtp(ticketId) {
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  _otps.set(String(ticketId), otp)
  return otp
}

export function verifyResolutionOtp(ticketId, code) {
  const key = String(ticketId)
  const stored = _otps.get(key)
  if (!stored || stored !== String(code ?? '').trim()) return false
  _otps.delete(key)
  return true
}
