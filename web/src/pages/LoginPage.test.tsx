import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { mockApi, renderApp } from '../test-utils';
import LoginPage from './LoginPage';

const anna = { id: '1', email: 'anna@example.com', displayName: 'Anna' };

function renderLogin() {
  return renderApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Home page</p>} />
    </Routes>,
    '/login',
  );
}

async function fillAndSubmit(password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), 'anna@example.com');
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginPage', () => {
  it('shows an error when the credentials are wrong', async () => {
    mockApi({
      'GET /me': { status: 401, body: { error: 'unauthorized' } },
      'POST /login': { status: 401, body: { error: 'invalid_credentials' } },
    });
    renderLogin();

    await fillAndSubmit('wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('goes to the home page after a successful login', async () => {
    mockApi({
      'GET /me': { status: 401, body: { error: 'unauthorized' } },
      'POST /login': { body: anna },
    });
    renderLogin();

    await fillAndSubmit('secret123');

    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('skips the form when a session already exists', async () => {
    mockApi({ 'GET /me': { body: anna } });
    renderLogin();

    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });
});
