import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../data/sessionStore'

// Gates every route nested under it in App.jsx behind sessionStore.js's
// demo-grade session — see that file's top-of-file comment for what
// "demo-grade" means here (in-memory only, plaintext password, no expiry).
export default function RequireAuth() {
  const user = useSession()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
