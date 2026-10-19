// Company/Entity records are legal billing entities used when a customer's
// Connection Type = Own. Shaped for the Connection Type component on the
// Customer Creation forms (built next), which will filter these by
// status === 'Active' only (BR-7/BR-8).

// Illustrative only — the actual list depends on which payment gateway
// integrations get built.
export const PG_CONNECTIONS = ['Razorpay', 'PayU', 'CCAvenue', 'Cashfree']

// Illustrative only — the actual list depends on which GSP/IRP integration
// gets built for E-Invoicing.
export const GSP_PROVIDERS = ['ClearTax', 'MasterGST', 'Cygnet']

// Standard GSTIN pattern: 2-digit state code + 10-char PAN (5 letters, 4
// digits, 1 letter) + 1 entity code + fixed 'Z' + 1 checksum char.
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function isValidGstin(gstin) {
  return GSTIN_REGEX.test((gstin || '').trim().toUpperCase())
}

// GST state code map — GSTIN first 2 digits → 2-letter state abbreviation.
// Used by getEntityState() and by Billing.jsx's GST computation to determine
// intra-state (CGST+SGST) vs inter-state (IGST) treatment.
export const GST_STATE_CODES = {
  '01':'JK','02':'HP','03':'PB','04':'CH','05':'UT','06':'HR','07':'DL','08':'RJ',
  '09':'UP','10':'BR','11':'SK','12':'AR','13':'NL','14':'MN','15':'MZ','16':'TR',
  '17':'ML','18':'AS','19':'WB','20':'JH','21':'OD','22':'CG','23':'MP','24':'GJ',
  '25':'DD','26':'DN','27':'MH','28':'AP','29':'KA','30':'GA','31':'LD','32':'KL',
  '33':'TN','34':'PY','35':'AN','36':'TS','37':'AP',
}

// Returns the 2-letter state code for an entity: explicit state field wins,
// then falls back to GSTIN prefix lookup (e.g. '27' → 'MH').
export function getEntityState(entity) {
  if (!entity) return ''
  if (entity.state) return entity.state
  const prefix = (entity.gstin || '').slice(0, 2)
  return GST_STATE_CODES[prefix] || ''
}

// Invoice numbering is configured per entity (PRD: "In company give a
// invoice number configuration") rather than as a single global setting —
// see Settings.jsx's CompanyEntityTab "Invoice Numbering" accordion.
// lastIssuedSequence is null until the first invoice is actually issued for
// that entity; getNextInvoiceNumber() below seeds it from startingNumber.
let _companyEntities = [
  {
    id: 1,
    name: 'Cityline Networks Pvt Ltd',
    gstin: '27AABCU9603R1ZM',
    // TODO: set explicit state if GSTIN prefix lookup is insufficient; getEntityState() derives it from GSTIN
    state: '',
    email: 'accounts@citylinenetworks.in',
    address: '404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra',
    // Plain string URL, optional — same shape as productStore.js's imageUrl.
    // No real logos to seed yet, so blank.
    logoUrl: '',
    bank: { bankName: 'HDFC Bank', accountNo: '50100123456789', ifsc: 'HDFC0001234', branch: 'Andheri West' },
    pgId: 'rzp_live_CitylineNet01',
    pgConnection: 'Razorpay',
    status: 'Active',
    invoicePrefix: 'CL-INV',
    includeYearInNumber: true,
    startingNumber: 1,
    sequencePadding: 4,
    lastIssuedSequence: null,
    // Controls the invoice line-item table's middle column (InvoicePDF.jsx,
    // SalesLeadDetail.jsx's InvoiceModal): package name (default) or an HSN
    // code column alongside it when off — see Settings.jsx's CompanyEntityTab.
    showPackageNameOnInvoice: true,
    // Zoho Books is configured per entity (moved off the old global Settings
    // tab, see Settings.jsx's CompanyEntityTab "Zoho Integration" accordion)
    // — disabled by default, same as a freshly-added entity.
    zohoConfig: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      organizationId: '',
      apiRegion: 'in',
      autoExport: {
        exportInvoices: true,
        exportPayments: true,
        exportCustomerList: false,
        syncChartOfAccounts: false,
      },
    },
    // Tally is configured per entity too, same structure as zohoConfig
    // above — disabled by default (Settings.jsx's CompanyEntityTab "Tally
    // Integration" accordion).
    tallyConfig: {
      enabled: false,
      tallyCompanyName: '',
      serverHost: '',
      port: 9000,
      payloadFields: {
        syncInvoices: true,
        syncPayments: true,
        syncCustomerLedger: false,
        syncGstDetails: false,
      },
    },
    // E-Invoicing (GST) is configured per entity too, same structure as
    // zohoConfig/tallyConfig above — disabled by default (Settings.jsx's
    // CompanyEntityTab "E-Invoicing (GST)" accordion).
    eInvoicingConfig: {
      enabled: false,
      gspProvider: GSP_PROVIDERS[0],
      apiUsername: '',
      apiKey: '',
      irnMode: 'automatic',
    },
  },
  {
    id: 2,
    name: 'Cityline Fiber Solutions LLP',
    gstin: '27AAFCC5678E1ZS',
    state: '',
    email: 'billing@citylinefiber.in',
    address: '12, Business Bay, Bandra Kurla Complex, Mumbai - 400051, Maharashtra',
    logoUrl: '',
    bank: { bankName: 'ICICI Bank', accountNo: '602301987654', ifsc: 'ICIC0006023', branch: 'BKC' },
    pgId: 'rzp_live_CitylineFiber02',
    pgConnection: 'Razorpay',
    status: 'Active',
    invoicePrefix: 'CLF-INV',
    includeYearInNumber: true,
    startingNumber: 1,
    sequencePadding: 4,
    lastIssuedSequence: null,
    showPackageNameOnInvoice: true,
    zohoConfig: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      organizationId: '',
      apiRegion: 'in',
      autoExport: {
        exportInvoices: true,
        exportPayments: true,
        exportCustomerList: false,
        syncChartOfAccounts: false,
      },
    },
    tallyConfig: {
      enabled: false,
      tallyCompanyName: '',
      serverHost: '',
      port: 9000,
      payloadFields: {
        syncInvoices: true,
        syncPayments: true,
        syncCustomerLedger: false,
        syncGstDetails: false,
      },
    },
    eInvoicingConfig: {
      enabled: false,
      gspProvider: GSP_PROVIDERS[0],
      apiUsername: '',
      apiKey: '',
      irnMode: 'automatic',
    },
  },
]
let _nextId = 3

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getCompanyEntities())) }

