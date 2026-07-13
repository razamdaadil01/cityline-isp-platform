export const INSTALLATION_ENGINEERS = [
  { id: 'ieng-001', name: 'Suresh Babu',  initials: 'SB', color: 'bg-brand-blue'  },
  { id: 'ieng-002', name: 'Arjun Kumar',  initials: 'AK', color: 'bg-emerald-500' },
  { id: 'ieng-003', name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'  },
  { id: 'ieng-004', name: 'Anita Sharma', initials: 'AS', color: 'bg-teal-500'    },
]

const INIT_INSTALLATIONS = [
  { id: 'IWO-2026-0001', customer: 'Mohan Das',    customerId: 'IC-CUST-2026-000001', phone: '93456 78901', circuitId: 'IC-2026-0001', zone: 'Andheri West', engineer: 'Suresh Babu',   installDate: '20-06-2026', installTime: '10:00', createdDate: '18-06-2026', notes: 'Standard intercom installation', status: 'completed'  },
  { id: 'IWO-2026-0002', customer: 'Priya Nair',   customerId: 'IC-CUST-2026-000002', phone: '98765 43210', circuitId: 'IC-2026-0002', zone: 'Bandra East',  engineer: 'Arjun Kumar',   installDate: '22-06-2026', installTime: '11:00', createdDate: '20-06-2026', notes: 'Plus plan installation with extended handset range', status: 'completed'  },
  { id: 'IWO-2026-0003', customer: 'Suresh Patil', customerId: 'IC-CUST-2026-000003', phone: '99887 76655', circuitId: 'IC-2026-0003', zone: 'Goregaon',     engineer: 'Preethi Nair', installDate: '25-06-2026', installTime: '14:00', createdDate: '23-06-2026', notes: 'In progress — awaiting final signal test', status: 'inprogress' },
  { id: 'IWO-2026-0004', customer: 'Anita Desai',  customerId: 'IC-CUST-2026-000004', phone: '91234 56789', circuitId: 'IC-2026-0004', zone: 'Versova',      engineer: 'Anita Sharma', installDate: '28-06-2026', installTime: '09:30', createdDate: '26-06-2026', notes: 'Awaiting hardware dispatch', status: 'pending'    },
  { id: 'IWO-2026-0005', customer: 'Rajesh Kumar', customerId: 'IC-CUST-2026-000005', phone: '97654 32198', circuitId: 'IC-2026-0005', zone: 'Andheri East', engineer: 'Suresh Babu',   installDate: '30-06-2026', installTime: '15:00', createdDate: '29-06-2026', notes: 'Scheduled installation', status: 'pending'    },
]

let _installations = [...INIT_INSTALLATIONS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._installations])) }

export function getInstallations() { return [..._installations] }

export function getInstallation(id) { return _installations.find(o => o.id === id) ?? null }

export function getInstallationByCustomerId(customerId) {
  return _installations.find(o => o.customerId === customerId) ?? null
}

export function addInstallation(order) {
  _installations = [order, ..._installations]
  notify()
  return order
}

export function updateInstallation(id, patch) {
  _installations = _installations.map(o => o.id === id ? { ...o, ...patch } : o)
  notify()
  return getInstallation(id)
}

export function subscribeInstallations(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function nextInstallationId() {
  const year = new Date().getFullYear()
  const nums = _installations
    .map(o => o.id.match(/^IWO-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `IWO-${year}-${String(next).padStart(4, '0')}`
}
