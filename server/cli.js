/* CLI de administración del waitlist. Se ejecuta en el VPS, junto al
   servidor (comparten base de datos y configuración de correo):

     node cli.js stats
     node cli.js window show
     node cli.js window open 2026-08-01T23:58:00+02:00 --avisar
     node cli.js window close

   --avisar envía el email "Acaba de abrir." a todos los confirmados.
   También puede lanzarse suelto: node cli.js avisar */

import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirDb, crearToken, ventana, fijarVentana } from './db.js';
import { configurarCorreo, plantillas } from './email.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const db = abrirDb(process.env.DATA_DIR || join(RAIZ, 'server', 'data'));
const correo = configurarCorreo({
  apiKey: process.env.BREVO_API_KEY,
  from: process.env.EMAIL_FROM || 'DTF. <aviso@dtf.app>',
  dataDir: process.env.DATA_DIR || join(RAIZ, 'server', 'data')
});

const [, , orden, ...args] = process.argv;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function stats() {
  const n = (sql) => db.prepare(sql).get().n;
  console.log(`total:       ${n('SELECT COUNT(*) n FROM subscribers')}`);
  console.log(`confirmados: ${n('SELECT COUNT(*) n FROM subscribers WHERE confirmed_at IS NOT NULL')}`);
  console.log(`pendientes:  ${n('SELECT COUNT(*) n FROM subscribers WHERE confirmed_at IS NULL')}`);
  for (const f of db.prepare(
    "SELECT COALESCE(city, 'sin ciudad') c, COUNT(*) n FROM subscribers WHERE confirmed_at IS NOT NULL GROUP BY city ORDER BY n DESC"
  ).all()) console.log(`  ${f.c}: ${f.n}`);
}

async function avisar() {
  const v = ventana(db);
  if (!v.open || !v.closesAt) {
    console.error('La ventana no está abierta (o no tiene hora de cierre): no se avisa de nada.');
    process.exit(1);
  }
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid'
  }).format(new Date(v.closesAt));

  const lista = db.prepare(
    'SELECT id, email FROM subscribers WHERE confirmed_at IS NOT NULL ORDER BY id'
  ).all();
  console.log(`Avisando a ${lista.length} confirmados (cierre: ${hora})…`);

  let ok = 0, mal = 0;
  for (const s of lista) {
    const unsubUrl = `${BASE}/baja/?token=${crearToken(db, s.id, 'unsub')}`;
    try {
      await correo.enviar({ to: s.email, ...plantillas.ventanaAbierta(hora, unsubUrl, BASE + '/') });
      ok++;
    } catch (e) {
      mal++;
      console.error(`  fallo con id ${s.id}: ${e.message}`);
    }
    if (correo.modo === 'brevo') await espera(120); // sin ametrallar la API
  }
  console.log(`Hecho: ${ok} enviados, ${mal} fallos.`);
}

if (orden === 'stats') {
  stats();
} else if (orden === 'window' && args[0] === 'show') {
  console.log(ventana(db));
} else if (orden === 'window' && args[0] === 'close') {
  fijarVentana(db, false, null);
  console.log('Ventana cerrada.');
} else if (orden === 'window' && args[0] === 'open') {
  const closesAt = args[1];
  if (!closesAt || Number.isNaN(new Date(closesAt).getTime())) {
    console.error('Falta la hora de cierre. Ejemplo: node cli.js window open 2026-08-01T23:58:00+02:00');
    process.exit(1);
  }
  if (new Date(closesAt).getTime() <= Date.now()) {
    console.error('Esa hora de cierre ya ha pasado.');
    process.exit(1);
  }
  fijarVentana(db, true, closesAt);
  console.log(`Ventana abierta hasta ${closesAt}.`);
  if (args.includes('--avisar')) await avisar();
} else if (orden === 'avisar') {
  await avisar();
} else {
  console.log('Órdenes: stats | window show | window open <ISO8601> [--avisar] | window close | avisar');
  process.exit(orden ? 1 : 0);
}
