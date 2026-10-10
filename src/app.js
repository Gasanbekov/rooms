import http from 'node:http';
import { HttpError, readJson, sendJson, validate } from './http.js';
import { hashPassword, verifyPassword } from './password.js';
import { loginSchema, registerSchema } from './schemas.js';
import {
  clearedSessionCookie,
  createSession,
  deleteSession,
  readSessionToken,
  requireUser,
  sessionCookie,
} from './sessions.js';

// Checked against when the email is unknown, so a missing user and a wrong password
// take the same time and the response does not reveal which emails are registered.
const DUMMY_HASH = await hashPassword('not-a-real-password');

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

      if (req.method === 'POST' && pathname === '/login') {
        const { email, password } = validate(loginSchema, await readJson(req));
        const result = await pool.query(
          `select id, email, display_name as "displayName", password_hash
           from users where email = $1`,
          [email],
        );
        const user = result.rows[0];
        const passwordMatches = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !passwordMatches) {
          throw new HttpError(401, 'invalid_credentials');
        }
        const token = await createSession(pool, user.id);
        sendJson(
          res,
          200,
          { id: user.id, email: user.email, displayName: user.displayName },
          { 'Set-Cookie': sessionCookie(token) },
        );
        return;
      }

      if (req.method === 'POST' && pathname === '/logout') {
        const token = readSessionToken(req);
        if (token) {
          await deleteSession(pool, token);
        }
        res.writeHead(204, { 'Set-Cookie': clearedSessionCookie() });
        res.end();
        return;
      }

      if (req.method === 'GET' && pathname === '/me') {
        sendJson(res, 200, await requireUser(pool, req));
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
