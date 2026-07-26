/* ============================================================
   DTF. — Backend de la app
   Node + Postgres + WebSockets (PRODUCTO.md §5). Contrato de la
   API en CONTRATO.md. Sesión por Bearer: la app no usa cookies.
   ============================================================ */

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crearPool, migrar, crearToken, canjearToken, crearSesion,
  usuarioDeSesion, cerrarSesion, nuevoToken
} from './db.js';
import {
  estadoVentana, ventanaActiva, perfilListo, matchEscribible,
  barrerCaducados, deck, darLike
} from './dominio.js';
import { configurarCorreo } from '../server/email.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

const CFG = {
  port: Number(process.env.PORT || 8788),
  host: process.env.HOST || '127.0.0.1',
  dbUrl: process.env.DATABASE_URL || 'postgres://dtf@/dtf_app',
  appUrl: (process.env.APP_URL || 'dtf://').replace(/\/$/, ''),
  dataDir: process.env.DATA_DIR || join(AQUI, 'data'),
  hookSecret: process.env.VIDEO_HOOK_SECRET || 'dev-secret',
  /* Umbral del filtro automático: por encima, rechazo sin humano.
     Por debajo, SIEMPRE pasa por revisión humana (PRODUCTO.md §4). */
  autoRechazo: Number(process.env.AUTO_RECHAZO || 0.9),
  /* Enlaces de acceso por IP y 10 minutos. Configurable porque en
     pruebas y en staging se crean muchas cuentas desde una sola IP. */
  maxEnlaces: Number(process.env.RATE_LINK || 5)
};

const pool = crearPool(CFG.dbUrl);
await migrar(pool);
const correo = configurarCorreo({
  apiKey: process.env.BREVO_API_KEY,
  from: process.env.EMAIL_FROM || 'DTF. <aviso@dtf.app>',
  dataDir: CFG.dataDir
});

/* Barrido de matches caducados: la ventana cierra sola aunque nadie
   mire (PRODUCTO.md §1). */
setInterval(() => barrerCaducados(pool).catch((e) => console.error('[barrido]', e.message)), 60_000).unref();

/* --- utilidades HTTP ---------------------------------------- */
const json = (res, codigo, cuerpo) => {
  const datos = cuerpo === undefined ? '' : JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    ...(datos && { 'Content-Type': 'application/json; charset=utf-8' }),
    'Cache-Control': 'no-store'
  });
  res.end(datos);
};

function leerCuerpo(req) {
  return new Promise((res, rej) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 32768) { req.destroy(); rej(new Error('cuerpo grande')); } });
    req.on('end', () => { try { res(d ? JSON.parse(d) : {}); } catch { rej(new Error('JSON inválido')); } });
    req.on('error', rej);
  });
}

const golpes = new Map();
function admite(cubo, clave, max, ventanaMs) {
  const k = `${cubo}:${clave}`;
  const t = Date.now();
  const l = (golpes.get(k) || []).filter((x) => t - x < ventanaMs);
  if (l.length >= max) { golpes.set(k, l); return false; }
  l.push(t); golpes.set(k, l); return true;
}

const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const CIUDADES = ['madrid', 'barcelona', 'otra'];
const bearer = (req) => (/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '') || [])[1] || null;
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null) || null;

