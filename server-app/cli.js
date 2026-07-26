/* Administración del backend de la app:

     node cli.js ventana abrir 2026-08-01T23:58:00+02:00
     node cli.js ventana cerrar          # cierra y barre los matches sin plan
     node cli.js ventana estado
     node cli.js mod <email>             # da rol de moderación
     node cli.js cola                    # vídeos y reportes pendientes
     node cli.js stats
     node cli.js barrer                  # barrido manual de caducados
*/

import { crearPool, migrar } from './db.js';
import { barrerCaducados, estadoVentana } from './dominio.js';

const pool = crearPool(process.env.DATABASE_URL || 'postgres://dtf@/dtf_app');
await migrar(pool);

const [, , orden, ...args] = process.argv;
const uno = async (sql, p = []) => (await pool.query(sql, p)).rows[0];

switch (`${orden} ${args[0] ?? ''}`.trim()) {
  case 'ventana abrir': {
    const cierre = new Date(args[1]);
    if (Number.isNaN(cierre.getTime()) || cierre <= new Date()) {
      console.error('Hora de cierre inválida. Ej: node cli.js ventana abrir 2026-08-01T23:58:00+02:00');
      process.exit(1);
    }
    const abierta = await uno('SELECT id FROM windows WHERE closed_at IS NULL AND closes_at > now()');
    if (abierta) { console.error(`Ya hay una ventana abierta (id ${abierta.id}).`); process.exit(1); }
    const v = await uno('INSERT INTO windows (closes_at) VALUES ($1) RETURNING *', [cierre]);
    console.log(`Ventana ${v.id} abierta hasta ${v.closes_at.toISOString()}.`);
    console.log('Recuerda: el aviso a los usuarios es una sola push, ahora.');
    break;
  }
  case 'ventana cerrar': {
    await pool.query('UPDATE windows SET closed_at = now() WHERE closed_at IS NULL');
    const { muertos } = await barrerCaducados(pool);
    console.log(`Ventana cerrada. Matches caducados: ${muertos}.`);
    break;
  }
  case 'ventana estado':
    console.log(await estadoVentana(pool));
    break;

  case 'barrer': {
    const { muertos } = await barrerCaducados(pool);
    console.log(`Matches caducados: ${muertos}.`);
    break;
  }
  case 'cola': {
    const v = await uno("SELECT count(*) n FROM videos WHERE estado = 'pendiente'");
    const r = await uno("SELECT count(*) n FROM reports WHERE estado = 'abierto'");
    console.log(`vídeos pendientes de revisión: ${v.n}`);
    console.log(`reportes abiertos:             ${r.n}`);
    break;
  }
  case 'stats': {
    const s = await uno(`SELECT
      (SELECT count(*) FROM users WHERE deleted_at IS NULL) usuarios,
      (SELECT count(*) FROM users WHERE age_verified) verificados,
      (SELECT count(*) FROM videos WHERE estado = 'aprobado') publicados,
      (SELECT count(*) FROM matches WHERE muerto_at IS NULL) matches_vivos,
      (SELECT count(*) FROM matches WHERE plan_ok_at IS NOT NULL) planes_aceptados`);
    console.log(s);
    /* La métrica que decide la v2 (PRODUCTO.md §6.3) */
    const m = await uno('SELECT count(*) t, count(plan_ok_at) c FROM matches');
    if (Number(m.t)) console.log(`matches con plan aceptado: ${Math.round((m.c / m.t) * 100)}%`);
    break;
  }
  default:
    if (orden === 'mod' && args[0]) {
      const u = await uno("UPDATE users SET role = 'mod' WHERE email = $1 RETURNING id", [args[0].toLowerCase()]);
      console.log(u ? `${args[0]} es moderación.` : 'No existe ese email.');
      break;
    }
    console.log('Órdenes: ventana abrir <ISO> | ventana cerrar | ventana estado | mod <email> | cola | stats | barrer');
}

await pool.end();
