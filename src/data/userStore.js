const AVATAR_COLORS = [
  'bg-brand-blue', 'bg-purple-500', 'bg-emerald-500', 'bg-brand-orange',
  'bg-teal-500', 'bg-rose-500', 'bg-indigo-500', 'bg-amber-500',
]

function colorFor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')
}

// Demo-grade "hash" — NOT real cryptographic hashing (no salt, no work
// factor, trivially brute-forceable). It exists only so a plaintext
// password never sits directly in this array / a devtools inspection of a
// user record — the one thing plaintext storage can't do, this can. A real
// app would hash server-side with bcrypt/argon2 and never let the client
// see the algorithm; there's no backend here to do that against, so this
// is a same-shape stand-in, not a security control. See sessionStore.js's
// top-of-file comment for the rest of this demo-grade layer.
export function hashPassword(plain) {
  let hash = 0
  for (let i = 0; i < plain.length; i++) {
    hash = (Math.imul(31, hash) + plain.charCodeAt(i)) | 0
  }
  return `h_${(hash >>> 0).toString(16)}`
}

// `password` holds hashPassword('password123') for every seed user — same
// placeholder credential across all of them, now stored the way
// addUser()/updateUser() store any password (see UserManagement.jsx).
//
// `branch`/`zone` (role='engineer' users only, for now) were added as
// Phase 1 of the Technician Monitoring Dashboard: these role='engineer'
// records are the chosen canonical Technician entity — they already have
// real login-linked ids and are the only roster referenced elsewhere by id
// (assetRepairStore.js's technicianId). See technicianHelpers.js for the
// lookup layer other code should read technicians through, and
// installationsStore.js/ticketsStore.js for the userId bridge fields that
// link (where a confident match exists) their own separate engineer/
// technician rosters back to these ids.
const INITIAL_USERS = [
  {
    id: 'u1', name: 'Admin User',    email: 'admin@cityline.in',   phone: '9900001111',
    password: hashPassword('password123'),
    role: 'super_admin', status: 'active',   lastActive: '2026-05-28',
    memberSince: '2022-01-01', leadsAssigned: 0,  followupsTotal: 0,
    initials: 'AD', color: 'bg-navy',
  },
  {
    id: 'u2', name: 'Anita Sharma',  email: 'anita@cityline.in',   phone: '9087654321',
    password: hashPassword('password123'),
    role: 'admin',       status: 'active',   lastActive: '2026-05-28',
    memberSince: '2022-11-20', leadsAssigned: 20, followupsTotal: 38,
    initials: 'AS', color: 'bg-brand-orange',
  },
  {
    id: 'u3', name: 'Arjun Kumar',   email: 'arjun@cityline.in',   phone: '9876543210',
    password: hashPassword('password123'),
    role: 'engineer',    status: 'active',   lastActive: '2026-05-27',
    memberSince: '2023-06-01', leadsAssigned: 28, followupsTotal: 45,
    initials: 'AK', color: 'bg-brand-blue',
    branch: 'CNPL-002', zone: 'Andheri West',
  },
  {
    id: 'u4', name: 'Preethi Nair',  email: 'preethi@cityline.in', phone: '9876001122',
    password: hashPassword('password123'),
    role: 'support',     status: 'active',   lastActive: '2026-05-27',
    memberSince: '2023-08-15', leadsAssigned: 12, followupsTotal: 30,
    initials: 'PN', color: 'bg-purple-500',
  },
  {
    id: 'u5', name: 'Suresh Babu',   email: 'suresh@cityline.in',  phone: '9988001133',
    password: hashPassword('password123'),
    role: 'engineer',    status: 'active',   lastActive: '2026-05-26',
    memberSince: '2024-01-10', leadsAssigned: 15, followupsTotal: 22,
    initials: 'SB', color: 'bg-emerald-500',
    branch: 'CNPL-010', zone: 'Andheri East',
  },
  {
    id: 'u6', name: 'Ravi Menon',    email: 'ravi@cityline.in',    phone: '9845001234',
    password: hashPassword('password123'),
    role: 'billing',     status: 'active',   lastActive: '2026-05-25',
    memberSince: '2023-03-05', leadsAssigned: 0,  followupsTotal: 0,
    initials: 'RM', color: 'bg-teal-500',
  },
  {
    id: 'u7', name: 'Deepa Varma',   email: 'deepa@cityline.in',   phone: '9765432100',
    password: hashPassword('password123'),
    role: 'readonly',    status: 'inactive', lastActive: '2026-04-12',
    memberSince: '2024-06-01', leadsAssigned: 5,  followupsTotal: 8,
    initials: 'DV', color: 'bg-gray-400',
  },
]

let _users = [...INITIAL_USERS]
const _listeners = []

export function getUsers() { return _users }

export function getActiveUsers() {
  return _users.filter(u => u.status === 'active')
}

export function addUser(data) {
  const idx = _users.length
  const user = {
    ...data,
    id: `u${Date.now()}`,
    initials: initials(data.name),
    color: colorFor(idx),
    lastActive: new Date().toISOString().split('T')[0],
    memberSince: new Date().toISOString().split('T')[0],
    leadsAssigned: 0,
    followupsTotal: 0,
    status: data.status ?? 'active',
  }
  _users = [..._users, user]
  _listeners.forEach(fn => fn(_users))
  return user
}

export function updateUser(data) {
  _users = _users.map(u => u.id === data.id ? { ...u, ...data } : u)
  _listeners.forEach(fn => fn(_users))
}

export function subscribeUsers(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
