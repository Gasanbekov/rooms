import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { once } from 'node:events';

/** @type {import('node:http').Server} */
let server;

/** @type {string} */
let baseUrl;

before(async () => {
  server = createApp();
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
});

test('GET /health responds 200 with {"status":"ok"}', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 201);
  assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('unknown path responds 404', async () => {
  const response = await fetch(`${baseUrl}/nope`);

  assert.equal(response.status, 404);
});
