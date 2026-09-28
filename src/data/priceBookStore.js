let _books = [
  {
    id: 1,
    bookName: 'Metro ONU Standard',
    partnerId: 1,
    packageId: 'OTH-001',
    packagePrice: 500,
    partnerPrice: 450,
    commission: 50,
    status: 'Active',
    createdAt: '2026-09-01',
  },
  {
    id: 2,
    bookName: 'Metro Sonic 100 – 1M',
    partnerId: 1,
    packageId: 'BWP-001',
    packagePrice: 899,
    partnerPrice: 799,
    commission: 100,
    status: 'Active',
    createdAt: '2026-09-01',
  },
  {
    id: 3,
    bookName: 'Andheri Sonic 200 – 1M',
    partnerId: 2,
    packageId: 'BWP-002',
    packagePrice: 1499,
    partnerPrice: 1350,
    commission: 149,
    status: 'Active',
    createdAt: '2026-09-05',
  },
]
let _nextId = 4

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getPriceBooks())) }

export function getPriceBooks() { return [..._books] }

export function getPriceBook(id) { return _books.find(b => b.id === id) ?? null }

export function subscribePriceBooks(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function savePriceBook(book) {
  const exists = book.id != null && _books.some(b => b.id === book.id)
  if (exists) {
    _books = _books.map(b => b.id === book.id ? { ...b, ...book } : b)
    notify()
    return book
  }
  const newBook = { ...book, id: _nextId++, createdAt: new Date().toISOString().slice(0, 10) }
  _books = [..._books, newBook]
  notify()
  return newBook
}

export function setPriceBookStatus(id, status) {
  _books = _books.map(b => b.id === id ? { ...b, status } : b)
  notify()
}

export function isDuplicatePriceBook(partnerId, packageId, excludeId = null) {
  return _books.some(b => b.id !== excludeId && b.partnerId === partnerId && b.packageId === packageId)
}