export function getCompanyEntities() { return [..._companyEntities] }

export function getActiveCompanyEntities() { return _companyEntities.filter(e => e.status === 'Active') }

export function getCompanyEntity(id) { return _companyEntities.find(e => e.id === id) ?? null }

export function subscribeCompanyEntities(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function saveCompanyEntity(entity) {
  const exists = entity.id != null && _companyEntities.some(e => e.id === entity.id)
  if (exists) {
    _companyEntities = _companyEntities.map(e => e.id === entity.id ? { ...e, ...entity } : e)
    notify()
    return entity
  }
  const newEntity = { ...entity, id: _nextId++ }
  _companyEntities = [..._companyEntities, newEntity]
  notify()
  return newEntity
}

export function setCompanyEntityStatus(id, status) {
  _companyEntities = _companyEntities.map(e => e.id === id ? { ...e, status } : e)
  notify()
}

// Formats a sequence number per an entity's invoice numbering config —
// {PREFIX}-{YYYY}-{SEQ} when includeYearInNumber, else {PREFIX}-{SEQ}, with
// SEQ zero-padded to sequencePadding digits. Exported so the Company/Entity
// form's live preview (Settings.jsx) renders using this exact same logic
// rather than a parallel copy that could drift from the real generator.
export function formatInvoiceNumber(entity, seq) {
  const padded = String(seq).padStart(Number(entity.sequencePadding) || 4, '0')
  return entity.includeYearInNumber
    ? `${entity.invoicePrefix}-${new Date().getFullYear()}-${padded}`
    : `${entity.invoicePrefix}-${padded}`
}

// Next invoice number for an entity, mirroring the nextCustomerId()/
// nextSalesLeadId() pattern elsewhere (customersData.js, leadsStore.js):
// reads + advances a persisted per-record counter rather than deriving from
// existing invoice records, so numbers stay sequential even if some
// invoices are later deleted/voided.
//
// TODO: not yet wired into actual invoice creation anywhere — billingData.js's
// MOCK_INVOICES are still hardcoded strings (e.g. 'B2C/26-27/5650'), and the
// Lead Detail Package tab's "Invoice" modal (SalesLeadDetail.jsx) doesn't
// display or request an invoice number at all. Call this wherever a real
// invoice number is actually assigned once that flow exists.
export function getNextInvoiceNumber(entityId) {
  const entity = getCompanyEntity(entityId)
  if (!entity) return null
  const nextSeq = (entity.lastIssuedSequence ?? (Number(entity.startingNumber) - 1)) + 1
  _companyEntities = _companyEntities.map(e => e.id === entityId ? { ...e, lastIssuedSequence: nextSeq } : e)
  notify()
  return formatInvoiceNumber(entity, nextSeq)
}
