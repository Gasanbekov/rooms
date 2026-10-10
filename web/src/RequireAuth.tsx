import { Navigate, Outlet } from 'react-router';
import { useAuth } from './auth-context';

// Wraps the pages that need a logged in user and sends everyone else to /login.
export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading…</p>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
