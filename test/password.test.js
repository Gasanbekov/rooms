import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/password.js';

test('verifyPassword accepts the correct password', async () => {
  const stored = await hashPassword('secret123');

  assert.equal(await verifyPassword('secret123', stored), true);
});

test('verifyPassword rejects a wrong password', async () => {
  const stored = await hashPassword('secret123');

  assert.equal(await verifyPassword('wrong', stored), false);
});
