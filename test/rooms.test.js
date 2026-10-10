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

/** @type {string} */
let annaCookie;

/** @type {string} */
let bobCookie;

/**
 * @param {string} path
 * @param {{ method?: string, cookie?: string, body?: unknown }} [options]
 */
const api = (path, { method = 'GET', cookie, body } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/**
 * @param {string} email
 * @returns {Promise<string>}
 */
async function loginAs(email) {
  const response = await api('/login', { method: 'POST', body: { email, password: 'secret123' } });
  const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith('sid='));
  assert.ok(header);
  return header.split(';')[0];
}

before(async () => {
  pool = await createTestPool();
  const hash = await hashPassword('secret123');
  await pool.query(
    `insert into users (email, display_name, password_hash)
     values ('anna@example.com', 'Anna', $1), ('bob@example.com', 'Bob', $1)`,
    [hash],
  );
  server = createApp({ pool });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
  annaCookie = await loginAs('anna@example.com');
  bobCookie = await loginAs('bob@example.com');
});

after(async () => {
  server.closeAllConnections();
  server.close();
  await once(server, 'close');
  await pool.end();
});

test('rooms and messages endpoints require a logged in user', async () => {
  const responses = await Promise.all([
    api('/rooms'),
    api('/rooms', { method: 'POST', body: { name: 'General' } }),
    api('/rooms/1/messages'),
    api('/rooms/1/messages', { method: 'POST', body: { body: 'hi' } }),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 401);
  }
});

test('POST /rooms creates a room and GET /rooms lists it', async () => {
  const created = await api('/rooms', {
    method: 'POST',
    cookie: annaCookie,
    body: { name: '  General  ' },
  });

  assert.equal(created.status, 201);
  const room = await created.json();
  assert.equal(room.name, 'General');
  assert.equal(typeof room.id, 'string');
  assert.ok(room.createdAt);

  const list = await api('/rooms', { cookie: bobCookie });
  assert.equal(list.status, 200);
  const rooms = await list.json();
  assert.ok(rooms.some((/** @type {{ id: string }} */ item) => item.id === room.id));
});

test('POST /rooms rejects an empty or too long name with 400', async () => {
  for (const name of ['   ', 'x'.repeat(51), 42]) {
    const response = await api('/rooms', { method: 'POST', cookie: annaCookie, body: { name } });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'validation_error');
  }
});

test('messages are posted and listed oldest first with their authors', async () => {
  const room = await (
    await api('/rooms', { method: 'POST', cookie: annaCookie, body: { name: 'Chat' } })
  ).json();

  const first = await api(`/rooms/${room.id}/messages`, {
    method: 'POST',
    cookie: annaCookie,
    body: { body: '  Hello  ' },
  });
  assert.equal(first.status, 201);
  const firstMessage = await first.json();
  assert.equal(firstMessage.body, 'Hello');
  assert.equal(firstMessage.user.displayName, 'Anna');
  assert.ok(firstMessage.createdAt);

  await api(`/rooms/${room.id}/messages`, {
    method: 'POST',
    cookie: bobCookie,
    body: { body: 'Hi Anna' },
  });

  const list = await api(`/rooms/${room.id}/messages`, { cookie: bobCookie });
  assert.equal(list.status, 200);
  const messages = await list.json();
  assert.deepEqual(
    messages.map((/** @type {{ body: string, user: { displayName: string } }} */ m) => [
      m.body,
      m.user.displayName,
    ]),
    [
      ['Hello', 'Anna'],
      ['Hi Anna', 'Bob'],
    ],
  );
});

test('a message must be 1 to 1024 characters', async () => {
  const room = await (
    await api('/rooms', { method: 'POST', cookie: annaCookie, body: { name: 'Limits' } })
  ).json();

  const tooLong = await api(`/rooms/${room.id}/messages`, {
    method: 'POST',
    cookie: annaCookie,
    body: { body: 'x'.repeat(1025) },
  });
  const empty = await api(`/rooms/${room.id}/messages`, {
    method: 'POST',
    cookie: annaCookie,
    body: { body: '   ' },
  });
  const maxLength = await api(`/rooms/${room.id}/messages`, {
    method: 'POST',
    cookie: annaCookie,
    body: { body: 'x'.repeat(1024) },
  });

  assert.equal(tooLong.status, 400);
  assert.equal(empty.status, 400);
  assert.equal(maxLength.status, 201);
});

test('messages in an unknown room respond 404', async () => {
  const list = await api('/rooms/999999/messages', { cookie: annaCookie });
  const post = await api('/rooms/999999/messages', {
    method: 'POST',
    cookie: annaCookie,
    body: { body: 'hello' },
  });

  assert.equal(list.status, 404);
  assert.equal(post.status, 404);
  assert.equal((await post.json()).error, 'room_not_found');
});

test('GET messages returns the latest page and pages back with before', async () => {
  const room = await (
    await api('/rooms', { method: 'POST', cookie: annaCookie, body: { name: 'Paging' } })
  ).json();
  for (let i = 1; i <= 5; i++) {
    await api(`/rooms/${room.id}/messages`, {
      method: 'POST',
      cookie: annaCookie,
      body: { body: `message ${i}` },
    });
  }

  /** @param {string} query */
  const bodies = async (query) =>
    (await (await api(`/rooms/${room.id}/messages${query}`, { cookie: annaCookie })).json()).map(
      (/** @type {{ body: string }} */ m) => m.body,
    );

  assert.deepEqual(await bodies('?limit=2'), ['message 4', 'message 5']);

  const page = await (
    await api(`/rooms/${room.id}/messages?limit=2`, { cookie: annaCookie })
  ).json();
  const older = await bodies(`?limit=2&before=${page[0].id}`);
  assert.deepEqual(older, ['message 2', 'message 3']);

  const invalid = await api(`/rooms/${room.id}/messages?limit=0`, { cookie: annaCookie });
  assert.equal(invalid.status, 400);
});
