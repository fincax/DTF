/* Acceso a Postgres y utilidades de sesión. Los tokens se guardan
   hasheados (SHA-256): una copia de la base no sirve para suplantar
   a nadie — misma regla que el servidor del waitlist. */

import pg from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

export function crearPool(url) {
  return new pg.Pool({ connectionString: url, max: 10 });
}

export async function migrar(pool) {
  await pool.query(await readFile(join(AQUI, 'schema.sql'), 'utf8'));
}

export const hash = (t) => createHash('sha256').update(t).digest('hex');
export const nuevoToken = () => randomBytes(32).toString('hex');

const CADUCIDAD = { login: 15 * 6e4 };

export async function crearToken(pool, userId, kind = 'login') {
  const token = nuevoToken();
  await pool.query(
    'INSERT INTO tokens (hash, user_id, kind, expires_at) VALUES ($1, $2, $3, now() + $4::interval)',
    [hash(token), userId, kind, `${CADUCIDAD[kind] / 1000} seconds`]
  );
  return token;
}

export async function canjearToken(pool, token, kind = 'login') {
  if (typeof token !== 'string' || token.length !== 64) return null;
  const { rows } = await pool.query(
    `DELETE FROM tokens WHERE hash = $1 AND kind = $2 AND expires_at > now()
     RETURNING user_id`,
    [hash(token), kind]
  );
  return rows[0]?.user_id ?? null;
}

export async function crearSesion(pool, userId) {
  const token = nuevoToken();
  await pool.query(
    "INSERT INTO sessions (hash, user_id, expires_at) VALUES ($1, $2, now() + interval '90 days')",
    [hash(token), userId]
  );
  return token;
}

/* Devuelve el usuario de la sesión, o null. Un usuario expulsado o
   borrado no tiene sesión válida aunque conserve el token. */
export async function usuarioDeSesion(pool, token) {
  if (typeof token !== 'string' || token.length !== 64) return null;
  const { rows } = await pool.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.hash = $1 AND s.expires_at > now()
       AND u.deleted_at IS NULL AND u.banned_at IS NULL`,
    [hash(token)]
  );
  return rows[0] ?? null;
}

export async function cerrarSesion(pool, token) {
  if (typeof token === 'string' && token.length === 64) {
    await pool.query('DELETE FROM sessions WHERE hash = $1', [hash(token)]);
  }
}
