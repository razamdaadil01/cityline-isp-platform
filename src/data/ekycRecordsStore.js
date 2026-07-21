// Mock third-party eKYC provider (Digio-style) records — simulates a bureau of
// previously-completed verifications that can be looked up and reused instead
// of re-sending a new verification link.
const EKYC_RECORDS = [
  { identifier: '9876001890',           docType: 'Aadhaar', docNumberMasked: 'XXXX-XXXX-4521', verifiedAt: '2026-04-02T09:15:00.000Z', provider: 'Digio' },
  { identifier: 'sunita@email.com',     docType: 'Aadhaar', docNumberMasked: 'XXXX-XXXX-7788', verifiedAt: '2026-03-15T11:40:00.000Z', provider: 'Digio' },
  { identifier: '9812340001',           docType: 'PAN',     docNumberMasked: 'XXXXX-9821-X',   verifiedAt: '2026-05-01T14:05:00.000Z', provider: 'Digio' },
]

function normalize(identifier) {
  return (identifier ?? '').trim().toLowerCase()
}

export function findEkycRecord(identifier) {
  const q = normalize(identifier)
  if (!q) return null
  return EKYC_RECORDS.find(r => normalize(r.identifier) === q) ?? null
}

export function getEkycRecords() {
  return [...EKYC_RECORDS]
}
