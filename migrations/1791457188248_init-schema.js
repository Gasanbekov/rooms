/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    create table users (
      id bigint generated always as identity primary key,
      email text not null unique,
      display_name text not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    );

    create table rooms (
      id bigint generated always as identity primary key,
      name text not null,
      created_at timestamptz not null default now()
    );

    create table messages (
      id bigint generated always as identity primary key,
      room_id bigint not null references rooms (id) on delete cascade,
      user_id bigint not null references users (id),
      body text not null,
      created_at timestamptz not null default now()
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql('drop table messages;');
  pgm.sql('drop table rooms;');
  pgm.sql('drop table users;');
};
