// Shared hardware/inventory item list — reused by Ticket Detail's Hardware
// Assignment card and Create Outage's Hardware Requirement section, so both
// pick from the same catalog instead of maintaining separate lists.
// `chargeable` drives the Chargeable/Non-Chargeable split in Ticket Detail's
// Add Hardware modal — Create Outage ignores it (its own Hardware
// Requirement section treats every item as non-chargeable regardless).
export const HARDWARE_CATALOG = [
  { name: 'ONT Device', unitPrice: 1800, chargeable: true },
  { name: 'WiFi Router', unitPrice: 1500, chargeable: true },
  { name: 'Wall Mount Bracket', unitPrice: 150, chargeable: false },
  { name: 'POE Switch', unitPrice: 2200, chargeable: true },
  { name: 'Drop Wire (per m)', unitPrice: 12, chargeable: false },
  { name: 'Patch Cord (LC-LC, 5m)', unitPrice: 90, chargeable: false },
  { name: 'Optical Splitter 1x8', unitPrice: 650, chargeable: false },
  { name: 'SFP Module 1G', unitPrice: 900, chargeable: true },
]
