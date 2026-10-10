import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Message } from '../types';
import { mockApi, renderApp } from '../test-utils';
import RoomPage from './RoomPage';

const anna = { id: '1', email: 'anna@example.com', displayName: 'Anna' };

const message = (id: number, body: string, author = { id: '2', displayName: 'Bob' }): Message => ({
  id: String(id),
  body,
  createdAt: '2026-10-10T10:00:00.000Z',
  user: author,
});

function renderRoom() {
  return renderApp(
    <Routes>
      <Route path="rooms/:roomId" element={<RoomPage />} />
    </Routes>,
    '/rooms/5',
  );
}

describe('RoomPage', () => {
  it('shows the messages with their authors', async () => {
    mockApi({
      'GET /me': { body: anna },
      'GET /rooms/5/messages?limit=50': {
        body: [message(1, 'Hi Anna'), message(2, 'Hello Bob', { id: '1', displayName: 'Anna' })],
      },
    });
    renderRoom();

    expect(await screen.findByText('Hi Anna')).toBeInTheDocument();
    expect(screen.getByText('Hello Bob')).toBeInTheDocument();
    expect(screen.getAllByText('Bob')).toHaveLength(1);
  });

  it('says so when the room has no messages', async () => {
    mockApi({ 'GET /me': { body: anna }, 'GET /rooms/5/messages?limit=50': { body: [] } });
    renderRoom();

    expect(await screen.findByText('No messages yet.')).toBeInTheDocument();
  });

  it('sends a message and clears the input', async () => {
    mockApi({
      'GET /me': { body: anna },
      'GET /rooms/5/messages?limit=50': { body: [] },
      'POST /rooms/5/messages': {
        status: 201,
        body: message(1, 'Hello', { id: '1', displayName: 'Anna' }),
      },
    });
    renderRoom();

    const input = await screen.findByLabelText('Message');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Hello', { selector: 'p' })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('shows an error when sending fails and keeps the draft', async () => {
    mockApi({
      'GET /me': { body: anna },
      'GET /rooms/5/messages?limit=50': { body: [] },
      'POST /rooms/5/messages': { status: 404, body: { error: 'room_not_found' } },
    });
    renderRoom();

    const input = await screen.findByLabelText('Message');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This room does not exist.');
    expect(input).toHaveValue('Hello');
  });

  it('warns when the message gets close to the 1024 character limit', async () => {
    mockApi({ 'GET /me': { body: anna }, 'GET /rooms/5/messages?limit=50': { body: [] } });
    renderRoom();

    fireEvent.change(await screen.findByLabelText('Message'), {
      target: { value: 'x'.repeat(950) },
    });

    expect(screen.getByText('950/1024')).toHaveClass('warn');
  });

  it('loads older messages with the id of the oldest one', async () => {
    const latest = Array.from({ length: 50 }, (_, index) =>
      message(51 + index, `new ${51 + index}`),
    );
    mockApi({
      'GET /me': { body: anna },
      'GET /rooms/5/messages?limit=50': { body: latest },
      'GET /rooms/5/messages?limit=50&before=51': {
        body: [message(49, 'old 49'), message(50, 'old 50')],
      },
    });
    renderRoom();

    await userEvent.click(await screen.findByRole('button', { name: 'Load older messages' }));

    expect(await screen.findByText('old 49')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older messages' })).not.toBeInTheDocument();
  });
});
