import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { verifyPassword } from '../src/password.js';

/** @type {pg.Pool} */
let pool;

/** @type {import('node:http').Server} */
let server;

/** @type {string} */
let baseUrl;

before(async () => {
  pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await pool.query('truncate users cascade');
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

test('POST /register creates a user and hides the password', async () => {
  const response = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'anna@example.com',
      displayName: 'Anna',
      password: 'secret123',
    }),
  });

  assert.equal(response.status, 201);

  const body = await response.json();
  assert.equal(body.email, 'anna@example.com');
  assert.equal(body.password, undefined);
  assert.equal(body.password_hash, undefined);

  const stored = await pool.query('select password_hash from users where email = $1', [
    'anna@example.com',
  ]);
  assert.equal(stored.rows.length, 1);
  assert.notEqual(stored.rows[0].password_hash, 'secret123');
  assert.equal(await verifyPassword('secret123', stored.rows[0].password_hash), true);
});

test('POST /register rejects a duplicate email with 409', async () => {
  const register = () =>
    fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob@example.com',
        displayName: 'Bob',
        password: 'secret123',
      }),
    });

  assert.equal((await register()).status, 201);
  assert.equal((await register()).status, 409);
});
