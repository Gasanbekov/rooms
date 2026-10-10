import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import RequireAuth from './RequireAuth';
import { mockApi, renderApp } from './test-utils';

function renderProtected() {
  return renderApp(
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<p>Secret page</p>} />
      </Route>
    </Routes>,
    '/',
  );
}

describe('RequireAuth', () => {
  it('redirects to /login without a session', async () => {
    mockApi({ 'GET /me': { status: 401, body: { error: 'unauthorized' } } });
    renderProtected();

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
  });

  it('shows the page with a session', async () => {
    mockApi({ 'GET /me': { body: { id: '1', email: 'a@b.c', displayName: 'Anna' } } });
    renderProtected();

    expect(await screen.findByText('Secret page')).toBeInTheDocument();
  });
});