/* --- API ----------------------------------------------------- */
async function api(req, res, ruta) {
  const m = req.method;
  const ip = req.socket.remoteAddress || '?';

  /* Estado de la ventana: público (lo pinta la app antes de entrar) */
  if (ruta === '/api/app/window' && m === 'GET') {
    return json(res, 200, await estadoVentana(pool));
  }

  /* Webhook de la plataforma de vídeo + filtro automático.
     Score alto = rechazo automático; el resto va a cola HUMANA. */
  if (ruta === '/api/app/hooks/video' && m === 'POST') {
    if (req.headers['x-dtf-secret'] !== CFG.hookSecret) return json(res, 403, { error: 'secreto' });
    const { externalId, autoScore } = await leerCuerpo(req);
    const score = Number(autoScore ?? 0);
    const rechaza = score >= CFG.autoRechazo;
    const { rowCount } = await pool.query(
      `UPDATE videos SET estado = $2, auto_score = $3, motivo = $4, revisado_at = $5
       WHERE external_id = $1 AND estado = 'subiendo'`,
      [texto(externalId, 200), rechaza ? 'rechazado' : 'pendiente', score,
       rechaza ? 'Contenido explícito detectado automáticamente.' : null,
       rechaza ? new Date() : null]
    );
    return json(res, rowCount ? 204 : 404, rowCount ? undefined : { error: 'no existe' });
  }

  /* --- Acceso: enlace mágico ------------------------------- */
  if (ruta === '/api/app/auth/link' && m === 'POST') {
    if (!admite('link', ip, CFG.maxEnlaces, 6e5)) return json(res, 429, { error: 'despacio' });
    const { email: crudo } = await leerCuerpo(req);
    const email = String(crudo || '').trim().toLowerCase();
    if (!EMAIL_OK.test(email)) return json(res, 400, { error: 'email inválido' });

    const { rows } = await pool.query(
      `INSERT INTO users (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = excluded.email
       RETURNING id, banned_at`,
      [email]
    );
    /* A un expulsado no se le manda enlace, pero la respuesta es la
       misma: no se confirma quién tiene cuenta. */
    if (!rows[0].banned_at) {
      const token = await crearToken(pool, rows[0].id);
      await correo.enviar({
        to: email,
        subject: 'Tu enlace para entrar.',
        text: `Abre la app con este enlace. Caduca en 15 minutos.\n\n${CFG.appUrl}/entrar?token=${token}\n\nSi no lo has pedido tú, ignóralo.`
      });
    }
    return json(res, 204);
  }

  if (ruta === '/api/app/auth/session' && m === 'POST') {
    const { token } = await leerCuerpo(req);
    const userId = await canjearToken(pool, token);
    if (!userId) return json(res, 410, { error: 'caducado' });
    return json(res, 200, { session: await crearSesion(pool, userId) });
  }

  /* --- A partir de aquí, con sesión ------------------------ */
  const sesion = bearer(req);
  const yo = sesion ? await usuarioDeSesion(pool, sesion) : null;
  if (!ruta.startsWith('/api/app/')) return json(res, 404, { error: 'no existe' });
  if (!yo) return json(res, 401, { error: 'sin sesión' });

  if (ruta === '/api/app/auth/logout' && m === 'POST') {
    await cerrarSesion(pool, sesion);
    return json(res, 204);
  }

  /* --- Onboarding y perfil --------------------------------- */
  if (ruta === '/api/app/me' && m === 'GET') {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [yo.id]);
    const { rows: vids } = await pool.query(
      'SELECT id, estado, motivo FROM videos WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [yo.id]
    );
    const estado = await perfilListo(pool, yo.id);
    return json(res, 200, {
      email: yo.email,
      rol: yo.role,
      pausado: yo.paused,
      edadVerificada: yo.age_verified,
      perfil: rows[0] ?? null,
      video: vids[0] ?? null,
      listo: estado.listo,
      falta: estado.falta
    });
  }

  /* Verificación de edad: el proveedor hace el trabajo sucio; aquí
     solo entra el RESULTADO (PRODUCTO.md §3). Nunca biometría. */
  if (ruta === '/api/app/me/age' && m === 'POST') {
    const { metodo, proveedor, resultado } = await leerCuerpo(req);
    if (!['facial', 'documento'].includes(metodo)) return json(res, 400, { error: 'método inválido' });
    if (resultado !== 'mayor') {
      return json(res, 403, { error: 'no verificado', siguiente: metodo === 'facial' ? 'documento' : null });
    }
    await pool.query(
      'UPDATE users SET age_verified = true, age_method = $2, age_provider = $3, age_at = now() WHERE id = $1',
      [yo.id, metodo, texto(proveedor, 60)]
    );
    return json(res, 204);
  }

  if (ruta === '/api/app/me/profile' && m === 'PATCH') {
    const b = await leerCuerpo(req);
    const anio = Number(b.anioNac);
    const ahora = new Date().getFullYear();
    if (b.anioNac != null && (!Number.isInteger(anio) || ahora - anio < 18 || ahora - anio > 100)) {
      return json(res, 400, { error: 'edad fuera de rango' });
    }
    if (b.ciudad != null && !CIUDADES.includes(b.ciudad)) return json(res, 400, { error: 'ciudad inválida' });
    await pool.query(
      `INSERT INTO profiles (user_id, nombre, anio_nac, ciudad, identidad, orientacion, busco)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         nombre = COALESCE(excluded.nombre, profiles.nombre),
         anio_nac = COALESCE(excluded.anio_nac, profiles.anio_nac),
         ciudad = COALESCE(excluded.ciudad, profiles.ciudad),
         identidad = COALESCE(excluded.identidad, profiles.identidad),
         orientacion = COALESCE(excluded.orientacion, profiles.orientacion),
         busco = COALESCE(excluded.busco, profiles.busco),
         updated_at = now()`,
      [yo.id, texto(b.nombre, 40), b.anioNac != null ? anio : null, b.ciudad ?? null,
       texto(b.identidad, 40), texto(b.orientacion, 40), texto(b.busco, 280)]
    );
    return json(res, 204);
  }

  /* Subida de vídeo: el fichero NUNCA pasa por aquí. Se devuelve una
     URL de subida directa firmada por la plataforma gestionada
     (ARQUITECTURA.md). En dev se simula. */
  if (ruta === '/api/app/me/video' && m === 'POST') {
    if (!admite('video', String(yo.id), 5, 36e5)) return json(res, 429, { error: 'despacio' });
    const externalId = nuevoToken().slice(0, 32);
    const { rows } = await pool.query(
      "INSERT INTO videos (user_id, external_id, estado) VALUES ($1, $2, 'subiendo') RETURNING id",
      [yo.id, externalId]
    );
    return json(res, 200, {
      videoId: rows[0].id,
      externalId,
      subidaUrl: `${process.env.VIDEO_UPLOAD_BASE || 'https://upload.ejemplo/dev'}/${externalId}`,
      maxSegundos: 30,
      nota: 'Grabación en vivo, sin galería. Al terminar, la plataforma avisa por webhook y el vídeo entra en cola de revisión.'
    });
  }

  /* --- Ventana y deck -------------------------------------- */
  if (ruta === '/api/app/deck' && m === 'GET') {
    const v = await ventanaActiva(pool);
    if (!v) return json(res, 409, { error: 'cerrado' });
    const estado = await perfilListo(pool, yo.id);
    if (!estado.listo) return json(res, 412, { error: 'perfil incompleto', falta: estado.falta });
    return json(res, 200, { closesAt: v.closes_at, gente: await deck(pool, yo.id, v.id) });
  }

  const like = /^\/api\/app\/deck\/(\d+)\/(like|pass)$/.exec(ruta);
  if (like && m === 'POST') {
    const v = await ventanaActiva(pool);
    if (!v) return json(res, 409, { error: 'cerrado' });
    const estado = await perfilListo(pool, yo.id);
    if (!estado.listo) return json(res, 412, { error: 'perfil incompleto', falta: estado.falta });
    const otro = Number(like[1]);
    if (otro === Number(yo.id)) return json(res, 400, { error: 'contigo no' });
    const { match } = await darLike(pool, yo.id, otro, v.id, like[2] === 'like');
    return json(res, 200, { match: match ? { id: match.id } : null });
  }

  /* --- Matches, plan y mensajes ---------------------------- */
  if (ruta === '/api/app/matches' && m === 'GET') {
    const { rows } = await pool.query(
      `SELECT m.*, p.nombre, u.id AS otro_id
       FROM matches m
       JOIN users u ON u.id = CASE WHEN m.a_id = $1 THEN m.b_id ELSE m.a_id END
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE (m.a_id = $1 OR m.b_id = $1) AND m.muerto_at IS NULL
       ORDER BY m.id DESC`,
      [yo.id]
    );
    const v = await ventanaActiva(pool);
    return json(res, 200, {
      matches: rows.map((r) => ({
        id: r.id,
        otro: { id: r.otro_id, nombre: r.nombre },
        plan: r.plan_at ? { sitio: r.plan_sitio, at: r.plan_at, por: r.plan_por, aceptado: !!r.plan_ok_at } : null,
        escribible: matchEscribible(r, !!v),
        /* Sin plan aceptado, este match muere al cierre. Se dice claro. */
        caducaAlCierre: !r.plan_ok_at
      }))
    });
  }

  const plan = /^\/api\/app\/matches\/(\d+)\/plan(\/aceptar)?$/.exec(ruta);
  if (plan && m === 'POST') {
    const { rows } = await pool.query(
      'SELECT * FROM matches WHERE id = $1 AND (a_id = $2 OR b_id = $2) AND muerto_at IS NULL',
      [Number(plan[1]), yo.id]
    );
    const match = rows[0];
    if (!match) return json(res, 404, { error: 'no existe' });
    const v = await ventanaActiva(pool);
    if (!matchEscribible(match, !!v)) return json(res, 409, { error: 'match cerrado' });

    if (plan[2]) {
      if (!match.plan_at) return json(res, 409, { error: 'no hay plan' });
      if (String(match.plan_por) === String(yo.id)) return json(res, 409, { error: 'lo propusiste tú' });
      await pool.query('UPDATE matches SET plan_ok_at = now() WHERE id = $1', [match.id]);
      return json(res, 204);
    }

    const { sitio, at } = await leerCuerpo(req);
    const cuando = new Date(at);
    if (!texto(sitio, 120) || Number.isNaN(cuando.getTime()) || cuando.getTime() < Date.now()) {
      return json(res, 400, { error: 'plan inválido: hace falta sitio y una hora futura' });
    }
    await pool.query(
      'UPDATE matches SET plan_sitio = $2, plan_at = $3, plan_por = $4, plan_ok_at = NULL WHERE id = $1',
      [match.id, texto(sitio, 120), cuando, yo.id]
    );
    return json(res, 204);
  }

  const msgs = /^\/api\/app\/matches\/(\d+)\/messages$/.exec(ruta);
  if (msgs && m === 'GET') {
    const { rows } = await pool.query(
      `SELECT ms.id, ms.from_id, ms.texto, ms.created_at FROM messages ms
       JOIN matches ma ON ma.id = ms.match_id
       WHERE ms.match_id = $1 AND (ma.a_id = $2 OR ma.b_id = $2) AND ma.muerto_at IS NULL
       ORDER BY ms.id`,
      [Number(msgs[1]), yo.id]
    );
    return json(res, 200, { mensajes: rows });
  }

  /* --- Seguridad ------------------------------------------- */
  if (ruta === '/api/app/report' && m === 'POST') {
    const b = await leerCuerpo(req);
    const cat = ['insistir', 'explicito', 'suplantacion', 'otro'].includes(b.categoria) ? b.categoria : null;
    if (!cat || !Number(b.usuarioId)) return json(res, 400, { error: 'reporte inválido' });
    await pool.query(
      'INSERT INTO reports (from_id, target_id, match_id, categoria, detalle) VALUES ($1, $2, $3, $4, $5)',
      [yo.id, Number(b.usuarioId), b.matchId ? Number(b.matchId) : null, cat, texto(b.detalle, 1000)]
    );
    return json(res, 204);
  }

  if (ruta === '/api/app/block' && m === 'POST') {
    const { usuarioId } = await leerCuerpo(req);
    const otro = Number(usuarioId);
    if (!otro || otro === Number(yo.id)) return json(res, 400, { error: 'usuario inválido' });
    await pool.query(
      'INSERT INTO blocks (from_id, to_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [yo.id, otro]
    );
    /* Bloquear mata el match: no se debe cortesía a quien te incomoda. */
    const [a, b2] = Number(yo.id) < otro ? [yo.id, otro] : [otro, yo.id];
    await pool.query(
      'UPDATE matches SET muerto_at = now() WHERE a_id = $1 AND b_id = $2 AND muerto_at IS NULL', [a, b2]
    );
    return json(res, 204);
  }

  /* --- Cuenta: pausa, export y borrado (RGPD) -------------- */
  if (ruta === '/api/app/me/pause' && m === 'POST') {
    const { pausado } = await leerCuerpo(req);
    await pool.query('UPDATE users SET paused = $2 WHERE id = $1', [yo.id, !!pausado]);
    return json(res, 204);
  }

  if (ruta === '/api/app/me/export' && m === 'GET') {
    const [perfil, videos, matches, reportes] = await Promise.all([
      pool.query('SELECT * FROM profiles WHERE user_id = $1', [yo.id]),
      pool.query('SELECT id, estado, motivo, created_at FROM videos WHERE user_id = $1', [yo.id]),
      pool.query('SELECT id, created_at, plan_sitio, plan_at, plan_ok_at FROM matches WHERE a_id = $1 OR b_id = $1', [yo.id]),
      pool.query('SELECT id, categoria, created_at FROM reports WHERE from_id = $1', [yo.id])
    ]);
    return json(res, 200, {
      descripcion: 'Todos los datos que DTF. guarda sobre ti.',
      cuenta: {
        email: yo.email, alta: yo.created_at,
        edad_verificada: yo.age_verified, metodo: yo.age_method, proveedor: yo.age_provider,
        nota: 'De la verificación solo guardamos el resultado: ni documento ni datos biométricos.'
      },
      perfil: perfil.rows[0] ?? null,
      videos: videos.rows,
      matches: matches.rows,
      reportes_enviados: reportes.rows
    });
  }

  if (ruta === '/api/app/me' && m === 'DELETE') {
    /* Borrado real. El vídeo se purga TAMBIÉN en la plataforma: sin
       esta llamada el borrado sería mentira (ARQUITECTURA.md). */
    const { rows } = await pool.query('SELECT external_id FROM videos WHERE user_id = $1', [yo.id]);
    for (const v of rows) await borrarVideoRemoto(v.external_id);
    await pool.query('DELETE FROM users WHERE id = $1', [yo.id]);
    return json(res, 204);
  }

  /* --- Backoffice de moderación (rol mod) ------------------ */
  if (ruta.startsWith('/api/app/mod/')) {
    if (yo.role !== 'mod') return json(res, 403, { error: 'solo moderación' });

    if (ruta === '/api/app/mod/videos' && m === 'GET') {
      const { rows } = await pool.query(
        `SELECT v.id, v.user_id, v.external_id, v.auto_score, v.created_at
         FROM videos v WHERE v.estado = 'pendiente'
         ORDER BY v.auto_score DESC NULLS LAST, v.created_at ASC LIMIT 50`
      );
      return json(res, 200, { cola: rows });
    }

    const vid = /^\/api\/app\/mod\/videos\/(\d+)$/.exec(ruta);
    if (vid && m === 'POST') {
      const { decision, motivo } = await leerCuerpo(req);
      if (!['aprobado', 'rechazado'].includes(decision)) return json(res, 400, { error: 'decisión inválida' });
      const { rowCount } = await pool.query(
        `UPDATE videos SET estado = $2, motivo = $3, revisado_at = now(), revisado_por = $4
         WHERE id = $1 AND estado = 'pendiente'`,
        [Number(vid[1]), decision, decision === 'rechazado' ? texto(motivo, 200) : null, yo.id]
      );
      return json(res, rowCount ? 204 : 409, rowCount ? undefined : { error: 'ya revisado' });
    }

    if (ruta === '/api/app/mod/reports' && m === 'GET') {
      const { rows } = await pool.query(
        "SELECT * FROM reports WHERE estado = 'abierto' ORDER BY created_at LIMIT 50"
      );
      return json(res, 200, { cola: rows });
    }

    const rep = /^\/api\/app\/mod\/reports\/(\d+)$/.exec(ruta);
    if (rep && m === 'POST') {
      const { resolucion, expulsar } = await leerCuerpo(req);
      const { rows } = await pool.query(
        `UPDATE reports SET estado = 'resuelto', resolucion = $2, resuelto_at = now()
         WHERE id = $1 AND estado = 'abierto' RETURNING target_id`,
        [Number(rep[1]), texto(resolucion, 200)]
      );
      if (!rows[0]) return json(res, 409, { error: 'ya resuelto' });
      if (expulsar) {
        await pool.query(
          'UPDATE users SET banned_at = now(), ban_reason = $2 WHERE id = $1',
          [rows[0].target_id, texto(resolucion, 200) || 'Incumplimiento de las normas.']
        );
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].target_id]);
      }
      return json(res, 204);
    }
  }

  return json(res, 404, { error: 'no existe' });
}

