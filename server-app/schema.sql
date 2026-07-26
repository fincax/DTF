-- ============================================================
-- DTF. — Esquema del backend de la app (Postgres)
-- Minimización RGPD: se guarda lo que el producto necesita y
-- nada más. De la verificación de edad solo el resultado; del
-- vídeo, el ID en la plataforma gestionada (nunca el fichero).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  role          TEXT NOT NULL DEFAULT 'user',      -- user | mod
  -- Verificación de edad: SOLO el resultado (PRODUCTO.md §3).
  -- Nunca biometría ni documento: eso vive y muere en el proveedor.
  age_verified  BOOLEAN NOT NULL DEFAULT false,
  age_method    TEXT,                              -- facial | documento
  age_provider  TEXT,
  age_at        TIMESTAMPTZ,
  banned_at     TIMESTAMPTZ,
  ban_reason    TEXT,
  paused        BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nombre      TEXT,
  anio_nac    INT,
  ciudad      TEXT,                                -- madrid | barcelona | otra
  identidad   TEXT,
  orientacion TEXT,
  busco       TEXT,                                -- "qué buscas", en palabras
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vídeo de perfil: el fichero vive en la plataforma gestionada
-- (Stream/api.video/Mux). Aquí solo el ID y su estado de moderación.
CREATE TABLE IF NOT EXISTS videos (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id  TEXT NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'subiendo',   -- subiendo | pendiente | aprobado | rechazado
  auto_score   REAL,                               -- filtro automático (0..1)
  motivo       TEXT,                               -- si rechazado
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_at  TIMESTAMPTZ,
  revisado_por BIGINT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS videos_cola ON videos(estado, created_at);
CREATE INDEX IF NOT EXISTS videos_usuario ON videos(user_id, estado);

CREATE TABLE IF NOT EXISTS likes (
  from_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gusta      BOOLEAN NOT NULL,                     -- false = pass
  window_id  BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id, window_id)
);

-- Un match nace en una ventana y muere al cierre, salvo que tenga
-- plan aceptado: entonces vive hasta 24 h después de la hora del plan.
CREATE TABLE IF NOT EXISTS matches (
  id          BIGSERIAL PRIMARY KEY,
  a_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  b_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_id   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_sitio  TEXT,
  plan_at     TIMESTAMPTZ,
  plan_por    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  plan_ok_at  TIMESTAMPTZ,                         -- aceptado
  muerto_at   TIMESTAMPTZ,
  CHECK (a_id < b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS matches_par ON matches(a_id, b_id, window_id);
CREATE INDEX IF NOT EXISTS matches_vivos ON matches(muerto_at) WHERE muerto_at IS NULL;

CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL PRIMARY KEY,
  match_id   BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  from_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  texto      TEXT NOT NULL,                        -- v1: solo texto, sin fotos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_match ON messages(match_id, id);

CREATE TABLE IF NOT EXISTS reports (
  id         BIGSERIAL PRIMARY KEY,
  from_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,   -- anónimo para el reportado
  target_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id   BIGINT REFERENCES matches(id) ON DELETE SET NULL,
  categoria  TEXT NOT NULL,                        -- insistir | explicito | suplantacion | otro
  detalle    TEXT,
  estado     TEXT NOT NULL DEFAULT 'abierto',      -- abierto | resuelto
  resolucion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelto_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS reports_cola ON reports(estado, created_at);

CREATE TABLE IF NOT EXISTS blocks (
  from_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  hash       TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
  hash       TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,                        -- login
  expires_at TIMESTAMPTZ NOT NULL
);

-- Ventanas: la fuente de verdad de cuándo está abierto.
CREATE TABLE IF NOT EXISTS windows (
  id         BIGSERIAL PRIMARY KEY,
  opened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at  TIMESTAMPTZ NOT NULL,
  closed_at  TIMESTAMPTZ,
  barrida    BOOLEAN NOT NULL DEFAULT false        -- matches sin plan ya purgados
);
