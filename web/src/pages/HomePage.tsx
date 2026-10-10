import { useAuth } from '../auth-context';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main>
      <header className="topbar">
        <strong>Rooms</strong>
        <span>
          {user?.displayName} <button onClick={() => void logout()}>Log out</button>
        </span>
      </header>
      <p>You are logged in. Rooms are coming next.</p>
    </main>
  );
}