/* Purga del vídeo en la plataforma gestionada. Stub hasta elegir
   proveedor en firme (PRODUCTO.md §4): con VIDEO_API_URL configurada
   se hace la llamada real. */
async function borrarVideoRemoto(externalId) {
  if (!process.env.VIDEO_API_URL) return;
  try {
    await fetch(`${process.env.VIDEO_API_URL}/${externalId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${process.env.VIDEO_API_KEY || ''}` }
    });
  } catch (e) {
    console.error('[video] no se pudo purgar', externalId, e.message);
  }
}

/* --- Servidor HTTP ------------------------------------------- */
const servidor = createServer(async (req, res) => {
  const ruta = (req.url || '/').split('?')[0];
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  /* CORS abierto: la sesión viaja en cabecera Bearer, nunca en cookie,
     así que no hay nada que un origen ajeno pueda reutilizar. Lo
     necesitan la vista web de desarrollo y el plan B PWA
     (PRODUCTO.md §0). */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-dtf-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  try {
    await api(req, res, ruta);
  } catch (e) {
    console.error(`[error] ${req.method} ${ruta}: ${e.message}`);
    if (!res.headersSent) json(res, /JSON|grande/.test(e.message) ? 400 : 500, { error: 'error' });
    else res.end();
  }
});

/* --- Chat en vivo (WebSocket) -------------------------------- */
const wss = new WebSocketServer({ noServer: true });
const conectados = new Map(); // userId -> Set<ws>

