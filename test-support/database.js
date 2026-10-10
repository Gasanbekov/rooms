import assert from 'node:assert/strict';
import pg from 'pg';
import { runner } from 'node-pg-migrate';

/**
 * Creates a pool for the test database with a freshly migrated schema.
 * @returns {Promise<pg.Pool>}
 */
export async function createTestPool() {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  assert.ok(
    databaseUrl && new URL(databaseUrl).pathname.endsWith('_test'),
    'TEST_DATABASE_URL must point to a database whose name ends with _test',
  );

  const pool = new pg.Pool({ connectionString: databaseUrl });
  await pool.query('drop schema public cascade');
  await pool.query('create schema public');
  await runner({
    databaseUrl,
    dir: 'migrations',
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => {},
  });

  return pool;
}
