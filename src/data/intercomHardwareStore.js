export const HARDWARE_STATUS_CFG = {
  assigned:  { variant: 'blue',   label: 'Assigned'  },
  available: { variant: 'green',  label: 'Available' },
  damaged:   { variant: 'orange', label: 'Damaged'   },
  lost:      { variant: 'red',    label: 'Lost'      },
}

export const DEVICE_TYPES = ['Intercom Panel Unit', 'Handset Unit', 'Power Adapter', 'Cable']

const INIT_HARDWARE = [
  { id: 'IHW-2026-0001', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0001', assignedTo: 'Mohan Das',  customerId: 'IC-CUST-2026-000001', zone: 'Andheri West', assignedDate: '19-06-2026', assignedToWorkOrder: 'IWO-2026-0001', status: 'assigned'  },
  { id: 'IHW-2026-0002', deviceType: 'Handset Unit',        serial: 'ICH-2026-0001', assignedTo: 'Mohan Das',  customerId: 'IC-CUST-2026-000001', zone: 'Andheri West', assignedDate: '19-06-2026', assignedToWorkOrder: 'IWO-2026-0001', status: 'assigned'  },
  { id: 'IHW-2026-0003', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0002', assignedTo: 'Priya Nair', customerId: 'IC-CUST-2026-000002', zone: 'Bandra East',  assignedDate: '22-06-2026', assignedToWorkOrder: 'IWO-2026-0002', status: 'assigned'  },
  { id: 'IHW-2026-0004', deviceType: 'Handset Unit',        serial: 'ICH-2026-0002', assignedTo: null,         customerId: null,                  zone: null,            assignedDate: null,         assignedToWorkOrder: null,            status: 'available' },
  { id: 'IHW-2026-0005', deviceType: 'Power Adapter',       serial: 'IPA-2026-0001', assignedTo: null,         customerId: null,                  zone: null,            assignedDate: null,         assignedToWorkOrder: null,            status: 'damaged'   },
  { id: 'IHW-2026-0006', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0006', assignedTo: null,         customerId: null,                  zone: null,            assignedDate: null,         assignedToWorkOrder: null,            status: 'available' },
  { id: 'IHW-2026-0007', deviceType: 'Handset Unit',        serial: 'ICH-2026-0003', assignedTo: null,         customerId: null,                  zone: null,            assignedDate: null,         assignedToWorkOrder: null,            status: 'available' },
]

let _hardware = [...INIT_HARDWARE]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._hardware])) }

export function getHardware() { return [..._hardware] }

export function getHardwareItem(serial) { return _hardware.find(h => h.serial === serial) ?? null }

export function getAvailableHardware() { return _hardware.filter(h => h.status === 'available') }

export function addHardware(item) {
  _hardware = [item, ..._hardware]
  notify()
  return item
}

export function updateHardware(serial, patch) {
  _hardware = _hardware.map(h => h.serial === serial ? { ...h, ...patch } : h)
  notify()
  return getHardwareItem(serial)
}

export function assignHardwareToWorkOrder(serials, { workOrderId, assignedTo, customerId, zone, assignedDate }) {
  _hardware = _hardware.map(h => serials.includes(h.serial)
    ? { ...h, status: 'assigned', assignedToWorkOrder: workOrderId, assignedTo, customerId, zone, assignedDate }
    : h)
  notify()
}

export function subscribeHardware(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function nextHardwareId() {
  const year = new Date().getFullYear()
  const nums = _hardware
    .map(h => h.id.match(/^IHW-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `IHW-${year}-${String(next).padStart(4, '0')}`
}
