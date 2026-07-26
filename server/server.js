/* ============================================================
   DTF. — Servidor del waitlist
   Un solo proceso Node sin dependencias: sirve la web estática
   y la API. Pensado para un VPS (clouding.io) detrás de un
   proxy con TLS (Caddy/nginx). Ver server/README.md.
   ============================================================ */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  abrirDb, ahora, crearToken, canjearToken, crearSesion, sesionActiva,
  cerrarSesion, puesto, ventana, purgarCaducados
} from './db.js';
import { configurarCorreo, plantillas } from './email.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CFG = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '127.0.0.1',
  baseUrl: (process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 8787}`).replace(/\/$/, ''),
  dataDir: process.env.DATA_DIR || join(RAIZ, 'server', 'data'),
  trustProxy: process.env.TRUST_PROXY === '1'
};

const db = abrirDb(CFG.dataDir);
const correo = configurarCorreo({
  apiKey: process.env.BREVO_API_KEY,
  from: process.env.EMAIL_FROM || 'DTF. <aviso@dtf.app>',
  dataDir: CFG.dataDir
});

purgarCaducados(db);
setInterval(() => purgarCaducados(db), 36e5).unref();

/* --- Rate limit por IP: ventana deslizante en memoria ------- */
const golpes = new Map();
function admite(cubo, ip, max, ventanaMs) {
  const clave = `${cubo}:${ip}`;
  const t = Date.now();
  const lista = (golpes.get(clave) || []).filter((x) => t - x < ventanaMs);
  if (lista.length >= max) { golpes.set(clave, lista); return false; }
  lista.push(t);
  golpes.set(clave, lista);
  return true;
}
setInterval(() => {
  const t = Date.now();
  for (const [k, v] of golpes) if (!v.some((x) => t - x < 6e5)) golpes.delete(k);
}, 6e5).unref();

/* --- Utilidades HTTP ---------------------------------------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

/* Solo se sirve lo público: ni /server, ni /.git, ni los .md. */
const PUBLICO = {
  dirs: new Set(['fonts', 'assets', 'privacidad', 'condiciones', 'entrar', 'panel', 'confirmar', 'baja']),
  files: new Set(['index.html', '404.html', 'favicon.svg', 'robots.txt', 'sitemap.xml'])
};

function ipDe(req) {
  if (CFG.trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '?';
}

function json(res, codigo, cuerpo, extra = {}) {
  const datos = cuerpo === undefined ? '' : JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    ...(datos && { 'Content-Type': 'application/json; charset=utf-8' }),
    'Cache-Control': 'no-store',
    ...extra
  });
  res.end(datos);
}

function leerCuerpo(req) {
  return new Promise((res, rej) => {
    let datos = '';
    req.on('data', (c) => {
      datos += c;
      if (datos.length > 10240) { req.destroy(); rej(new Error('cuerpo demasiado grande')); }
    });
    req.on('end', () => {
      try { res(datos ? JSON.parse(datos) : {}); } catch { rej(new Error('JSON inválido')); }
    });
    req.on('error', rej);
  });
}

function cookieSesion(req) {
  const m = /(?:^|;\s*)dtf_s=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}

function ponCookie(res, valor, maxAge) {
  const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (CFG.baseUrl.startsWith('https://')) flags.push('Secure');
  res.setHeader('Set-Cookie', `dtf_s=${valor}; ${flags.join('; ')}`);
}

const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const normalizaEmail = (e) => String(e || '').trim().toLowerCase();

/* Anti-CSRF: si el navegador manda Origin, debe ser el nuestro. */
function origenValido(req) {
  const origen = req.headers.origin;
  if (!origen) return true;
  try { return new URL(origen).host === new URL(CFG.baseUrl).host; } catch { return false; }
}

/* --- API ----------------------------------------------------- */
async function api(req, res, ruta) {
  const ip = ipDe(req);
  const metodo = req.method;

  if (metodo !== 'GET' && !origenValido(req)) return json(res, 403, { error: 'origen no permitido' });

  /* GET /api/window — la fuente de verdad de la franja de estado */
  if (ruta === '/api/window' && metodo === 'GET') {
    return json(res, 200, ventana(db));
  }

  /* POST /api/waitlist { email } — alta con doble opt-in.
     Responde 204 exista o no el email: aquí no se confirma quién está. */
  if (ruta === '/api/waitlist' && metodo === 'POST') {
    if (!admite('waitlist', ip, 5, 6e5)) return json(res, 429, { error: 'despacio' });
    const { email: crudo } = await leerCuerpo(req);
    const email = normalizaEmail(crudo);
    if (!EMAIL_OK.test(email) || email.length > 254) return json(res, 400, { error: 'email inválido' });

    let fila = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
    if (!fila) {
      const r = db.prepare('INSERT INTO subscribers (email, created_at) VALUES (?, ?)').run(email, ahora());
      fila = { id: r.lastInsertRowid, confirmed_at: null };
    }
    const unsubUrl = `${CFG.baseUrl}/baja/?token=${crearToken(db, fila.id, 'unsub')}`;
    const msg = fila.confirmed_at
      ? plantillas.yaDentro(`${CFG.baseUrl}/entrar/`, unsubUrl)
      : plantillas.confirmar(`${CFG.baseUrl}/confirmar/?token=${crearToken(db, fila.id, 'confirm')}`, unsubUrl);
    await correo.enviar({ to: email, ...msg });
    return json(res, 204);
  }

  /* POST /api/waitlist/confirm { token } — cierra el doble opt-in */
  if (ruta === '/api/waitlist/confirm' && metodo === 'POST') {
    if (!admite('confirm', ip, 20, 6e5)) return json(res, 429, { error: 'despacio' });
    const { token } = await leerCuerpo(req);
    const fila = canjearToken(db, token, 'confirm');
    if (!fila) return json(res, 410, { error: 'caducado' });
    if (!fila.confirmed_at) {
      db.prepare('UPDATE subscribers SET confirmed_at = ? WHERE id = ?').run(ahora(), fila.id);
    }
    return json(res, 204);
  }

  /* POST /api/waitlist/unsubscribe { token? } — borra de verdad.
     Con token (enlace de email) o con sesión (botón del panel). */
  if (ruta === '/api/waitlist/unsubscribe' && metodo === 'POST') {
    if (!admite('unsub', ip, 10, 6e5)) return json(res, 429, { error: 'despacio' });
    const { token } = await leerCuerpo(req);
    let fila = null;
    if (token) fila = canjearToken(db, token, 'unsub');
    else {
      const s = cookieSesion(req);
      fila = s ? sesionActiva(db, s) : null;
      if (fila) ponCookie(res, '', 0);
    }
    if (!fila) return json(res, 410, { error: 'caducado' });
    db.prepare('DELETE FROM subscribers WHERE id = ?').run(fila.id); // cascade: tokens y sesiones
    return json(res, 204);
  }

  /* POST /api/session/link { email } — pide el enlace mágico.
     204 siempre: no se revela si el email está en la lista. */
  if (ruta === '/api/session/link' && metodo === 'POST') {
    if (!admite('login', ip, 5, 6e5)) return json(res, 429, { error: 'despacio' });
    const { email: crudo } = await leerCuerpo(req);
    const email = normalizaEmail(crudo);
    if (!EMAIL_OK.test(email)) return json(res, 400, { error: 'email inválido' });
    const fila = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
    if (fila) {
      const unsubUrl = `${CFG.baseUrl}/baja/?token=${crearToken(db, fila.id, 'unsub')}`;
      const loginUrl = `${CFG.baseUrl}/api/session/start?token=${crearToken(db, fila.id, 'login')}`;
      await correo.enviar({ to: email, ...plantillas.entrar(loginUrl, unsubUrl) });
    }
    return json(res, 204);
  }

  /* GET /api/session/start?token=… — aterrizaje del enlace mágico */
  if (ruta === '/api/session/start' && metodo === 'GET') {
    const token = new URL(req.url, CFG.baseUrl).searchParams.get('token');
    const fila = canjearToken(db, token, 'login');
    if (!fila) return json(res, 303, undefined, { Location: '/entrar/' });
    ponCookie(res, crearSesion(db, fila.id), 30 * 86400);
    return json(res, 303, undefined, { Location: '/panel/' });
  }

  /* Resto de rutas: requieren sesión */
  const sesion = cookieSesion(req);
  const yo = sesion ? sesionActiva(db, sesion) : null;

  if (ruta === '/api/me' && metodo === 'GET') {
    if (!yo) return json(res, 401, { error: 'sin sesión' });
    return json(res, 200, {
      email: yo.email,
      joinedAt: yo.created_at,
      confirmed: !!yo.confirmed_at,
      city: yo.city,
      launchNews: !!yo.launch_news,
      ...puesto(db, yo.id)
    });
  }

  if (ruta === '/api/me' && metodo === 'PATCH') {
    if (!yo) return json(res, 401, { error: 'sin sesión' });
    if (!admite('me', ip, 30, 6e5)) return json(res, 429, { error: 'despacio' });
    const { city, launchNews } = await leerCuerpo(req);
    if (city != null && !['madrid', 'barcelona', 'otra'].includes(city)) {
      return json(res, 400, { error: 'ciudad inválida' });
    }
    db.prepare('UPDATE subscribers SET city = ?, launch_news = ? WHERE id = ?')
      .run(city ?? null, launchNews ? 1 : 0, yo.id);
    return json(res, 204);
  }

  /* GET /api/me/export — portabilidad RGPD: todo lo que hay, que es poco */
  if (ruta === '/api/me/export' && metodo === 'GET') {
    if (!yo) return json(res, 401, { error: 'sin sesión' });
    return json(res, 200, {
      descripcion: 'Todos los datos que DTF. guarda sobre ti. No hay más.',
      email: yo.email,
      alta_y_consentimiento: yo.created_at,
      doble_opt_in_confirmado: yo.confirmed_at,
      ciudad: yo.city,
      novedades_del_lanzamiento: !!yo.launch_news
    }, { 'Content-Disposition': 'attachment; filename="dtf-mis-datos.json"' });
  }

  if (ruta === '/api/session/close' && metodo === 'POST') {
    if (sesion) cerrarSesion(db, sesion);
    ponCookie(res, '', 0);
    return json(res, 204);
  }

  return json(res, 404, { error: 'no existe' });
}

/* --- Estáticos ----------------------------------------------- */
async function estatico(req, res, ruta) {
  let rel = normalize(decodeURIComponent(ruta)).replace(/^\/+/, '');
  if (rel === '' || rel === '.') rel = 'index.html';

  const primero = rel.split('/')[0];
  const permitido = PUBLICO.files.has(rel) || PUBLICO.dirs.has(primero);
  const destino = resolve(RAIZ, rel);
  let codigo = 200;

  let fichero = destino;
  if (!permitido || !destino.startsWith(RAIZ)) {
    codigo = 404; fichero = join(RAIZ, '404.html');
  } else {
    try {
      const s = await stat(fichero);
      if (s.isDirectory()) fichero = join(fichero, 'index.html');
      await stat(fichero);
    } catch {
      codigo = 404; fichero = join(RAIZ, '404.html');
    }
  }

  const datos = await readFile(fichero);
  const tipo = TIPOS[extname(fichero)] || 'application/octet-stream';
  const cache = codigo !== 200 ? 'no-cache'
    : primero === 'fonts' ? 'public, max-age=31536000, immutable'
    : primero === 'assets' || rel === 'favicon.svg' ? 'public, max-age=3600'
    : 'no-cache';

  res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': cache });
  res.end(req.method === 'HEAD' ? undefined : datos);
}

/* --- Servidor ------------------------------------------------- */
const servidor = createServer(async (req, res) => {
  const ruta = (req.url || '/').split('?')[0];

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');

  try {
    if (ruta.startsWith('/api/')) await api(req, res, ruta);
    else if (['GET', 'HEAD'].includes(req.method)) await estatico(req, res, ruta);
    else json(res, 405, { error: 'método no permitido' });
  } catch (e) {
    /* Sin query en el log: los tokens viajan ahí. Sin IPs ni emails. */
    console.error(`[error] ${req.method} ${ruta}: ${e.message}`);
    if (!res.headersSent) json(res, e.message.includes('JSON') || e.message.includes('grande') ? 400 : 500, { error: 'error' });
    else res.end();
  }
});

servidor.listen(CFG.port, CFG.host, () => {
  console.log(`DTF. servidor en http://${CFG.host}:${CFG.port} — correo: ${correo.modo} — datos: ${CFG.dataDir}`);
});
