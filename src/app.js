import http from 'node:http';
import { hashPassword } from './password.js';

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<any>}
 */
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * @param {{ pool: import('pg').Pool }} deps
 */
export function createApp({ pool }) {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');

      if (req.method === 'GET' && pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.method === 'POST' && pathname === '/register') {
        const { email, displayName, password } = await readJson(req);
        const passwordHash = await hashPassword(password);
        const result = await pool.query(
          `insert into users (email, display_name, password_hash)
         values ($1, $2, $3)
         returning id, email`,
          [email, displayName, passwordHash],
        );
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows[0]));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'email_taken' }));
        return;
      }
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal_error' }));
    }
  });
}
