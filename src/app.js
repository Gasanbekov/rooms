import http from 'node:http';
import { HttpError, readJson, sendJson, validate } from './http.js';
import { hashPassword } from './password.js';
import { registerSchema } from './schemas.js';

/**
 * @param {{ pool: import('pg').Pool }} deps
 */
export function createApp({ pool }) {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');

      if (req.method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (req.method === 'POST' && pathname === '/register') {
        const { email, displayName, password } = validate(registerSchema, await readJson(req));
        const passwordHash = await hashPassword(password);
        const result = await pool.query(
          `insert into users (email, display_name, password_hash)
           values ($1, $2, $3)
           returning id, email`,
          [email, displayName, passwordHash],
        );
        sendJson(res, 201, result.rows[0]);
        return;
      }

      sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: error.code, issues: error.issues });
        return;
      }
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        sendJson(res, 409, { error: 'email_taken' });
        return;
      }
      console.error(error);
      sendJson(res, 500, { error: 'internal_error' });
    }
  });
}
