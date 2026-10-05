-- ============================================================================
-- 001_init.sql
-- Schema inicial del sistema de soporte tecnico.
-- Canonico: contratos en packages/shared/src/{enums,types}.ts.
-- DB almacena codigos UPPER_SNAKE; los labels en espanol los resuelve la capa
-- de aplicacion a traves de TICKET_*_LABELS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensiones
-- ----------------------------------------------------------------------------
-- pg_trgm es opcional: si no esta disponible en el cluster, los indices
-- trigram se omiten (ver bloque DO mas abajo). El resto del esquema no
-- depende de la extension.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm no disponible; se omitiran los indices trigram';
END
$$;

-- ----------------------------------------------------------------------------
-- Tabla: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_format_chk
    CHECK (email = lower(email) AND position('@' in email) > 1),
  CONSTRAINT users_role_chk
    CHECK (role IN ('ADMIN', 'USER')),
  CONSTRAINT users_name_chk
    CHECK (char_length(trim(name)) BETWEEN 2 AND 80)
);

-- Email unico case-insensitive: normalizamos en la aplicacion y la columna
-- guarda el valor ya en minusculas. La restriccion UNIQUE se aplica en la
-- forma normalizada.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx
  ON users (lower(email));

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- ----------------------------------------------------------------------------
-- Tabla: tickets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id              TEXT        PRIMARY KEY,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  category        TEXT        NOT NULL,
  priority        TEXT        NOT NULL,
  priority_weight INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'PENDIENTE',
  requester_id    TEXT        NOT NULL,
  assigned_to_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT tickets_title_chk
    CHECK (char_length(trim(title)) BETWEEN 5 AND 120),
  CONSTRAINT tickets_description_chk
    CHECK (char_length(trim(description)) BETWEEN 10 AND 2000),
  CONSTRAINT tickets_category_chk
    CHECK (category IN ('HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'OTROS')),
  CONSTRAINT tickets_priority_chk
    CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  CONSTRAINT tickets_priority_weight_chk
    CHECK (priority_weight BETWEEN 0 AND 3),
  CONSTRAINT tickets_status_chk
    CHECK (status IN ('PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'CANCELADA')),
  CONSTRAINT tickets_priority_weight_match_chk
    CHECK (
      (priority = 'BAJA'     AND priority_weight = 0) OR
      (priority = 'MEDIA'    AND priority_weight = 1) OR
      (priority = 'ALTA'     AND priority_weight = 2) OR
      (priority = 'CRITICA'  AND priority_weight = 3)
    ),
  CONSTRAINT tickets_resolved_at_chk
    CHECK (
      (status = 'RESUELTA' AND resolved_at IS NOT NULL) OR
      (status <> 'RESUELTA' AND resolved_at IS NULL)
    ),
  CONSTRAINT tickets_requester_fk
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT tickets_assigned_to_fk
    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS tickets_status_idx
  ON tickets (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tickets_priority_idx
  ON tickets (priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tickets_category_idx
  ON tickets (category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tickets_requester_id_idx
  ON tickets (requester_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_id_idx
  ON tickets (assigned_to_id);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx
  ON tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_updated_at_idx
  ON tickets (updated_at DESC);

-- Indices trigram (solo si la extension pg_trgm esta cargada).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS tickets_title_trgm_idx '
         || 'ON tickets USING gin (title gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS tickets_description_trgm_idx '
         || 'ON tickets USING gin (description gin_trgm_ops)';
  ELSE
    RAISE NOTICE 'indices trigram omitidos: pg_trgm no instalado';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- Tabla: ticket_history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_history (
  id              TEXT        PRIMARY KEY,
  ticket_id       TEXT        NOT NULL,
  previous_status TEXT,
  new_status      TEXT        NOT NULL,
  changed_by_id   TEXT        NOT NULL,
  observation     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_history_previous_status_chk
    CHECK (
      previous_status IS NULL OR
      previous_status IN ('PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'CANCELADA')
    ),
  CONSTRAINT ticket_history_new_status_chk
    CHECK (new_status IN ('PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'CANCELADA')),
  CONSTRAINT ticket_history_observation_chk
    CHECK (observation IS NULL OR char_length(observation) <= 500),
  CONSTRAINT ticket_history_ticket_fk
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT ticket_history_changed_by_fk
    FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ticket_history_ticket_idx
  ON ticket_history (ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ticket_history_changed_by_idx
  ON ticket_history (changed_by_id);

-- ----------------------------------------------------------------------------
-- updated_at: trigger generico antes de UPDATE
-- ----------------------------------------------------------------------------
-- Mantener updated_at sincronizado en users y tickets. La capa de aplicacion
-- puede sobreescribir explicitamente updated_at (por ejemplo al cerrar un
-- ticket); en ese caso el BEFORE UPDATE trigger pisa el valor, por lo que
-- los repositorios deben escribir el timestamp deseado justo antes del UPDATE
-- y el trigger se ejecuta en la misma sentencia. Esto evita divergencias
-- silenciosas sin obligar a cada UPDATE a recordar fijar la columna.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_set_updated_at ON tickets;
CREATE TRIGGER trg_tickets_set_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
