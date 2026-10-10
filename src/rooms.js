/**
 * @typedef {{ id: string, email: string, displayName: string }} User
 */

/**
 * @param {import('pg').Pool} pool
 */
export async function listRooms(pool) {
  const result = await pool.query(
    'select id, name, created_at as "createdAt" from rooms order by id',
  );
  return result.rows;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} name
 */
export async function createRoom(pool, name) {
  const result = await pool.query(
    'insert into rooms (name) values ($1) returning id, name, created_at as "createdAt"',
    [name],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} roomId
 */
export async function roomExists(pool, roomId) {
  const result = await pool.query('select 1 from rooms where id = $1', [roomId]);
  return result.rowCount === 1;
}

/**
 * Returns the newest messages of a room, oldest first. Pass `before` (a message id)
 * to get the page of messages that precede it.
 * @param {import('pg').Pool} pool
 * @param {string} roomId
 * @param {{ before?: string, limit: number }} page
 */
export async function listMessages(pool, roomId, { before, limit }) {
  const result = await pool.query(
    `select m.id, m.body, m.created_at as "createdAt", u.id as "userId", u.display_name as "displayName"
     from messages m
     join users u on u.id = m.user_id
     where m.room_id = $1 and ($2::bigint is null or m.id < $2::bigint)
     order by m.id desc
     limit $3`,
    [roomId, before ?? null, limit],
  );
  return result.rows.reverse().map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    user: { id: row.userId, displayName: row.displayName },
  }));
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} roomId
 * @param {User} user
 * @param {string} body
 */
export async function createMessage(pool, roomId, user, body) {
  const result = await pool.query(
    `insert into messages (room_id, user_id, body)
     values ($1, $2, $3)
     returning id, body, created_at as "createdAt"`,
    [roomId, user.id, body],
  );
  return { ...result.rows[0], user: { id: user.id, displayName: user.displayName } };
}
