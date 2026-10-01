import { saveSlaHours } from './ticketsStore'
import { saveSupportSettings } from './ticketsStore'
import { saveOutageDetectionSettings } from './outagesStore'
import { saveCleaningIntervalDays } from './popAlertsStore'

let _settings = {
  companyName: 'Cityline Networks Pvt Ltd',
  businessType: 'isp',
  gstNumber: '27AABCC1234D1Z5',
  licenseNumber: 'MH/ISP/2018/0042',
  contactEmail: 'admin@citylinenetworks.in',
  supportPhone: '+91 22 4567 8900',
  registeredAddress: '404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra',
  currency: 'inr',
  timezone: 'ist',
  dateFormat: 'dmy',
  language: 'en',
  dueDays: 7,
  lateFeePercent: 2,
  gstRate: 18,
  paymentGateway: 'razorpay',
  invoiceFooterNote: 'Thank you for choosing Cityline Networks. For support, call 022-4567-8900.',
  autoGenerateInvoices: true,
  sendInvoiceWhatsapp: true,
  autoSuspendOnOverdue: false,
  proratedBilling: true,
  allowMultipleOpenComplaints: false,
  slaHoursP1: 4,
  slaHoursP2: 8,
  slaHoursP3: 24,
  slaHoursP4: 72,
  outageTicketThreshold: 5,
  outageTimeWindowMinutes: 60,
  cleaningIntervalDays: 60,
  inventorySettings: {
    entityId: 'ENT-001',
    requirePOApproval: false,
    allowHardwareOutsidePO: false,
    poTerms: 'Payment due within agreed terms. Goods must match PO specification.',
    defaultGST: 18,
    poNumberFormat: 'CITY/PO/{YYYY}/{00001}',
  },
  whatsappBusinessNumber: '+91 98765 43210',
  smsProvider: 'msg91',
  notifications: {
    invoiceGenerated:       { email: true,  sms: false, whatsapp: true  },
    paymentReceived:        { email: true,  sms: true,  whatsapp: false },
    paymentOverdue3:        { email: true,  sms: true,  whatsapp: true  },
    paymentOverdue7:        { email: true,  sms: true,  whatsapp: true  },
    autoSuspensionWarning:  { email: false, sms: true,  whatsapp: true  },
    newConnectionActivated: { email: true,  sms: true,  whatsapp: false },
    serviceSuspended:       { email: false, sms: true,  whatsapp: true  },
    serviceRestored:        { email: false, sms: true,  whatsapp: true  },
    planChanged:            { email: true,  sms: true,  whatsapp: false },
    expiryReminder:         { email: false, sms: true,  whatsapp: true  },
    ticketCreated:          { email: true,  sms: false, whatsapp: false },
    ticketAssigned:         { email: true,  sms: true,  whatsapp: false },
    ticketResolved:         { email: true,  sms: true,  whatsapp: true  },
    slaBreach:              { email: true,  sms: false, whatsapp: false },
    engineerTaskAssigned:   { email: true,  sms: false, whatsapp: true  },
    cafIncompleteReminder:  { email: false, sms: true,  whatsapp: false },
  },
}

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getGeneralSettings())) }

export function getGeneralSettings() {
  return {
    ..._settings,
    notifications: Object.fromEntries(
      Object.entries(_settings.notifications).map(([k, v]) => [k, { ...v }])
    ),
  }
}

export function saveGeneralSettings(data) {
  _settings = {
    ..._settings,
    ...data,
    notifications: data.notifications
      ? Object.fromEntries(Object.entries(data.notifications).map(([k, v]) => [k, { ...v }]))
      : _settings.notifications,
  }

  saveSlaHours({ P1: _settings.slaHoursP1, P2: _settings.slaHoursP2, P3: _settings.slaHoursP3, P4: _settings.slaHoursP4 })
  saveSupportSettings({ allowMultipleOpenComplaints: _settings.allowMultipleOpenComplaints })
  saveOutageDetectionSettings({ ticketCountThreshold: _settings.outageTicketThreshold, timeWindowMinutes: _settings.outageTimeWindowMinutes })
  saveCleaningIntervalDays(_settings.cleaningIntervalDays)

  notify()
}

export function subscribeGeneralSettings(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
