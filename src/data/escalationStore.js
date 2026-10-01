const SEED = {
  trigger1Enabled: true,
  trigger1Rules: [
    { priority: 'P1', levels: [
      { level: 1, hours: 2,  notifyUserIds: ['u3'] },
      { level: 2, hours: 4,  notifyUserIds: ['u4'] },
      { level: 3, hours: 8,  notifyUserIds: ['u1'] },
    ]},
    { priority: 'P2', levels: [
      { level: 1, hours: 4,  notifyUserIds: ['u3'] },
      { level: 2, hours: 8,  notifyUserIds: ['u4'] },
      { level: 3, hours: 24, notifyUserIds: ['u1'] },
    ]},
    { priority: 'P3', levels: [
      { level: 1, hours: 8,  notifyUserIds: ['u3'] },
      { level: 2, hours: 24, notifyUserIds: ['u4'] },
    ]},
    { priority: 'P4', levels: [
      { level: 1, hours: 24, notifyUserIds: ['u3'] },
    ]},
  ],
  trigger2Enabled: true,
  trigger2TicketCount: 2,
  trigger2DurationDays: 7,
  trigger2NotifyUserIds: ['u1'],
}

let _config = { ...SEED }
const _listeners = []

function notify() { _listeners.forEach(fn => fn({ ..._config })) }

export function getEscalationMatrix() { return { ..._config } }

export function saveEscalationMatrix(data) {
  _config = { ...data }
  notify()
  return { ..._config }
}

export function subscribeEscalationMatrix(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
