import { useEffect, useState } from 'react';

type ServerState = 'checking' | 'online' | 'offline';

export default function App() {
  const [server, setServer] = useState<ServerState>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setServer(response.ok ? 'online' : 'offline'))
      .catch(() => setServer('offline'));
  }, []);

  return (
    <main>
      <h1>Rooms</h1>
      <p>Server: {server}</p>
    </main>
  );
}
