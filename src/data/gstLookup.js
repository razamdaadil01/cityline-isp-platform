// UI-only stub for the GST auto-fetch flow (UI Checklist #7, AC-2/AC-4) — no
// real GST API integration. Any correctly-formatted 15-char GSTIN succeeds
// with mock data; malformed GSTINs fail.
// TODO: replace with a real GST verification API integration.
import { GSTIN_REGEX } from './companyEntities'

const MOCK_GST_RECORDS = {
  '27AABCU9603R1ZM': { legalName: 'Cityline Networks Pvt Ltd', gstType: 'Regular', address: '404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra' },
  '27AAFCC5678E1ZS': { legalName: 'Cityline Fiber Solutions LLP', gstType: 'Regular', address: '12, Business Bay, Bandra Kurla Complex, Mumbai - 400051, Maharashtra' },
}

export function lookupGstin(gstin) {
  const clean = (gstin || '').trim().toUpperCase()
  return new Promise(resolve => {
    setTimeout(() => {
      if (!GSTIN_REGEX.test(clean)) {
        resolve({ success: false, error: 'Invalid GSTIN format — check the 15 characters and try again.' })
        return
      }
      const known = MOCK_GST_RECORDS[clean]
      const pan = clean.slice(2, 12)
      resolve({
        success: true,
        data: {
          pan,
          gstType: known?.gstType ?? 'Regular',
          legalName: known?.legalName ?? `Registered Business (${pan})`,
          address: known?.address ?? '',
        },
      })
    }, 900)
  })
}
