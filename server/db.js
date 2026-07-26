/* Base de datos del waitlist: SQLite nativo de Node (node:sqlite).
   Minimización RGPD: se guarda email, fechas y preferencias. Nada más —
   ni IP, ni user-agent. Los tokens se guardan hasheados (SHA-256):
   una copia de la base de datos no sirve para suplantar enlaces. */

import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function abrirDb(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, 'dtf.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS subscribers (
      id           INTEGER PRIMARY KEY,
      email        TEXT NOT NULL UNIQUE,
      created_at   TEXT NOT NULL,   -- alta = registro del consentimiento
      confirmed_at TEXT,            -- doble opt-in completado
      city         TEXT,            -- madrid | barcelona | otra | NULL
      launch_news  INTEGER NOT NULL DEFAULT 0
    );

    -- confirm: doble opt-in (7 días) · login: enlace mágico (15 min)
    -- unsub: baja de un clic en cada email (180 días)
    CREATE TABLE IF NOT EXISTS tokens (
      hash          TEXT PRIMARY KEY,
      subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      kind          TEXT NOT NULL,
      expires_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      hash          TEXT PRIMARY KEY,
      subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      expires_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export const ahora = () => new Date().toISOString();
const hash = (t) => createHash('sha256').update(t).digest('hex');

const CADUCIDAD = { confirm: 7 * 864e5, login: 15 * 6e4, unsub: 180 * 864e5 };

/* Crea un token de un tipo dado y devuelve el valor en claro (para el
   email); en la base solo queda el hash. */
export function crearToken(db, subscriberId, kind) {
  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + CADUCIDAD[kind]).toISOString();
  db.prepare('INSERT INTO tokens (hash, subscriber_id, kind, expires_at) VALUES (?, ?, ?, ?)')
    .run(hash(token), subscriberId, kind, expira);
  return token;
}

/* Devuelve el suscriptor del token si existe, es del tipo pedido y no ha
   caducado. Los tokens NO se borran al usarse: los de confirm/login los
   consumen también los escáneres de enlaces de los clientes de correo,
   y reusarlos dentro de su caducidad corta es inocuo. */
export function canjearToken(db, token, kind) {
  if (typeof token !== 'string' || token.length !== 64) return null;
  const fila = db.prepare(
    `SELECT s.* FROM tokens t JOIN subscribers s ON s.id = t.subscriber_id
     WHERE t.hash = ? AND t.kind = ? AND t.expires_at > ?`
  ).get(hash(token), kind, ahora());
  return fila ?? null;
}

export function crearSesion(db, subscriberId) {
  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + 30 * 864e5).toISOString();
  db.prepare('INSERT INTO sessions (hash, subscriber_id, expires_at) VALUES (?, ?, ?)')
    .run(hash(token), subscriberId, expira);
  return token;
}

export function sesionActiva(db, token) {
  if (typeof token !== 'string' || token.length !== 64) return null;
  const fila = db.prepare(
    `SELECT s.* FROM sessions x JOIN subscribers s ON s.id = x.subscriber_id
     WHERE x.hash = ? AND x.expires_at > ?`
  ).get(hash(token), ahora());
  return fila ?? null;
}

export function cerrarSesion(db, token) {
  if (typeof token === 'string' && token.length === 64) {
    db.prepare('DELETE FROM sessions WHERE hash = ?').run(hash(token));
  }
}

/* Puesto en la lista entre los confirmados, por orden de alta. */
export function puesto(db, id) {
  const total = db.prepare('SELECT COUNT(*) n FROM subscribers WHERE confirmed_at IS NOT NULL').get().n;
  const pos = db.prepare(
    'SELECT COUNT(*) n FROM subscribers WHERE confirmed_at IS NOT NULL AND id <= ?'
  ).get(id).n;
  return { position: pos, total };
}

export function ventana(db) {
  const filas = db.prepare("SELECT key, value FROM config WHERE key IN ('open', 'closesAt')").all();
  const cfg = Object.fromEntries(filas.map((f) => [f.key, f.value]));
  let open = cfg.open === '1';
  const closesAt = cfg.closesAt || null;
  if (open && closesAt && new Date(closesAt).getTime() <= Date.now()) open = false;
  return { open, closesAt: open ? closesAt : null };
}

export function fijarVentana(db, open, closesAt) {
  const pon = db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  pon.run('open', open ? '1' : '0');
  pon.run('closesAt', closesAt || '');
}

/* Limpieza periódica de tokens y sesiones caducados. */
export function purgarCaducados(db) {
  const t = ahora();
  db.prepare('DELETE FROM tokens WHERE expires_at <= ?').run(t);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(t);
}
