import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { mockApi, renderApp } from '../test-utils';
import RoomsLayout from './RoomsLayout';

const anna = { id: '1', email: 'anna@example.com', displayName: 'Anna' };
const general = { id: '1', name: 'General', createdAt: '2026-10-10T10:00:00.000Z' };
const random = { id: '2', name: 'Random', createdAt: '2026-10-10T10:01:00.000Z' };

function renderLayout() {
  return renderApp(
    <Routes>
      <Route element={<RoomsLayout />}>
        <Route index element={<p>Select a room</p>} />
        <Route path="rooms/:roomId" element={<p>Room opened</p>} />
      </Route>
    </Routes>,
    '/',
  );
}

describe('RoomsLayout', () => {
  it('lists the rooms and filters them with the search box', async () => {
    mockApi({ 'GET /me': { body: anna }, 'GET /rooms': { body: [general, random] } });
    renderLayout();

    expect(await screen.findByRole('link', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Random' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search rooms'), 'rand');

    expect(screen.queryByRole('link', { name: 'General' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Random' })).toBeInTheDocument();
  });

  it('creates a room and opens it', async () => {
    mockApi({
      'GET /me': { body: anna },
      'GET /rooms': { body: [general] },
      'POST /rooms': { status: 201, body: random },
    });
    renderLayout();

    await userEvent.type(await screen.findByLabelText('New room name'), 'Random');
    await userEvent.click(screen.getByRole('button', { name: 'Create room' }));

    expect(await screen.findByText('Room opened')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Random' })).toBeInTheDocument();
  });

  it('shows the server error when a room cannot be created', async () => {
    mockApi({
      'GET /me': { body: anna },
      'GET /rooms': { body: [] },
      'POST /rooms': { status: 401, body: { error: 'unauthorized' } },
    });
    renderLayout();

    await userEvent.type(await screen.findByLabelText('New room name'), 'Random');
    await userEvent.click(screen.getByRole('button', { name: 'Create room' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please log in first.');
  });
});
