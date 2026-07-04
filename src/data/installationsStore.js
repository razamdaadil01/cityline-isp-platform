export const FIELD_ENGINEERS = [
  { id: 'eng-001', name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'  },
  { id: 'eng-002', name: 'Preethi Nair', initials: 'PN', color: 'bg-emerald-500' },
  { id: 'eng-003', name: 'Anita Sharma', initials: 'AS', color: 'bg-purple-500'  },
  { id: 'eng-004', name: 'Suresh Babu',  initials: 'SB', color: 'bg-teal-500'    },
  { id: 'eng-005', name: 'Ravi Menon',   initials: 'RM', color: 'bg-indigo-500'  },
]

export const INSTALLATION_TEAMS = [
  'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Sigma',
]

export const INST_BRANCHES = [
  'CNPL-001','CNPL-002','CNPL-003','CNPL-004','CNPL-005',
  'CNPL-006','CNPL-007','CNPL-008','CNPL-009','CNPL-010','CNPL-011',
]

// Status: Scheduled | Assigned | Hardware Collection Pending | Dispatched | Completed | Rescheduled | Cancelled | In Progress
const INIT_INSTALLATIONS = [
  {
    id: 'INS-001', leadId: 'LD-215', serviceType: 'Internet',
    customerName: 'Ramesh Nair',        customerPhone: '9876001890', mobile: '9876001890',
    address: '12, Brigade Road',        area: 'Koramangala', locality: 'Koramangala 5th Block', city: 'Bangalore', pincode: '560001',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-05', slotTime: '10:00', slot: 'Morning',
    assignedTeam: 'Team Alpha',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar, Preethi Nair, Suresh Babu',
    branch: 'CNPL-010', createdBy: 'Ravi Patel', priority: 'High',
    status: 'Scheduled',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Drop Wire (m)', qty: 50 }],
    wireRequired: true,
    wires: [{ name: 'Ethernet Cat6 (m)', qty: 20 }],
    notes: 'Customer prefers morning slot. Building access on ground floor.',
    createdAt: '2026-05-22',
    timeline: [
      { status: 'Scheduled', date: '2026-05-22', by: 'System', note: 'Installation scheduled' },
    ],
  },
  {
    id: 'INS-002', leadId: null, serviceType: 'Intercom',
    customerName: 'Sridhar Rao',        customerPhone: '9845021345', mobile: '9845021345',
    address: '45, MG Road',             area: 'MG Road', locality: 'MG Road 2nd Stage', city: 'Bangalore', pincode: '560001',
    plan: '50 Mbps Monthly (FTTH)',
    slotDate: '2026-06-05', slotTime: '14:30', slot: 'Afternoon',
    assignedTeam: 'Team Beta',
    engineerId: 'eng-004', engineerName: 'Suresh Babu',
    branch: 'CNPL-003', createdBy: 'Neha Gupta', priority: 'Medium',
    status: 'Assigned',
    hardwareRequired: false, hardware: [],
    wireRequired: false, wires: [],
    notes: '',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Scheduled', date: '2026-06-01', by: 'System', note: '' },
      { status: 'Assigned',  date: '2026-06-01', by: 'Admin',  note: 'Assigned to Suresh Babu — Team Beta' },
    ],
  },
  {
    id: 'INS-003', leadId: null, serviceType: 'Internet',
    customerName: 'Kavya Reddy',        customerPhone: '9876543211', mobile: '9876543211',
    address: '78, 100ft Road',          area: 'Indiranagar', locality: 'Indiranagar HAL 2nd Stage', city: 'Bangalore', pincode: '560038',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-06', slotTime: '09:30', slot: 'Morning',
    assignedTeam: 'Team Gamma',
    engineerId: 'eng-002', engineerName: 'Preethi Nair',
    branch: 'CNPL-005', createdBy: 'Salim Khan', priority: 'High',
    status: 'Hardware Collection Pending',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Wall Mount Bracket', qty: 1 }],
    wireRequired: false, wires: [],
    notes: '',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Scheduled', date: '2026-06-01', by: 'System', note: '' },
      { status: 'Assigned',  date: '2026-06-01', by: 'Admin',  note: 'Assigned to Preethi Nair' },
      { status: 'Hardware Collection Pending', date: '2026-06-02', by: 'Admin', note: 'Moved to hardware collection' },
    ],
  },
  {
    id: 'INS-004', leadId: null, serviceType: 'Internet',
    customerName: 'Venkat Subramaniam', customerPhone: '9988001145', mobile: '9988001145',
    address: '23, Whitefield Main Road', area: 'Whitefield', locality: 'Whitefield Hope Farm', city: 'Bangalore', pincode: '560066',
    plan: '200 Mbps Quarterly (FTTH)',
    slotDate: '2026-06-06', slotTime: '13:00', slot: 'Afternoon',
    assignedTeam: 'Team Alpha',
    engineerId: 'eng-005', engineerName: 'Ravi Menon',
    branch: 'CNPL-007', createdBy: 'Pooja Mehta', priority: 'Medium',
    status: 'Dispatched',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Wall Mount Bracket', qty: 1 }, { name: 'POE Switch', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Drop Wire (m)', qty: 30 }],
    notes: 'High-rise building, cable from 12th floor.',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Scheduled',                  date: '2026-06-01', by: 'System', note: '' },
      { status: 'Assigned',                   date: '2026-06-01', by: 'Admin',  note: '' },
      { status: 'Hardware Collection Pending', date: '2026-06-02', by: 'Admin', note: '' },
      { status: 'Dispatched',                 date: '2026-06-03', by: 'Admin',  note: 'Hardware collected, team dispatched' },
    ],
  },
  {
    id: 'INS-005', leadId: null, serviceType: 'Internet',
    customerName: 'Preeti Agarwal',     customerPhone: '9012345678', mobile: '9012345678',
    address: '11, Sector 2',            area: 'HSR Layout', locality: 'HSR Layout Sector 2', city: 'Bangalore', pincode: '560102',
    plan: '500 Mbps Half Yearly (FTTH)',
    slotDate: '2026-06-03', slotTime: '10:00', slot: 'Morning',
    assignedTeam: 'Team Delta',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    branch: 'CNPL-002', createdBy: 'Anil Sharma', priority: 'Low',
    status: 'Completed',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Wall Mount Bracket', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Drop Wire (m)', qty: 30 }, { name: 'Ethernet Cat6 (m)', qty: 15 }],
    notes: 'Installation completed. Customer satisfied.',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Scheduled',                  date: '2026-06-01', by: 'System',       note: '' },
      { status: 'Assigned',                   date: '2026-06-01', by: 'Admin',        note: '' },
      { status: 'Hardware Collection Pending', date: '2026-06-02', by: 'Admin',       note: '' },
      { status: 'Dispatched',                 date: '2026-06-02', by: 'Admin',        note: '' },
      { status: 'Completed',                  date: '2026-06-03', by: 'Arjun Kumar', note: 'Installation completed successfully' },
    ],
  },
  {
    id: 'INS-006', leadId: null, serviceType: 'Intercom',
    customerName: 'Amit Sharma',        customerPhone: '9876543210', mobile: '9876543210',
    address: 'Sector 18',               area: 'Noida', locality: 'Sector 18 Noida', city: 'Noida', pincode: '201301',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-08', slotTime: '17:00', slot: 'Evening',
    assignedTeam: 'Team Beta',
    engineerId: 'eng-003', engineerName: 'Anita Sharma',
    branch: 'CNPL-001', createdBy: 'Salim Khan', priority: 'Medium',
    status: 'Rescheduled',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Wall Mount Bracket', qty: 1 }],
    wireRequired: false, wires: [],
    notes: 'Customer not available on 5 June. Rescheduled to 8 June.',
    createdAt: '2026-06-04',
    timeline: [
      { status: 'Scheduled',   date: '2026-06-04', by: 'System', note: '' },
      { status: 'Assigned',    date: '2026-06-04', by: 'Admin',  note: '' },
      { status: 'Rescheduled', date: '2026-06-05', by: 'Admin',  note: 'Customer not available — rescheduled to 8 June' },
    ],
    rescheduleReason: 'Customer Not Available',
    rescheduleRemarks: 'Customer called and said not available on 5 June.',
  },
  {
    id: 'INS-007', leadId: null, serviceType: 'Internet',
    customerName: 'Sunita Rao',         customerPhone: '9812345678', mobile: '9812345678',
    address: 'Indiranagar',             area: 'Indiranagar', locality: 'Indiranagar 12th Main', city: 'Bangalore', pincode: '560038',
    plan: '200 Mbps Quarterly (FTTH)',
    slotDate: '2026-06-04', slotTime: '16:30', slot: 'Evening',
    assignedTeam: 'Team Sigma',
    engineerId: 'eng-004', engineerName: 'Suresh Babu',
    branch: 'CNPL-006', createdBy: 'Ravi Patel', priority: 'Low',
    status: 'Cancelled',
    hardwareRequired: false, hardware: [],
    wireRequired: false, wires: [],
    notes: 'Customer cancelled — moved to competitor.',
    createdAt: '2026-06-04',
    timeline: [
      { status: 'Scheduled',  date: '2026-06-04', by: 'System', note: '' },
      { status: 'Assigned',   date: '2026-06-04', by: 'Admin',  note: '' },
      { status: 'Cancelled',  date: '2026-06-04', by: 'Admin',  note: 'Customer requested cancellation' },
    ],
  },
  {
    id: 'INS-008', leadId: null, serviceType: 'Internet',
    customerName: 'Rajiv Malhotra',     customerPhone: '9845678901', mobile: '9845678901',
    address: 'Koramangala',             area: 'Koramangala', locality: 'Koramangala 3rd Block', city: 'Bangalore', pincode: '560034',
    plan: '500 Mbps Half Yearly (FTTH)',
    slotDate: '2026-06-03', slotTime: '14:00', slot: 'Afternoon',
    assignedTeam: 'Team Gamma',
    engineerId: 'eng-005', engineerName: 'Ravi Menon',
    branch: 'CNPL-004', createdBy: 'Pooja Mehta', priority: 'High',
    status: 'Completed',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'POE Switch', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Drop Wire (m)', qty: 25 }],
    notes: 'Completed on time.',
    createdAt: '2026-06-04',
    timeline: [
      { status: 'Scheduled',                  date: '2026-06-02', by: 'System',     note: '' },
      { status: 'Assigned',                   date: '2026-06-02', by: 'Admin',      note: '' },
      { status: 'Hardware Collection Pending', date: '2026-06-02', by: 'Admin',     note: '' },
      { status: 'Dispatched',                 date: '2026-06-03', by: 'Admin',      note: '' },
      { status: 'Completed',                  date: '2026-06-03', by: 'Ravi Menon', note: 'Completed on time' },
    ],
  },
  {
    id: 'INS-009', leadId: null, serviceType: 'Intercom',
    customerName: 'Meena Pillai',       customerPhone: '9901234567', mobile: '9901234567',
    address: 'Sector 62',               area: 'Noida', locality: 'Sector 62 Noida', city: 'Noida', pincode: '201309',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-05', slotTime: '11:30', slot: 'Morning',
    assignedTeam: 'Team Alpha',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    branch: 'CNPL-001', createdBy: 'Neha Gupta', priority: 'High',
    status: 'Dispatched',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Wall Mount Bracket', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Ethernet Cat6 (m)', qty: 10 }],
    notes: '',
    createdAt: '2026-06-04',
    timeline: [
      { status: 'Scheduled',                  date: '2026-06-04', by: 'System', note: '' },
      { status: 'Assigned',                   date: '2026-06-04', by: 'Admin',  note: '' },
      { status: 'Hardware Collection Pending', date: '2026-06-04', by: 'Admin', note: '' },
      { status: 'Dispatched',                 date: '2026-06-05', by: 'Admin',  note: 'Team dispatched' },
    ],
  },
  {
    id: 'INS-010', leadId: null, serviceType: 'Internet',
    customerName: 'Vikash Gupta',       customerPhone: '9823456789', mobile: '9823456789',
    address: 'Whitefield',              area: 'Whitefield', locality: 'Whitefield ITPL Road', city: 'Bangalore', pincode: '560066',
    plan: '50 Mbps Monthly (FTTH)',
    slotDate: '2026-06-07', slotTime: '18:00', slot: 'Evening',
    assignedTeam: 'Team Delta',
    engineerId: 'eng-002', engineerName: 'Preethi Nair',
    branch: 'CNPL-008', createdBy: 'Anil Sharma', priority: 'Low',
    status: 'Scheduled',
    hardwareRequired: false, hardware: [],
    wireRequired: false, wires: [],
    notes: '',
    createdAt: '2026-06-04',
    timeline: [
      { status: 'Scheduled', date: '2026-06-04', by: 'System', note: 'Installation scheduled' },
    ],
  },
]

let _installations = [...INIT_INSTALLATIONS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._installations])) }

export function getInstallations() { return [..._installations] }

export function saveInstallation(inst) {
  const exists = _installations.find(i => i.id === inst.id)
  if (exists) {
    _installations = _installations.map(i => i.id === inst.id ? inst : i)
  } else {
    _installations = [inst, ..._installations]
  }
  notify()
}

export function updateInstallationStatus(id, status, extra = {}) {
  const now = new Date().toISOString().split('T')[0]
  const { _by, _note, ...cleanExtra } = extra
  _installations = _installations.map(inst => {
    if (inst.id !== id) return inst
    const entry = { status, date: now, by: _by || 'Admin', note: _note || '' }
    return { ...inst, status, ...cleanExtra, timeline: [...(inst.timeline || []), entry] }
  })
  notify()
}

export function subscribeInstallations(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}
