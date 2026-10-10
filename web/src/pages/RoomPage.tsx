import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useParams } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth-context';
import { describeError } from '../errors';
import { mergeMessages } from '../messages';
import type { Message } from '../types';

const PAGE_SIZE = 50;
const MAX_LENGTH = 1024;
const WARN_AT = 900;
// Temporary: new messages are fetched by polling until WebSocket delivery is added.
const POLL_MS = 2000;

export default function RoomPage() {
  const { roomId } = useParams();
  // The key makes React start with a clean chat whenever the room changes.
  return roomId ? <Chat key={roomId} roomId={roomId} /> : null;
}

function Chat({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLatest = () =>
      api<Message[]>(`/rooms/${roomId}/messages?limit=${PAGE_SIZE}`).then((latest) => {
        if (!cancelled) {
          setMessages((current) => mergeMessages(current, latest));
        }
        return latest;
      });

    fetchLatest()
      .then((latest) => {
        if (!cancelled) {
          setHasMore(latest.length === PAGE_SIZE);
          setLoaded(true);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(describeError(caught));
        }
      });
    const timer = setInterval(() => {
      fetchLatest().catch(() => {});
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [roomId]);

  // Scroll down only when a newer message arrives, not when older ones are loaded.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lastId]);

  async function loadOlder() {
    try {
      const older = await api<Message[]>(
        `/rooms/${roomId}/messages?limit=${PAGE_SIZE}&before=${messages[0].id}`,
      );
      setMessages((current) => mergeMessages(current, older));
      setHasMore(older.length === PAGE_SIZE);
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  async function handleSend(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim() === '') {
      return;
    }
    setError(null);
    setSending(true);
    try {
      const message = await api<Message>(`/rooms/${roomId}/messages`, {
        method: 'POST',
        body: { body: draft },
      });
      setMessages((current) => mergeMessages(current, [message]));
      setDraft('');
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat">
      <div className="messages">
        {hasMore && <button onClick={() => void loadOlder()}>Load older messages</button>}
        {loaded && messages.length === 0 && <p className="muted">No messages yet.</p>}
        {messages.map((message) => (
          <article
            key={message.id}
            className={message.user.id === user?.id ? 'message own' : 'message'}
          >
            <header>
              <strong>{message.user.displayName}</strong>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </header>
            <p>{message.body}</p>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form onSubmit={handleSend} className="composer">
        <input
          placeholder="Write a message"
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_LENGTH}
          autoComplete="off"
        />
        <span className={draft.length >= WARN_AT ? 'counter warn' : 'counter'}>
          {draft.length}/{MAX_LENGTH}
        </span>
        <button type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
