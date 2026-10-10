import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from './http.js';

const COOKIE_NAME = 'sid';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Only the hash of a session token is stored, so a leaked database cannot be used to log in.
 * @param {string} token
 */
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/**
 * @param {import('pg').Pool} pool
 * @param {number | string} userId
 * @returns {Promise<string>} the session token to put into the cookie
 */
export async function createSession(pool, userId) {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `insert into sessions (token_hash, user_id, expires_at)
     values ($1, $2, now() + make_interval(secs => $3))`,
    [hashToken(token), userId, SESSION_TTL_SECONDS],
  );
  return token;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} token
 */
export async function deleteSession(pool, token) {
  await pool.query('delete from sessions where token_hash = $1', [hashToken(token)]);
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {string | undefined}
 */
export function readSessionToken(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) {
      return value.join('=');
    }
  }
  return undefined;
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<{ id: string, email: string, displayName: string } | null>}
 */
export async function findUser(pool, req) {
  const token = readSessionToken(req);
  if (!token) {
    return null;
  }
  const result = await pool.query(
    `select u.id, u.email, u.display_name as "displayName"
     from sessions s
     join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('node:http').IncomingMessage} req
 */
export async function requireUser(pool, req) {
  const user = await findUser(pool, req);
  if (!user) {
    throw new HttpError(401, 'unauthorized');
  }
  return user;
}

/**
 * @param {string} token
 */
export function sessionCookie(token) {
  return cookie(token, SESSION_TTL_SECONDS);
}

export function clearedSessionCookie() {
  return cookie('', 0);
}

/**
 * @param {string} value
 * @param {number} maxAge
 */
function cookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
