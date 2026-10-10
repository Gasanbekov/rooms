import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { runner } from 'node-pg-migrate';

const databaseUrl = process.env.TEST_DATABASE_URL;

assert.ok(
  databaseUrl && new URL(databaseUrl).pathname.endsWith('_test'),
  'TEST_DATABASE_URL must point to a database whose name ends with _test',
);

/** @type {pg.Pool} */
let pool;

before(async () => {
  pool = new pg.Pool({ connectionString: databaseUrl });
  await pool.query('drop schema public cascade');
  await pool.query('create schema public');
  await runner({
    databaseUrl,
    dir: 'migrations',
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => {},
  });
});

after(async () => {
  await pool.end();
});

test('migrations create users, rooms, messages and sessions tables', async () => {
  const result = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1)
     order by table_name`,
    [['messages', 'rooms', 'sessions', 'users']],
  );

  assert.deepEqual(
    result.rows.map((row) => row.table_name),
    ['messages', 'rooms', 'sessions', 'users'],
  );
});

test('messages reject a room that does not exist', async () => {
  const user = await pool.query(
    `insert into users (email, display_name, password_hash)
     values ('anna@example.com', 'Anna', 'x')
     returning id`,
  );

  await assert.rejects(
    pool.query('insert into messages (room_id, user_id, body) values (999, $1, $2)', [
      user.rows[0].id,
      'ghost',
    ]),
    { code: '23503' },
  );
});