servidor.on('upgrade', async (req, socket, cabeza) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws') return socket.destroy();
    const yo = await usuarioDeSesion(pool, url.searchParams.get('token'));
    if (!yo) return socket.destroy();
    wss.handleUpgrade(req, socket, cabeza, (ws) => {
      ws.userId = String(yo.id);
      if (!conectados.has(ws.userId)) conectados.set(ws.userId, new Set());
      conectados.get(ws.userId).add(ws);
      ws.on('close', () => conectados.get(ws.userId)?.delete(ws));
      ws.on('message', (datos) => atenderMensaje(ws, datos).catch(() => {}));
      ws.send(JSON.stringify({ tipo: 'hola', userId: ws.userId }));
    });
  } catch { socket.destroy(); }
});

function envia(userId, objeto) {
  for (const ws of conectados.get(String(userId)) || []) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(objeto));
  }
}

async function atenderMensaje(ws, datos) {
  let msg;
  try { msg = JSON.parse(datos); } catch { return; }
  if (msg.tipo !== 'mensaje') return;

  const cuerpo = texto(msg.texto, 1000);
  if (!cuerpo) return;
  if (!admite('ws', ws.userId, 30, 6e4)) {
    return ws.send(JSON.stringify({ tipo: 'error', error: 'despacio' }));
  }

  const { rows } = await pool.query(
    'SELECT * FROM matches WHERE id = $1 AND (a_id = $2 OR b_id = $2) AND muerto_at IS NULL',
    [Number(msg.matchId), ws.userId]
  );
  const match = rows[0];
  const v = await ventanaActiva(pool);
  if (!matchEscribible(match, !!v)) {
    return ws.send(JSON.stringify({ tipo: 'error', error: 'este match ya no admite mensajes' }));
  }

  const { rows: guardado } = await pool.query(
    'INSERT INTO messages (match_id, from_id, texto) VALUES ($1, $2, $3) RETURNING id, created_at',
    [match.id, ws.userId, cuerpo]
  );
  const salida = {
    tipo: 'mensaje',
    matchId: Number(match.id),
    id: Number(guardado[0].id),
    from: ws.userId,
    texto: cuerpo,
    at: guardado[0].created_at
  };
  envia(match.a_id, salida);
  envia(match.b_id, salida);
}

servidor.listen(CFG.port, CFG.host, () => {
  console.log(`DTF. app-server en http://${CFG.host}:${CFG.port} — correo: ${correo.modo} — bd: ${CFG.dbUrl}`);
});
