-- Migración 001: soporte para el módulo de Analítica.
-- Agrega requests.category (nueva columna) y la tabla sla_rules.
-- Motivo: el módulo de analítica necesita categorizar solicitudes y calcular
-- cumplimiento de SLA por prioridad; ninguno de los dos conceptos existía antes.

ALTER TABLE requests
  ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'otro';

ALTER TABLE requests
  ADD CONSTRAINT check_request_category
  CHECK (category IN ('soporte_tecnico', 'accesos_permisos', 'hardware', 'software', 'otro'));

-- Redundante con el DEFAULT (Postgres ya backfillea 'otro' al agregar la columna),
-- explícito por claridad y para dejar registro de la intención.
UPDATE requests SET category = 'otro' WHERE category IS NULL;

CREATE INDEX idx_requests_category ON requests(category);

CREATE TABLE sla_rules (
  priority VARCHAR(20) PRIMARY KEY
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  hours_to_resolve INTEGER NOT NULL,
  hours_to_first_response INTEGER NOT NULL
);

INSERT INTO sla_rules (priority, hours_to_resolve, hours_to_first_response) VALUES
  ('urgent', 4, 1),
  ('high', 24, 6),
  ('medium', 48, 12),
  ('low', 72, 18);
