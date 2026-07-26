/* Las reglas del producto, en un solo sitio (PRODUCTO.md §1 y §2).
   Si alguna vez discrepan el código y el documento, gana el documento
   y se arregla aquí. */

/* La ventana abierta ahora mismo, o null. */
export async function ventanaActiva(pool) {
  const { rows } = await pool.query(
    `SELECT * FROM windows WHERE closed_at IS NULL AND closes_at > now()
     ORDER BY id DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function estadoVentana(pool) {
  const v = await ventanaActiva(pool);
  return { open: !!v, closesAt: v ? v.closes_at.toISOString() : null };
}

/* Un perfil entra en el deck solo si está completo y su vídeo está
   aprobado. Sin vídeo aprobado no se ve a nadie: ni te ven ni ves. */
export async function perfilListo(pool, userId) {
  const { rows } = await pool.query(
    `SELECT u.age_verified, u.paused,
            p.ciudad, p.busco, p.identidad, p.orientacion, p.anio_nac, p.nombre,
            (SELECT id FROM videos WHERE user_id = u.id AND estado = 'aprobado'
             ORDER BY id DESC LIMIT 1) AS video_ok
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const r = rows[0];
  if (!r) return { listo: false, falta: ['cuenta'] };
  const falta = [];
  if (!r.age_verified) falta.push('verificacion_edad');
  if (!r.nombre || !r.anio_nac || !r.ciudad) falta.push('datos_basicos');
  if (!r.identidad || !r.orientacion) falta.push('identidad');
  if (!r.busco) falta.push('busco');
  if (!r.video_ok) falta.push('video_aprobado');
  return { listo: falta.length === 0, falta, pausado: r.paused };
}

/* Se puede escribir en un match si sigue vivo Y (la ventana está
   abierta O el plan aceptado le da prórroga de 24 h tras la cita). */
export function matchEscribible(match, hayVentana) {
  if (!match || match.muerto_at) return false;
  if (hayVentana) return true;
  if (!match.plan_ok_at || !match.plan_at) return false;
  return Date.now() < new Date(match.plan_at).getTime() + 24 * 3600e3;
}

/* Cierre de ventana: mueren los matches sin plan aceptado y sus
   mensajes. Los que tienen plan sobreviven; se barren después, 24 h
   más tarde de la hora del plan. Es idempotente a propósito: se
   puede llamar cada minuto sin miedo. */
export async function barrerCaducados(pool) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    // 1. Ventanas ya vencidas: cerrarlas.
    await cliente.query(
      'UPDATE windows SET closed_at = now() WHERE closed_at IS NULL AND closes_at <= now()'
    );

    // 2. Matches de ventanas cerradas sin plan aceptado: muertos.
    const sinPlan = await cliente.query(
      `UPDATE matches m SET muerto_at = now()
       FROM windows w
       WHERE m.window_id = w.id AND w.closed_at IS NOT NULL
         AND m.muerto_at IS NULL AND m.plan_ok_at IS NULL
       RETURNING m.id`
    );

    // 3. Matches con plan: mueren 24 h después de la hora del plan.
    const conPlan = await cliente.query(
      `UPDATE matches SET muerto_at = now()
       WHERE muerto_at IS NULL AND plan_ok_at IS NOT NULL
         AND plan_at + interval '24 hours' <= now()
       RETURNING id`
    );

    // 4. Los mensajes se van con su match: nada se acumula.
    const ids = [...sinPlan.rows, ...conPlan.rows].map((r) => r.id);
    if (ids.length) {
      await cliente.query('DELETE FROM messages WHERE match_id = ANY($1::bigint[])', [ids]);
    }

    await cliente.query('COMMIT');
    return { muertos: ids.length };
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}

/* El deck de la ventana: perfiles listos, no vistos en esta ventana,
   sin bloqueos en ninguna dirección y sin uno mismo. Orden v1: misma
   ciudad primero y luego los más recientes (sin algoritmo: no hay
   datos todavía, PRODUCTO.md §2). */
export async function deck(pool, userId, windowId, limite = 20) {
  const { rows } = await pool.query(
    `SELECT u.id, p.nombre, p.anio_nac, p.ciudad, p.identidad, p.orientacion, p.busco,
            v.external_id AS video_id,
            (p.ciudad = (SELECT ciudad FROM profiles WHERE user_id = $1)) AS misma_ciudad
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN LATERAL (SELECT external_id FROM videos
                   WHERE user_id = u.id AND estado = 'aprobado'
                   ORDER BY id DESC LIMIT 1) v ON true
     WHERE u.id <> $1
       AND u.deleted_at IS NULL AND u.banned_at IS NULL
       AND u.paused = false AND u.age_verified = true
       AND p.busco IS NOT NULL AND p.ciudad IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM likes l
                       WHERE l.from_id = $1 AND l.to_id = u.id AND l.window_id = $2)
       AND NOT EXISTS (SELECT 1 FROM blocks b
                       WHERE (b.from_id = $1 AND b.to_id = u.id)
                          OR (b.from_id = u.id AND b.to_id = $1))
     ORDER BY misma_ciudad DESC, u.id DESC
     LIMIT $3`,
    [userId, windowId, limite]
  );
  return rows;
}

/* Like: si el otro ya te había dado like en esta misma ventana, hay
   match. El par se guarda ordenado (a_id < b_id) para no duplicar. */
export async function darLike(pool, deId, aId, windowId, gusta) {
  await pool.query(
    `INSERT INTO likes (from_id, to_id, gusta, window_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (from_id, to_id, window_id) DO UPDATE SET gusta = excluded.gusta`,
    [deId, aId, gusta, windowId]
  );
  if (!gusta) return { match: null };

  const reciproco = await pool.query(
    'SELECT 1 FROM likes WHERE from_id = $1 AND to_id = $2 AND window_id = $3 AND gusta = true',
    [aId, deId, windowId]
  );
  if (!reciproco.rowCount) return { match: null };

  const [a, b] = deId < aId ? [deId, aId] : [aId, deId];
  const { rows } = await pool.query(
    `INSERT INTO matches (a_id, b_id, window_id) VALUES ($1, $2, $3)
     ON CONFLICT (a_id, b_id, window_id) DO UPDATE SET window_id = excluded.window_id
     RETURNING *`,
    [a, b, windowId]
  );
  return { match: rows[0] };
}
