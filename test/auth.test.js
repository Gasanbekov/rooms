import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/password.js';
import { createTestPool } from '../test-support/database.js';

/** @type {import('pg').Pool} */
let pool;

/** @type {import('node:http').Server} */
let server;

/** @type {string} */
let baseUrl;

before(async () => {
  pool = await createTestPool();
  await pool.query(
    `insert into users (email, display_name, password_hash)
     values ('anna@example.com', 'Anna', $1)`,
    [await hashPassword('secret123')],
  );
  server = createApp({ pool });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeAllConnections();
  server.close();
  await once(server, 'close');
  await pool.end();
});

/**
 * @param {unknown} payload
 */
const login = (payload) =>
  fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

/**
 * @param {Response} response
 * @returns {string}
 */
const sessionCookie = (response) => {
  const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith('sid='));
  assert.ok(header, 'expected a sid cookie');
  return header;
};

/**
 * @param {string} cookie
 */
const me = (cookie) => fetch(`${baseUrl}/me`, { headers: cookie ? { Cookie: cookie } : {} });

test('POST /login with the right password starts a session', async () => {
  const response = await login({ email: 'anna@example.com', password: 'secret123' });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.email, 'anna@example.com');
  assert.equal(body.displayName, 'Anna');
  assert.equal(body.password_hash, undefined);

  const cookie = sessionCookie(response);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);

  const token = cookie.split(';')[0].slice('sid='.length);
  const stored = await pool.query('select token_hash from sessions');
  assert.ok(stored.rows.length >= 1);
  assert.ok(stored.rows.every((row) => row.token_hash !== token));
});

test('POST /login matches the email case-insensitively', async () => {
  const response = await login({ email: 'ANNA@Example.com', password: 'secret123' });

  assert.equal(response.status, 200);
});

test('POST /login answers the same 401 for a wrong password and an unknown email', async () => {
  const wrongPassword = await login({ email: 'anna@example.com', password: 'wrong-password' });
  const unknownEmail = await login({ email: 'nobody@example.com', password: 'secret123' });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(await wrongPassword.json(), { error: 'invalid_credentials' });
  assert.deepEqual(await unknownEmail.json(), { error: 'invalid_credentials' });
  assert.equal(wrongPassword.headers.getSetCookie().length, 0);
});

test('POST /login rejects a body without a password with 400', async () => {
  const response = await login({ email: 'anna@example.com' });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'validation_error');
});

test('GET /me without a cookie responds 401', async () => {
  const response = await me('');

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
});

test('GET /me with a garbage cookie responds 401', async () => {
  const response = await me('sid=not-a-real-token');

  assert.equal(response.status, 401);
});

test('GET /me returns the logged in user', async () => {
  const cookie = sessionCookie(
    await login({ email: 'anna@example.com', password: 'secret123' }),
  ).split(';')[0];

  const response = await me(cookie);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.email, 'anna@example.com');
  assert.equal(body.displayName, 'Anna');
  assert.equal(typeof body.id, 'string');
});

test('POST /logout ends the session and clears the cookie', async () => {
  const cookie = sessionCookie(
    await login({ email: 'anna@example.com', password: 'secret123' }),
  ).split(';')[0];

  const response = await fetch(`${baseUrl}/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 204);
  assert.match(sessionCookie(response), /Max-Age=0/);
  assert.equal((await me(cookie)).status, 401);
});

test('an expired session is rejected', async () => {
  const cookie = sessionCookie(
    await login({ email: 'anna@example.com', password: 'secret123' }),
  ).split(';')[0];
  await pool.query("update sessions set expires_at = now() - interval '1 minute'");

  assert.equal((await me(cookie)).status, 401);
});
