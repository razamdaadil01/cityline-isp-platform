export const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT/IMPS', 'Cheque', 'Card', 'Online Gateway']

const LEGACY_MODE_MAP = {
  Online:       'Online Gateway',
  'Android App':'Online Gateway',
  Razorpay:     'Online Gateway',
  NEFT:         'NEFT/IMPS',
  IMPS:         'NEFT/IMPS',
}

export function normalizeMode(mode) {
  return LEGACY_MODE_MAP[mode] || mode || 'Cash'
}
