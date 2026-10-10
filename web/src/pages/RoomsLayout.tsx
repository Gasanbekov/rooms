import { useEffect, useState, type SubmitEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth-context';
import { describeError } from '../errors';
import type { Room } from '../types';

export default function RoomsLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    api<Room[]>('/rooms')
      .then(setRooms)
      .catch((caught) => setError(describeError(caught)));
  }, []);

  async function handleCreate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const room = await api<Room>('/rooms', { method: 'POST', body: { name: newName } });
      setRooms((current) => [...current, room]);
      setNewName('');
      navigate(`/rooms/${room.id}`);
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  const visibleRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="app">
      <header className="topbar">
        <strong>Rooms</strong>
        <span>
          {user?.displayName} <button onClick={() => void logout()}>Log out</button>
        </span>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <input
            type="search"
            placeholder="Search rooms"
            aria-label="Search rooms"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <nav>
            {visibleRooms.map((room) => (
              <NavLink key={room.id} to={`/rooms/${room.id}`}>
                {room.name}
              </NavLink>
            ))}
            {visibleRooms.length === 0 && <p className="muted">No rooms found.</p>}
          </nav>
          <form onSubmit={handleCreate}>
            <input
              placeholder="New room name"
              aria-label="New room name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={50}
              required
            />
            <button type="submit">Create room</button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </aside>
        <section className="content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
