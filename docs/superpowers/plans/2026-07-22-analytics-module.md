# Módulo de Analítica (KPIs de gestión) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar de punta a punta (DB → backend → frontend) los 7 KPIs de analítica de gestión (SLA, MTTR, distribución de estado, carga por agente, tendencias, distribución por categoría, tiempo de primera respuesta) para el sistema de solicitudes, con datos de demo realistas.

**Architecture:** Migración SQL nueva (columna `category` + tabla `sla_rules`) sobre el esquema existente de `requests`. Módulo backend por dominio (`src/analytics/`) con capa model→service→controller→routes, protegido por un nuevo permiso `analytics_read`. Módulo frontend con Pinia store de estado independiente por métrica, 7 componentes Vue (Chart.js vía `vue-chartjs`), y una vista que los ensambla en un grid con filtro de fechas.

**Tech Stack:** Node/Express/PostgreSQL (`pg` puro) + Zod; Vue 3/TypeScript/Pinia/Tailwind + `vue-chartjs`/`chart.js`.

## Global Constraints

- Toda query de analítica excluye `deleted_at IS NOT NULL`.
- MTTR y SLA excluyen `status = 'rejected'` y requieren `resolved_at IS NOT NULL`; usan `resolved_at`, nunca `closed_at`.
- `agent-workload` no lleva filtro de fecha (`dateFrom`/`dateTo`) — es una foto del presente, solo `deleted_at IS NULL AND status IN ('open','in_progress')` (+ `priority` opcional).
- Todas las queries parametrizadas (`$1, $2...`), nunca interpolación de strings con datos externos.
- `/trends` usa `generate_series` + `LEFT JOIN` + `COALESCE(...,0)` — nunca un join directo entre CTEs que pueda dejar huecos.
- El guard de ruta del frontend (`meta.requiresPermission`) no lleva bypass de `isAdmin` — solo `auth.hasPermission(perm)`.
- Seed de demo corre exclusivamente contra PostgreSQL local (`solicitudes_app`), nunca contra la Supabase de producción.
- Todos los endpoints requieren `authenticate` + `authorize('analytics_read')`.
- Nada de `any` en TypeScript nuevo del frontend.

---

### Task 1: Esquema — migración, `schema.sql` y permiso `analytics_read`

**Files:**
- Create: `backend/migrations/001_analytics.sql`
- Modify: `backend/schema.sql`
- Modify: `backend/src/seed/permissions.seed.js`

**Interfaces:**
- Produces: columna `requests.category` (`VARCHAR(30)`, valores `soporte_tecnico|accesos_permisos|hardware|software|otro`), tabla `sla_rules(priority PK, hours_to_resolve, hours_to_first_response)`, permiso `analytics_read` (asignado automáticamente al rol `admin` vía `permissions.seed.js` + `admin.seed.js` existentes, porque `admin.seed.js` asigna TODOS los permisos `is_protected = true` al rol admin).

- [ ] **Step 1: Crear la migración**

Crea `backend/migrations/001_analytics.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar la migración a PostgreSQL local**

```bash
export PATH="$PATH:/c/Program Files/PostgreSQL/18/bin"
psql -U postgres -h 127.0.0.1 -d solicitudes_app -f backend/migrations/001_analytics.sql
```

Expected: `ALTER TABLE`, `ALTER TABLE`, `UPDATE 0` (o el número de filas existentes), `CREATE INDEX`, `CREATE TABLE`, `INSERT 0 4`.

- [ ] **Step 3: Verificar el esquema aplicado**

```bash
psql -U postgres -h 127.0.0.1 -d solicitudes_app -c "\d requests" -c "SELECT * FROM sla_rules ORDER BY hours_to_resolve;"
```

Expected: `requests` incluye `category` con su `CHECK`; `sla_rules` tiene 4 filas (urgent/4/1, high/24/6, medium/48/12, low/72/18).

- [ ] **Step 4: Actualizar `schema.sql` para que el dump canónico incluya el cambio**

En `backend/schema.sql`, dentro de `CREATE TABLE public.requests`, agrega la columna después de `deleted_reason text,`:

```sql
    deleted_reason text,
    category character varying(30) DEFAULT 'otro'::character varying NOT NULL,
    CONSTRAINT check_request_category CHECK (((category)::text = ANY ((ARRAY['soporte_tecnico'::character varying, 'accesos_permisos'::character varying, 'hardware'::character varying, 'software'::character varying, 'otro'::character varying])::text[]))),
```

Y agrega, después del bloque `CREATE TABLE public.roles` (o en cualquier punto antes de los índices), la tabla nueva:

```sql
CREATE TABLE public.sla_rules (
    priority character varying(20) NOT NULL,
    hours_to_resolve integer NOT NULL,
    hours_to_first_response integer NOT NULL,
    CONSTRAINT sla_rules_pkey PRIMARY KEY (priority),
    CONSTRAINT sla_rules_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);

ALTER TABLE public.sla_rules OWNER TO postgres;

INSERT INTO public.sla_rules (priority, hours_to_resolve, hours_to_first_response) VALUES
  ('urgent', 4, 1),
  ('high', 24, 6),
  ('medium', 48, 12),
  ('low', 72, 18);
```

Y en la sección de índices, junto a los demás `idx_requests_*`:

```sql
CREATE INDEX idx_requests_category ON public.requests USING btree (category);
```

- [ ] **Step 5: Agregar el permiso `analytics_read` al seed**

En `backend/src/seed/permissions.seed.js`, dentro del array `permissions`, agrega al final (antes del `];`):

```js
  // ANALITICA
  { name: 'analytics_read',     description: 'Ver metricas y analitica del sistema',     is_protected: true },
```

- [ ] **Step 6: Re-ejecutar los seeds localmente**

```bash
cd backend
node src/seed/permissions.seed.js
node src/seed/admin.seed.js
```

Expected: `permissions.seed.js` imprime `🔒 analytics_read` entre los permisos procesados; `admin.seed.js` imprime `✅ 19 permisos asignados al rol "admin"` (18 anteriores + el nuevo).

- [ ] **Step 7: Verificar que el admin tiene el permiso**

```bash
psql -U postgres -h 127.0.0.1 -d solicitudes_app -c "SELECT p.name FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id JOIN roles r ON r.id = rp.role_id WHERE r.name = 'admin' AND p.name = 'analytics_read';"
```

Expected: una fila con `analytics_read`.

- [ ] **Step 8: Commit**

```bash
git add backend/migrations/001_analytics.sql backend/schema.sql backend/src/seed/permissions.seed.js
git commit -m "feat(analytics): migracion de esquema (category, sla_rules) y permiso analytics_read"
```

---

### Task 2: `analytics.validator.js`

**Files:**
- Create: `backend/src/analytics/analytics.validator.js`

**Interfaces:**
- Produces: `analyticsQuerySchema` (Zod), `trendsQuerySchema` (Zod, extiende la anterior con `granularity`). Ambos exportados para usarse en `analytics.routes.js` (Task 5) vía el middleware `validate` ya existente en `backend/src/shared/middleware/validate.middleware.js`.

- [ ] **Step 1: Crear el validador**

```js
const { z } = require('zod');

const priorityEnum = ['low', 'medium', 'high', 'urgent'];

const isoDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' })
  .optional();

const analyticsQuerySchema = z.object({
  dateFrom: isoDateString,
  dateTo: isoDateString,
  priority: z.enum(priorityEnum).optional(),
});

const trendsQuerySchema = analyticsQuerySchema.extend({
  granularity: z.enum(['week', 'month']).optional().default('week'),
});

module.exports = { analyticsQuerySchema, trendsQuerySchema };
```

- [ ] **Step 2: Verificar que carga sin errores**

```bash
cd backend
node -e "const v = require('./src/analytics/analytics.validator'); console.log(v.analyticsQuerySchema.parse({priority:'high'})); console.log(v.trendsQuerySchema.parse({}));"
```

Expected: imprime `{ priority: 'high' }` y `{ granularity: 'week' }` sin lanzar excepción.

- [ ] **Step 3: Commit**

```bash
git add backend/src/analytics/analytics.validator.js
git commit -m "feat(analytics): validador Zod de query params"
```

---

### Task 3: `analytics.model.js` — las 7 queries agregadas

**Files:**
- Create: `backend/src/analytics/analytics.model.js`

**Interfaces:**
- Consumes: `pool` de `backend/src/shared/config/db.js` (mismo patrón que `request.model.js`).
- Produces: `getSlaData`, `getMttrData`, `getStatusDistribution`, `getAgentWorkload`, `getTrendsData`, `getCategoryDistribution`, `getFirstResponseData` — todas `async ({dateFrom, dateTo, priority, granularity}) => ({rows...} | {byPriorityRows, totalsRow} | {overallRow, byPriorityRows, byAgentRows})`, consumidas por `analytics.service.js` (Task 4).

- [ ] **Step 1: Crear el modelo**

```js
const pool = require('../shared/config/db');

const buildPriorityFilter = (params, priority) => {
  if (!priority) return '';
  params.push(priority);
  return `AND r.priority = $${params.length}`;
};

const getSlaData = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  const byPriority = await pool.query(
    `SELECT
       r.priority,
       COUNT(*) FILTER (
         WHERE r.resolved_at <= r.created_at + (sr.hours_to_resolve || ' hours')::interval
       ) AS within,
       COUNT(*) AS total
     FROM requests r
     JOIN sla_rules sr ON sr.priority = r.priority
     WHERE r.deleted_at IS NULL
       AND r.status != 'rejected'
       AND r.resolved_at IS NOT NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}
     GROUP BY r.priority`,
    params
  );

  const totals = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE r.status = 'rejected') AS rejected,
       COUNT(*) AS total_created
     FROM requests r
     WHERE r.deleted_at IS NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}`,
    params
  );

  return { byPriorityRows: byPriority.rows, totalsRow: totals.rows[0] };
};

const getMttrData = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  const baseWhere = `
    r.deleted_at IS NULL
    AND r.status != 'rejected'
    AND r.resolved_at IS NOT NULL
    AND r.created_at BETWEEN $1 AND $2
    ${priorityFilter}
  `;

  const overall = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) AS avg_hours
     FROM requests r
     WHERE ${baseWhere}`,
    params
  );

  const byPriority = await pool.query(
    `SELECT r.priority, AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) AS avg_hours
     FROM requests r
     WHERE ${baseWhere}
     GROUP BY r.priority`,
    params
  );

  const byAgent = await pool.query(
    `SELECT
       u.id AS agent_id,
       u.name AS agent_name,
       AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) AS avg_hours,
       COUNT(*) AS tickets_resolved
     FROM requests r
     JOIN users u ON u.id = r.assigned_to
     WHERE ${baseWhere} AND r.assigned_to IS NOT NULL
     GROUP BY u.id, u.name
     ORDER BY tickets_resolved DESC`,
    params
  );

  return { overallRow: overall.rows[0], byPriorityRows: byPriority.rows, byAgentRows: byAgent.rows };
};

const getStatusDistribution = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `SELECT r.status, COUNT(*) AS count
     FROM requests r
     WHERE r.deleted_at IS NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}
     GROUP BY r.status`,
    params
  );
};

const getAgentWorkload = async ({ priority } = {}) => {
  const params = [];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `SELECT
       u.id AS agent_id,
       u.name AS agent_name,
       COUNT(*) FILTER (WHERE r.status = 'open') AS open_tickets,
       COUNT(*) FILTER (WHERE r.status = 'in_progress') AS in_progress_tickets,
       COUNT(*) AS total_active
     FROM requests r
     JOIN users u ON u.id = r.assigned_to
     WHERE r.deleted_at IS NULL
       AND r.status IN ('open', 'in_progress')
       ${priorityFilter}
     GROUP BY u.id, u.name
     ORDER BY total_active DESC`,
    params
  );
};

const getTrendsData = async ({ dateFrom, dateTo, priority, granularity }) => {
  const truncUnit = granularity === 'month' ? 'month' : 'week';
  const stepInterval = granularity === 'month' ? '1 month' : '1 week';
  const params = [dateFrom, dateTo, truncUnit, stepInterval];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `WITH periods AS (
       SELECT generate_series(
         date_trunc($3, $1::timestamp),
         date_trunc($3, $2::timestamp),
         $4::interval
       ) AS period
     ),
     created_counts AS (
       SELECT date_trunc($3, r.created_at) AS period, COUNT(*) AS created
       FROM requests r
       WHERE r.deleted_at IS NULL
         AND r.created_at BETWEEN $1 AND $2
         ${priorityFilter}
       GROUP BY 1
     ),
     resolved_counts AS (
       SELECT date_trunc($3, r.resolved_at) AS period, COUNT(*) AS resolved
       FROM requests r
       WHERE r.deleted_at IS NULL
         AND r.resolved_at IS NOT NULL
         AND r.created_at BETWEEN $1 AND $2
         ${priorityFilter}
       GROUP BY 1
     )
     SELECT
       periods.period,
       COALESCE(created_counts.created, 0) AS created,
       COALESCE(resolved_counts.resolved, 0) AS resolved
     FROM periods
     LEFT JOIN created_counts ON created_counts.period = periods.period
     LEFT JOIN resolved_counts ON resolved_counts.period = periods.period
     ORDER BY periods.period`,
    params
  );
};

const getCategoryDistribution = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `SELECT r.category, COUNT(*) AS count
     FROM requests r
     WHERE r.deleted_at IS NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}
     GROUP BY r.category`,
    params
  );
};

const getFirstResponseData = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `WITH first_response AS (
       SELECT
         r.id,
         r.priority,
         EXTRACT(EPOCH FROM (MIN(rh.created_at) - r.created_at)) / 3600 AS hours
       FROM requests r
       JOIN request_history rh
         ON rh.request_id = r.id AND rh.changed_by != r.user_id
       WHERE r.deleted_at IS NULL
         AND r.created_at BETWEEN $1 AND $2
         ${priorityFilter}
       GROUP BY r.id, r.priority
     )
     SELECT priority, AVG(hours) AS avg_hours
     FROM first_response
     GROUP BY ROLLUP(priority)
     ORDER BY priority NULLS LAST`,
    params
  );
};

module.exports = {
  getSlaData,
  getMttrData,
  getStatusDistribution,
  getAgentWorkload,
  getTrendsData,
  getCategoryDistribution,
  getFirstResponseData,
};

// Mejora futura: si el volumen de `requests` crece significativamente, estas
// agregaciones son candidatas a materialized views o a un job de node-cron
// (ya es dependencia del proyecto) que precalcule un resumen diario. No se
// implementa ahora — el volumen actual (cientos/pocos miles de filas) no lo justifica.
```

- [ ] **Step 2: Verificar cada query directamente contra la base de datos local**

Con al menos una solicitud resuelta en la base (usa las que ya creaste en sesiones anteriores, o espera al Task 6 para datos completos), corre:

```bash
cd backend
node -e "
require('dotenv').config();
const m = require('./src/analytics/analytics.model');
const range = { dateFrom: '2020-01-01', dateTo: '2030-01-01' };
(async () => {
  console.log('SLA:', await m.getSlaData(range));
  console.log('MTTR:', await m.getMttrData(range));
  console.log('Status:', (await m.getStatusDistribution(range)).rows);
  console.log('Workload:', (await m.getAgentWorkload({})).rows);
  console.log('Trends:', (await m.getTrendsData({...range, granularity: 'week'})).rows.slice(0,3));
  console.log('Category:', (await m.getCategoryDistribution(range)).rows);
  console.log('FirstResponse:', (await m.getFirstResponseData(range)).rows);
  process.exit();
})();
"
```

Expected: cada línea imprime datos sin lanzar excepción SQL (aunque los conteos estén en 0 antes de sembrar datos de demo).

- [ ] **Step 3: Commit**

```bash
git add backend/src/analytics/analytics.model.js
git commit -m "feat(analytics): modelo con las 7 queries agregadas"
```

---

### Task 4: `analytics.service.js` — shaping y valores por defecto

**Files:**
- Create: `backend/src/analytics/analytics.service.js`

**Interfaces:**
- Consumes: las 7 funciones de `analytics.model.js` (Task 3).
- Produces: `getSlaSummary`, `getMttrSummary`, `getStatusDistributionSummary`, `getAgentWorkloadSummary`, `getTrendsSummary`, `getCategoryDistributionSummary`, `getFirstResponseSummary` — todas `async (filters) => <forma exacta de respuesta del endpoint>`, consumidas por `analytics.controller.js` (Task 5).

- [ ] **Step 1: Crear el servicio**

```js
const {
  getSlaData,
  getMttrData,
  getStatusDistribution,
  getAgentWorkload,
  getTrendsData,
  getCategoryDistribution,
  getFirstResponseData,
} = require('./analytics.model');

const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const resolveDateRange = (dateFrom, dateTo) => {
  const to = dateTo ? new Date(dateTo) : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - SIX_MONTHS_MS);
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
};

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const getSlaSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { byPriorityRows, totalsRow } = await getSlaData({ ...range, priority: filters.priority });

  let withinSla = 0;
  let totalResolved = 0;

  const byPriority = PRIORITY_ORDER.map((priority) => {
    const row = byPriorityRows.find((r) => r.priority === priority);
    const within = row ? Number(row.within) : 0;
    const total = row ? Number(row.total) : 0;
    withinSla += within;
    totalResolved += total;
    return {
      priority,
      withinSlaPercentage: total ? round1((within / total) * 100) : 0,
      total,
    };
  });

  const totalCreated = Number(totalsRow.total_created) || 0;
  const rejected = Number(totalsRow.rejected) || 0;

  return {
    withinSla,
    breachedSla: totalResolved - withinSla,
    withinSlaPercentage: totalResolved ? round1((withinSla / totalResolved) * 100) : 0,
    totalResolved,
    rejectedPercentage: totalCreated ? round1((rejected / totalCreated) * 100) : 0,
    byPriority,
  };
};

const getMttrSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { overallRow, byPriorityRows, byAgentRows } = await getMttrData({ ...range, priority: filters.priority });

  const byPriority = PRIORITY_ORDER.map((priority) => {
    const row = byPriorityRows.find((r) => r.priority === priority);
    return { priority, avgHours: row ? round1(row.avg_hours) : 0 };
  });

  const byAgent = byAgentRows.map((row) => ({
    agentId: row.agent_id,
    agentName: row.agent_name,
    avgHours: round1(row.avg_hours),
    ticketsResolved: Number(row.tickets_resolved),
  }));

  return {
    overallMttrHours: round1(overallRow && overallRow.avg_hours),
    byPriority,
    byAgent,
  };
};

const getStatusDistributionSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { rows } = await getStatusDistribution({ ...range, priority: filters.priority });

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
    percentage: total ? round1((Number(r.count) / total) * 100) : 0,
  }));
};

const getAgentWorkloadSummary = async (filters) => {
  const { rows } = await getAgentWorkload({ priority: filters.priority });

  return rows.map((r) => ({
    agentId: r.agent_id,
    agentName: r.agent_name,
    openTickets: Number(r.open_tickets),
    inProgressTickets: Number(r.in_progress_tickets),
    totalActive: Number(r.total_active),
  }));
};

const getTrendsSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const granularity = filters.granularity === 'month' ? 'month' : 'week';
  const { rows } = await getTrendsData({ ...range, priority: filters.priority, granularity });

  return rows.map((r) => ({
    period: new Date(r.period).toISOString(),
    created: Number(r.created),
    resolved: Number(r.resolved),
  }));
};

const getCategoryDistributionSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { rows } = await getCategoryDistribution({ ...range, priority: filters.priority });

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return rows.map((r) => ({
    category: r.category,
    count: Number(r.count),
    percentage: total ? round1((Number(r.count) / total) * 100) : 0,
  }));
};

const getFirstResponseSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { rows } = await getFirstResponseData({ ...range, priority: filters.priority });

  const overallRow = rows.find((r) => r.priority === null);
  const byPriority = PRIORITY_ORDER.map((priority) => {
    const row = rows.find((r) => r.priority === priority);
    return { priority, avgHours: row ? round1(row.avg_hours) : 0 };
  });

  return {
    overallAvgHours: round1(overallRow && overallRow.avg_hours),
    byPriority,
  };
};

module.exports = {
  getSlaSummary,
  getMttrSummary,
  getStatusDistributionSummary,
  getAgentWorkloadSummary,
  getTrendsSummary,
  getCategoryDistributionSummary,
  getFirstResponseSummary,
};
```

- [ ] **Step 2: Verificar el servicio con rango por defecto**

```bash
cd backend
node -e "
require('dotenv').config();
const s = require('./src/analytics/analytics.service');
(async () => {
  console.log(JSON.stringify(await s.getSlaSummary({}), null, 2));
  console.log(JSON.stringify(await s.getAgentWorkloadSummary({}), null, 2));
})();
"
```

Expected: JSON con la forma `{ withinSla, breachedSla, withinSlaPercentage, totalResolved, rejectedPercentage, byPriority: [4 elementos] }` y un array (posiblemente vacío) para workload, sin excepciones.

- [ ] **Step 3: Commit**

```bash
git add backend/src/analytics/analytics.service.js
git commit -m "feat(analytics): servicio con shaping de respuestas y rango de fechas por defecto"
```

---

### Task 5: `analytics.controller.js` + `analytics.routes.js` + montaje

**Files:**
- Create: `backend/src/analytics/analytics.controller.js`
- Create: `backend/src/analytics/analytics.routes.js`
- Modify: `backend/src/routes/index.js`

**Interfaces:**
- Consumes: `analytics.service.js` (Task 4), `analytics.validator.js` (Task 2), middlewares existentes `authenticate` (`shared/middleware/authenticate.middleware.js`), `authorize` (`shared/middleware/authorizePermission.middleware.js`), `validate` (`shared/middleware/validate.middleware.js`).
- Produces: `/api/analytics/{sla,mttr,status-distribution,agent-workload,trends,category-distribution,first-response-time}`.

- [ ] **Step 1: Crear el controller**

```js
const service = require('./analytics.service');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getSla = asyncHandler(async (req, res) => {
  res.json(await service.getSlaSummary(req.query));
});

const getMttr = asyncHandler(async (req, res) => {
  res.json(await service.getMttrSummary(req.query));
});

const getStatusDistribution = asyncHandler(async (req, res) => {
  res.json(await service.getStatusDistributionSummary(req.query));
});

const getAgentWorkload = asyncHandler(async (req, res) => {
  res.json(await service.getAgentWorkloadSummary(req.query));
});

const getTrends = asyncHandler(async (req, res) => {
  res.json(await service.getTrendsSummary(req.query));
});

const getCategoryDistribution = asyncHandler(async (req, res) => {
  res.json(await service.getCategoryDistributionSummary(req.query));
});

const getFirstResponseTime = asyncHandler(async (req, res) => {
  res.json(await service.getFirstResponseSummary(req.query));
});

module.exports = {
  getSla,
  getMttr,
  getStatusDistribution,
  getAgentWorkload,
  getTrends,
  getCategoryDistribution,
  getFirstResponseTime,
};
```

- [ ] **Step 2: Crear las rutas**

```js
const express = require('express');
const router = express.Router();

const controller = require('./analytics.controller');
const authenticate = require('../shared/middleware/authenticate.middleware');
const authorize = require('../shared/middleware/authorizePermission.middleware');
const validate = require('../shared/middleware/validate.middleware');
const { analyticsQuerySchema, trendsQuerySchema } = require('./analytics.validator');

router.get(
  '/sla',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getSla
);

router.get(
  '/mttr',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getMttr
);

router.get(
  '/status-distribution',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getStatusDistribution
);

router.get(
  '/agent-workload',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getAgentWorkload
);

router.get(
  '/trends',
  authenticate,
  authorize('analytics_read'),
  validate(trendsQuerySchema, 'query'),
  controller.getTrends
);

router.get(
  '/category-distribution',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getCategoryDistribution
);

router.get(
  '/first-response-time',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getFirstResponseTime
);

module.exports = router;
```

- [ ] **Step 3: Montar el router**

En `backend/src/routes/index.js`, agrega el import junto a los demás:

```js
const analyticsRoutes = require('../analytics/analytics.routes');
```

Y el `router.use` junto a los demás:

```js
router.use('/analytics', analyticsRoutes);
```

- [ ] **Step 4: Verificar con curl (smoke test, sin datos de demo todavía)**

Con el backend corriendo en `http://localhost:3001` contra PostgreSQL local:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@empresa.com","password":"Admin123*"}' | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).data.accessToken))")

curl -s http://localhost:3001/api/analytics/sla -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/analytics/mttr -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/analytics/status-distribution -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/analytics/agent-workload -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3001/api/analytics/trends?granularity=week" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/analytics/category-distribution -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/analytics/first-response-time -H "Authorization: Bearer $TOKEN"
```

Expected: los 7 devuelven `200` con JSON válido (conteos en 0 si aún no hay datos de demo). Además, verifica el rechazo sin permiso:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/analytics/sla
```

Expected: `401` (sin token).

- [ ] **Step 5: Commit**

```bash
git add backend/src/analytics/analytics.controller.js backend/src/analytics/analytics.routes.js backend/src/routes/index.js
git commit -m "feat(analytics): controller, rutas y montaje bajo /api/analytics"
```

---

### Task 6: Seed de demo (`analytics-demo.seed.js`)

**Files:**
- Create: `backend/src/seed/analytics-demo.seed.js`

**Interfaces:**
- Consumes: `pool` (`shared/config/db.js`), tablas `users`, `user_roles`, `roles`, `requests`, `request_history`.
- Produces: ~280 filas en `requests` (con `category`, `priority`, `resolved_at` coherentes) y sus correspondientes filas en `request_history` para poblar el cálculo de primera respuesta.

- [ ] **Step 1: Confirmar que el backend apunta a PostgreSQL local**

```bash
grep DB_HOST backend/.env
```

Expected: `DB_HOST=127.0.0.1` (o `localhost`). Si muestra el host de Supabase, avisa antes de continuar — este seed nunca debe correr contra la base de datos de producción.

- [ ] **Step 2: Crear el script de seed**

```js
require('dotenv').config();
const pool = require('../shared/config/db');

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['soporte_tecnico', 'accesos_permisos', 'hardware', 'software', 'otro'];
const TERMINAL_STATUSES = ['resolved', 'closed'];
const SLA_HOURS = { urgent: 4, high: 24, medium: 48, low: 72 };
const TOTAL_REQUESTS = 280;

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomPastDate = (daysAgoMax) => {
  const now = Date.now();
  const past = now - randomInt(0, daysAgoMax) * 24 * 60 * 60 * 1000;
  return new Date(past);
};

async function run() {
  const client = await pool.connect();

  try {
    const usersResult = await client.query('SELECT id, name FROM users');
    const users = usersResult.rows;

    if (users.length < 2) {
      throw new Error('Se necesitan al menos 2 usuarios para generar datos de demo.');
    }

    const adminsResult = await client.query(
      `SELECT u.id, u.name FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'admin'`
    );
    const admins = adminsResult.rows;

    if (admins.length === 0) {
      throw new Error('Se necesita al menos un usuario admin para asignar solicitudes.');
    }

    console.log(`Generando ${TOTAL_REQUESTS} solicitudes de demo (${users.length} usuarios, ${admins.length} agente(s))...`);

    let created = 0;

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const owner = randomFrom(users);
      const priority = randomFrom(PRIORITIES);
      const category = randomFrom(CATEGORIES);
      const createdAt = randomPastDate(180);

      const outcome = Math.random();
      let status;
      let resolvedAt = null;
      let closedAt = null;
      let assignedTo = null;

      if (outcome < 0.10) {
        // 10% rechazadas
        status = 'rejected';
        assignedTo = randomFrom(admins).id;
      } else if (outcome < 0.80) {
        // 70% resueltas o cerradas
        status = randomFrom(TERMINAL_STATUSES);
        assignedTo = randomFrom(admins).id;

        const slaHours = SLA_HOURS[priority];
        const withinSla = Math.random() < 0.65;
        const resolutionHours = withinSla
          ? randomInt(1, Math.max(1, slaHours - 1))
          : randomInt(slaHours + 1, slaHours * 3);

        resolvedAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
        closedAt = status === 'closed'
          ? new Date(resolvedAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000)
          : null;
      } else {
        // 20% siguen activas
        status = randomFrom(['open', 'in_progress', 'waiting_user']);
        assignedTo = status === 'open' ? null : randomFrom(admins).id;
      }

      const result = await client.query(
        `INSERT INTO requests
           (title, description, status, priority, category, user_id, assigned_to, created_at, updated_at, resolved_at, closed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10)
         RETURNING id`,
        [
          `Solicitud de demo #${i + 1}`,
          `Descripción generada automáticamente para pruebas de analítica (${category}).`,
          status,
          priority,
          category,
          owner.id,
          assignedTo,
          createdAt,
          resolvedAt,
          closedAt,
        ]
      );

      const requestId = result.rows[0].id;

      if (assignedTo) {
        const responseHours = randomInt(1, 24);
        const respondedAt = new Date(createdAt.getTime() + responseHours * 60 * 60 * 1000);

        await client.query(
          `INSERT INTO request_history (request_id, changed_by, field, old_value, new_value, description, created_at)
           VALUES ($1, $2, 'status', 'open', 'in_progress', 'Solicitud tomada por el agente', $3)`,
          [requestId, assignedTo, respondedAt]
        );
      }

      created++;
    }

    console.log(`✅ ${created} solicitudes de demo creadas.`);
    process.exit();
  } catch (error) {
    console.error('Error generando datos de demo:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
```

- [ ] **Step 3: Ejecutar el seed**

```bash
cd backend
node src/seed/analytics-demo.seed.js
```

Expected: `✅ 280 solicitudes de demo creadas.`

- [ ] **Step 4: Verificar la distribución generada**

```bash
psql -U postgres -h 127.0.0.1 -d solicitudes_app -c "SELECT status, COUNT(*) FROM requests WHERE title LIKE 'Solicitud de demo%' GROUP BY status;" -c "SELECT COUNT(*) FROM request_history;"
```

Expected: filas repartidas entre `rejected` (~10%), `resolved`/`closed` (~70% combinados), `open`/`in_progress`/`waiting_user` (~20%); `request_history` con un número de filas cercano a las solicitudes que tienen agente asignado.

- [ ] **Step 5: Commit**

```bash
git add backend/src/seed/analytics-demo.seed.js
git commit -m "feat(analytics): script de seed con ~280 solicitudes de demo"
```

---

### Task 7: Verificación completa de los 7 endpoints con datos reales

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Repetir las llamadas curl del Task 5 con datos poblados**

Usa el mismo bloque de curl del Task 5 (Step 4). Esta vez:
- `/sla` debe mostrar `withinSlaPercentage` entre 0 y 100 (ni 0 ni 100 exactos, dado el 65%/35% del seed), `rejectedPercentage` cercano a 10, y `byPriority` con las 4 prioridades.
- `/mttr` debe mostrar `overallMttrHours > 0` y `byAgent` con tantas entradas como admins usados en el seed.
- `/status-distribution` debe sumar `percentage` ≈ 100 entre todos los estados.
- `/agent-workload` debe reflejar solo las solicitudes `open`/`in_progress` (no las resueltas/rechazadas).
- `/trends?granularity=week` debe tener múltiples períodos consecutivos sin huecos, incluyendo períodos con `created: 0` si corresponde.
- `/category-distribution` debe repartirse entre las 5 categorías.
- `/first-response-time` debe mostrar `overallAvgHours > 0`.

- [ ] **Step 2: Probar el filtro `priority`**

```bash
curl -s "http://localhost:3001/api/analytics/sla?priority=urgent" -H "Authorization: Bearer $TOKEN"
```

Expected: `byPriority` sigue mostrando las 4 prioridades (es informativo), pero `totalResolved`/`withinSla` reflejan solo `urgent`.

- [ ] **Step 3: Probar rechazo por falta de permiso**

Registra un usuario nuevo (rol `user` por defecto, sin `analytics_read`) y confirma:

```bash
curl -s -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"name":"QA Analytics","email":"qa.analytics@empresa.com","password":"Password123"}'
USER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"qa.analytics@empresa.com","password":"Password123"}' | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).data.accessToken))")
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/analytics/sla -H "Authorization: Bearer $USER_TOKEN"
```

Expected: `403`. Limpia el usuario de prueba al terminar:

```bash
psql -U postgres -h 127.0.0.1 -d solicitudes_app -c "DELETE FROM users WHERE email = 'qa.analytics@empresa.com';"
```

No requiere commit (tarea de verificación).

---

### Task 8: Frontend — librerías, tipos y cliente API

**Files:**
- Modify: `frontend/package.json` (vía `npm install`)
- Create: `frontend/src/types/analytics.types.ts`
- Create: `frontend/src/api/endpoints/analytics.api.ts`

**Interfaces:**
- Produces: todas las interfaces TS de respuesta (`SlaSummary`, `MttrSummary`, `StatusDistributionItem`, `AgentWorkloadItem`, `TrendPoint`, `CategoryDistributionItem`, `FirstResponseSummary`, `AnalyticsFilters`, `TrendsFilters`) y `analyticsApi` (7 funciones), consumidas por `analytics.store.ts` (Task 9).

- [ ] **Step 1: Instalar dependencias**

```bash
cd frontend
npm install vue-chartjs chart.js
```

Expected: `vue-chartjs` y `chart.js` aparecen en `dependencies` de `frontend/package.json`.

- [ ] **Step 2: Registrar los elementos de Chart.js una sola vez**

En `frontend/src/main.ts`, agrega cerca del inicio del archivo (junto a los demás imports):

```ts
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);
```

- [ ] **Step 3: Crear los tipos**

```ts
export interface SlaByPriority {
  priority: string;
  withinSlaPercentage: number;
  total: number;
}

export interface SlaSummary {
  withinSla: number;
  breachedSla: number;
  withinSlaPercentage: number;
  totalResolved: number;
  rejectedPercentage: number;
  byPriority: SlaByPriority[];
}

export interface MttrByPriority {
  priority: string;
  avgHours: number;
}

export interface MttrByAgent {
  agentId: string;
  agentName: string;
  avgHours: number;
  ticketsResolved: number;
}

export interface MttrSummary {
  overallMttrHours: number;
  byPriority: MttrByPriority[];
  byAgent: MttrByAgent[];
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

export interface AgentWorkloadItem {
  agentId: string;
  agentName: string;
  openTickets: number;
  inProgressTickets: number;
  totalActive: number;
}

export interface TrendPoint {
  period: string;
  created: number;
  resolved: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface FirstResponseByPriority {
  priority: string;
  avgHours: number;
}

export interface FirstResponseSummary {
  overallAvgHours: number;
  byPriority: FirstResponseByPriority[];
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}

export interface TrendsFilters extends AnalyticsFilters {
  granularity?: "week" | "month";
}
```

- [ ] **Step 4: Crear el cliente API**

```ts
import api from "../axios";
import type {
  SlaSummary,
  MttrSummary,
  StatusDistributionItem,
  AgentWorkloadItem,
  TrendPoint,
  CategoryDistributionItem,
  FirstResponseSummary,
  AnalyticsFilters,
  TrendsFilters,
} from "@/types/analytics.types";

const toParams = (filters: AnalyticsFilters) => ({
  dateFrom: filters.dateFrom,
  dateTo: filters.dateTo,
  priority: filters.priority,
});

export const analyticsApi = {
  getSla: (filters: AnalyticsFilters) =>
    api.get<SlaSummary>("/analytics/sla", { params: toParams(filters) }),

  getMttr: (filters: AnalyticsFilters) =>
    api.get<MttrSummary>("/analytics/mttr", { params: toParams(filters) }),

  getStatusDistribution: (filters: AnalyticsFilters) =>
    api.get<StatusDistributionItem[]>("/analytics/status-distribution", { params: toParams(filters) }),

  getAgentWorkload: (filters: AnalyticsFilters) =>
    api.get<AgentWorkloadItem[]>("/analytics/agent-workload", { params: { priority: filters.priority } }),

  getTrends: (filters: TrendsFilters) =>
    api.get<TrendPoint[]>("/analytics/trends", { params: { ...toParams(filters), granularity: filters.granularity } }),

  getCategoryDistribution: (filters: AnalyticsFilters) =>
    api.get<CategoryDistributionItem[]>("/analytics/category-distribution", { params: toParams(filters) }),

  getFirstResponseTime: (filters: AnalyticsFilters) =>
    api.get<FirstResponseSummary>("/analytics/first-response-time", { params: toParams(filters) }),
};
```

- [ ] **Step 5: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos relacionados a `analytics.types.ts` o `analytics.api.ts`.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.ts frontend/src/types/analytics.types.ts frontend/src/api/endpoints/analytics.api.ts
git commit -m "feat(analytics): instala chart.js, tipos y cliente API del frontend"
```

---

### Task 9: `analytics.store.ts`

**Files:**
- Create: `frontend/src/stores/analytics.store.ts`

**Interfaces:**
- Consumes: `analyticsApi` (Task 8), tipos de `analytics.types.ts` (Task 8).
- Produces: store Pinia `useAnalyticsStore` con estado `{ sla, mttr, statusDistribution, agentWorkload, trends, categoryDistribution, firstResponseTime }`, cada uno `{ data, loading, error }`; acciones `fetchAll(filters)`, `setGranularity(granularity)`; consumido por los 7 componentes (Tasks 11-17) y la vista (Task 18).

- [ ] **Step 1: Crear el store**

```ts
import { defineStore } from "pinia";
import { analyticsApi } from "@/api/endpoints/analytics.api";
import type {
  SlaSummary,
  MttrSummary,
  StatusDistributionItem,
  AgentWorkloadItem,
  TrendPoint,
  CategoryDistributionItem,
  FirstResponseSummary,
  AnalyticsFilters,
} from "@/types/analytics.types";

interface MetricState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AnalyticsState {
  filters: AnalyticsFilters;
  granularity: "week" | "month";
  sla: MetricState<SlaSummary>;
  mttr: MetricState<MttrSummary>;
  statusDistribution: MetricState<StatusDistributionItem[]>;
  agentWorkload: MetricState<AgentWorkloadItem[]>;
  trends: MetricState<TrendPoint[]>;
  categoryDistribution: MetricState<CategoryDistributionItem[]>;
  firstResponseTime: MetricState<FirstResponseSummary>;
}

const emptyMetric = <T>(): MetricState<T> => ({ data: null, loading: false, error: null });

type MetricKey =
  | "sla"
  | "mttr"
  | "statusDistribution"
  | "agentWorkload"
  | "trends"
  | "categoryDistribution"
  | "firstResponseTime";

export const useAnalyticsStore = defineStore("analytics", {
  state: (): AnalyticsState => ({
    filters: {},
    granularity: "week",
    sla: emptyMetric<SlaSummary>(),
    mttr: emptyMetric<MttrSummary>(),
    statusDistribution: emptyMetric<StatusDistributionItem[]>(),
    agentWorkload: emptyMetric<AgentWorkloadItem[]>(),
    trends: emptyMetric<TrendPoint[]>(),
    categoryDistribution: emptyMetric<CategoryDistributionItem[]>(),
    firstResponseTime: emptyMetric<FirstResponseSummary>(),
  }),

  actions: {
    async fetchAll(filters: AnalyticsFilters = {}) {
      this.filters = filters;

      const tasks: Array<[MetricKey, () => Promise<{ data: unknown }>]> = [
        ["sla", () => analyticsApi.getSla(filters)],
        ["mttr", () => analyticsApi.getMttr(filters)],
        ["statusDistribution", () => analyticsApi.getStatusDistribution(filters)],
        ["agentWorkload", () => analyticsApi.getAgentWorkload(filters)],
        ["trends", () => analyticsApi.getTrends({ ...filters, granularity: this.granularity })],
        ["categoryDistribution", () => analyticsApi.getCategoryDistribution(filters)],
        ["firstResponseTime", () => analyticsApi.getFirstResponseTime(filters)],
      ];

      for (const [key] of tasks) {
        (this[key] as MetricState<unknown>).loading = true;
        (this[key] as MetricState<unknown>).error = null;
      }

      const results = await Promise.allSettled(tasks.map(([, fn]) => fn()));

      results.forEach((result, index) => {
        const [key] = tasks[index];
        const metric = this[key] as MetricState<unknown>;
        metric.loading = false;

        if (result.status === "fulfilled") {
          metric.data = result.value.data;
        } else {
          const reason = result.reason as { response?: { data?: { message?: string } } };
          metric.error = reason?.response?.data?.message || "Error cargando esta métrica";
        }
      });
    },

    async setGranularity(granularity: "week" | "month") {
      this.granularity = granularity;
      this.trends.loading = true;
      this.trends.error = null;

      try {
        const res = await analyticsApi.getTrends({ ...this.filters, granularity });
        this.trends.data = res.data;
      } catch (err) {
        const reason = err as { response?: { data?: { message?: string } } };
        this.trends.error = reason.response?.data?.message || "Error cargando la tendencia";
      } finally {
        this.trends.loading = false;
      }
    },
  },
});
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos relacionados a `analytics.store.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/analytics.store.ts
git commit -m "feat(analytics): store de Pinia con loading/error independiente por metrica"
```

---

### Task 10: Router — guard por permiso, ruta y link en el sidebar

**Files:**
- Modify: `frontend/src/router/guards.ts`
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/layouts/DashboardLayout.vue`

**Interfaces:**
- Consumes: `auth.hasPermission` (ya existente en `auth.store.ts`).
- Produces: ruta `/dashboard/analytics` accesible solo con el permiso `analytics_read`; link "Analítica" en el sidebar con la misma condición.

- [ ] **Step 1: Extender el guard con `requiresPermission`**

En `frontend/src/router/guards.ts`, después del bloque de `requiresAnyRole` y antes de `next();`, agrega:

```ts
  // Verificar si requiere un permiso específico
  if (to.meta.requiresPermission) {
    const permission = to.meta.requiresPermission as string;
    if (!auth.hasPermission(permission)) {
      return next("/dashboard");
    }
  }
```

- [ ] **Step 2: Agregar la ruta**

En `frontend/src/router/index.ts`, dentro de `children` del `/dashboard`, junto a las demás rutas (después de `deleted-requests`):

```ts
        {
          path: "analytics",
          name: "analytics",
          component: () => import("@/views/dashboard/DashboardAnalyticsView.vue"),
          meta: { requiresPermission: "analytics_read" },
        },
```

- [ ] **Step 3: Agregar el link en el sidebar (versión escritorio y móvil)**

En `frontend/src/layouts/DashboardLayout.vue`, agrega el import del ícono junto a los demás de Heroicons:

```ts
  ChartBarIcon,
```

Agrega el computed junto a `canViewUsers`/`canViewRoles`/`canViewPermissions` (nota: **sin** `|| auth.isAdmin`, a diferencia de esos tres — ver Global Constraints):

```ts
const canViewAnalytics = computed(() => auth.hasPermission("analytics_read"));
```

En el array `adminItems` (usado por ambos sidebars, escritorio y móvil), agrega la entrada:

```ts
  { to: "/dashboard/analytics", label: "Analítica", icon: ChartBarIcon, show: canViewAnalytics.value },
```

- [ ] **Step 4: Verificar en el preview**

Con el backend y frontend corriendo, inicia sesión como `admin@empresa.com`. Confirma que aparece el link "Analítica" en el sidebar y que al hacer clic navega a `/dashboard/analytics` (mostrará una página en blanco hasta el Task 17 — eso es esperado, el objetivo aquí es confirmar que el guard deja pasar y el link aparece). Luego, con el usuario de prueba sin `analytics_read` (o revisando el código), confirma que si se navega directo a la URL sin el permiso, redirige a `/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/guards.ts frontend/src/router/index.ts frontend/src/layouts/DashboardLayout.vue
git commit -m "feat(analytics): ruta protegida por permiso y link en el sidebar"
```

---

### Task 11: `SlaSummaryCard.vue` + `FirstResponseCard.vue`

**Files:**
- Create: `frontend/src/components/analytics/SlaSummaryCard.vue`
- Create: `frontend/src/components/analytics/FirstResponseCard.vue`

**Interfaces:**
- Consumes: `SlaSummary`, `FirstResponseSummary` (de `analytics.types.ts`).
- Produces: componentes de presentación pura (props in, sin llamadas API propias), consumidos por `DashboardAnalyticsView.vue` (Task 17).

- [ ] **Step 1: Crear `SlaSummaryCard.vue`**

```vue
<script setup lang="ts">
import type { SlaSummary } from "@/types/analytics.types";

defineProps<{
  data: SlaSummary | null;
  loading: boolean;
  error: string | null;
}>();

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cumplimiento de SLA</p>

    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-10 w-24 bg-gray-100 rounded-lg"></div>
      <div class="h-3 w-full bg-gray-100 rounded-full"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-else-if="!data || data.totalResolved === 0" class="text-sm text-gray-400 py-4 text-center">
      No hay solicitudes resueltas en este rango.
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-end gap-2">
        <span
          class="text-4xl font-bold"
          :class="data.withinSlaPercentage >= 80 ? 'text-emerald-600' : 'text-red-600'"
        >
          {{ data.withinSlaPercentage }}%
        </span>
        <span class="text-xs text-gray-400 mb-1.5">dentro de SLA ({{ data.totalResolved }} resueltas)</span>
      </div>

      <div v-if="data.rejectedPercentage > 0" class="text-xs text-gray-400">
        {{ data.rejectedPercentage }}% de las solicitudes creadas fueron rechazadas.
      </div>

      <div class="space-y-2">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-14 shrink-0">{{ priorityLabels[p.priority] }}</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full"
              :class="p.withinSlaPercentage >= 80 ? 'bg-emerald-500' : 'bg-red-400'"
              :style="{ width: `${p.withinSlaPercentage}%` }"
            ></div>
          </div>
          <span class="text-xs text-gray-400 w-10 text-right shrink-0">{{ p.withinSlaPercentage }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Crear `FirstResponseCard.vue`**

```vue
<script setup lang="ts">
import type { FirstResponseSummary } from "@/types/analytics.types";

defineProps<{
  data: FirstResponseSummary | null;
  loading: boolean;
  error: string | null;
}>();

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tiempo de Primera Respuesta</p>

    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-10 w-24 bg-gray-100 rounded-lg"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-else-if="!data || data.overallAvgHours === 0" class="text-sm text-gray-400 py-4 text-center">
      No hay respuestas registradas en este rango.
    </div>

    <div v-else class="space-y-3">
      <div class="text-4xl font-bold text-indigo-600">{{ data.overallAvgHours }}h</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex justify-between">
          <span>{{ priorityLabels[p.priority] }}</span>
          <span class="font-medium text-gray-700">{{ p.avgHours }}h</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verificar que compilan**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/analytics/SlaSummaryCard.vue frontend/src/components/analytics/FirstResponseCard.vue
git commit -m "feat(analytics): SlaSummaryCard y FirstResponseCard"
```

---

### Task 12: `StatusDonutChart.vue` + `CategoryBarChart.vue`

**Files:**
- Create: `frontend/src/components/analytics/StatusDonutChart.vue`
- Create: `frontend/src/components/analytics/CategoryBarChart.vue`

**Interfaces:**
- Consumes: `StatusDistributionItem[]`, `CategoryDistributionItem[]`, `Doughnut`/`Bar` de `vue-chartjs`.
- Produces: componentes de presentación, consumidos por `DashboardAnalyticsView.vue` (Task 17).

- [ ] **Step 1: Crear `StatusDonutChart.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import type { StatusDistributionItem } from "@/types/analytics.types";

const props = defineProps<{
  data: StatusDistributionItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const statusLabels: Record<string, string> = {
  open: "Abierta",
  in_progress: "En Progreso",
  waiting_user: "Esperando Usuario",
  resolved: "Resuelta",
  closed: "Cerrada",
  rejected: "Rechazada",
};

const statusColors: Record<string, string> = {
  open: "#f59e0b",
  in_progress: "#3b82f6",
  waiting_user: "#8b5cf6",
  resolved: "#10b981",
  closed: "#9ca3af",
  rejected: "#ef4444",
};

const chartData = computed(() => {
  const items = props.data ?? [];
  return {
    labels: items.map((i) => statusLabels[i.status] ?? i.status),
    datasets: [
      {
        data: items.map((i) => i.count),
        backgroundColor: items.map((i) => statusColors[i.status] ?? "#d1d5db"),
        borderWidth: 0,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 10, font: { size: 11 } } } },
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución por Estado</p>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-12 text-center">
      No hay solicitudes en este rango.
    </div>
    <div v-else class="h-56">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Crear `CategoryBarChart.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import type { CategoryDistributionItem } from "@/types/analytics.types";

const props = defineProps<{
  data: CategoryDistributionItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const categoryLabels: Record<string, string> = {
  soporte_tecnico: "Soporte Técnico",
  accesos_permisos: "Accesos y Permisos",
  hardware: "Hardware",
  software: "Software",
  otro: "Otro",
};

const chartData = computed(() => {
  const items = props.data ?? [];
  return {
    labels: items.map((i) => categoryLabels[i.category] ?? i.category),
    datasets: [
      {
        label: "Solicitudes",
        data: items.map((i) => i.count),
        backgroundColor: "#6366f1",
        borderRadius: 6,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución por Categoría</p>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-12 text-center">
      No hay solicitudes en este rango.
    </div>
    <div v-else class="h-56">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verificar que compilan**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/analytics/StatusDonutChart.vue frontend/src/components/analytics/CategoryBarChart.vue
git commit -m "feat(analytics): StatusDonutChart y CategoryBarChart"
```

---

### Task 13: `MttrChart.vue`

**Files:**
- Create: `frontend/src/components/analytics/MttrChart.vue`

**Interfaces:**
- Consumes: `MttrSummary` (de `analytics.types.ts`), `Bar` de `vue-chartjs`.
- Produces: componente de presentación, consumido por `DashboardAnalyticsView.vue` (Task 17).

- [ ] **Step 1: Crear el componente**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import type { MttrSummary } from "@/types/analytics.types";

const props = defineProps<{
  data: MttrSummary | null;
  loading: boolean;
  error: string | null;
}>();

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const chartData = computed(() => {
  const agents = props.data?.byAgent ?? [];
  return {
    labels: agents.map((a) => a.agentName),
    datasets: [
      {
        label: "MTTR (horas)",
        data: agents.map((a) => a.avgHours),
        backgroundColor: "#6366f1",
        borderRadius: 6,
      },
    ],
  };
});

const chartOptions = {
  indexAxis: "y" as const,
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">MTTR por Agente</p>
      <span v-if="data" class="text-sm font-bold text-indigo-600">{{ data.overallMttrHours }}h promedio</span>
    </div>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.byAgent.length === 0" class="text-sm text-gray-400 py-12 text-center">
      No hay solicitudes resueltas asignadas a un agente en este rango.
    </div>
    <template v-else>
      <div class="h-48 mb-4">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex justify-between">
          <span>{{ priorityLabels[p.priority] }}</span>
          <span class="font-medium text-gray-700">{{ p.avgHours }}h</span>
        </div>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/MttrChart.vue
git commit -m "feat(analytics): MttrChart (barras horizontales por agente + desglose por prioridad)"
```

---

### Task 14: `AgentWorkloadTable.vue`

**Files:**
- Create: `frontend/src/components/analytics/AgentWorkloadTable.vue`

**Interfaces:**
- Consumes: `AgentWorkloadItem[]` (de `analytics.types.ts`).
- Produces: componente de presentación, consumido por `DashboardAnalyticsView.vue` (Task 17).

- [ ] **Step 1: Crear el componente**

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { AgentWorkloadItem } from "@/types/analytics.types";

const props = defineProps<{
  data: AgentWorkloadItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const maxActive = computed(() => Math.max(1, ...(props.data ?? []).map((a) => a.totalActive)));
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Carga de Trabajo por Agente</p>

    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-8 bg-gray-100 rounded-lg" v-for="n in 3" :key="n"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-8 text-center">
      Ningún agente tiene solicitudes activas asignadas ahora mismo.
    </div>

    <div v-else class="space-y-3">
      <div v-for="agent in data" :key="agent.agentId">
        <div class="flex justify-between items-baseline mb-1">
          <span class="text-sm font-medium text-gray-700">{{ agent.agentName }}</span>
          <span class="text-xs text-gray-400">
            {{ agent.openTickets }} abiertas · {{ agent.inProgressTickets }} en progreso
          </span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-indigo-500 rounded-full"
            :style="{ width: `${(agent.totalActive / maxActive) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/AgentWorkloadTable.vue
git commit -m "feat(analytics): AgentWorkloadTable con barra de progreso por agente"
```

---

### Task 15: `TrendLineChart.vue`

**Files:**
- Create: `frontend/src/components/analytics/TrendLineChart.vue`

**Interfaces:**
- Consumes: `TrendPoint[]` (de `analytics.types.ts`), `Line` de `vue-chartjs`, `useAnalyticsStore().setGranularity` (Task 9).
- Produces: componente con selector de granularidad, consumido por `DashboardAnalyticsView.vue` (Task 17).

- [ ] **Step 1: Crear el componente**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import type { TrendPoint } from "@/types/analytics.types";
import { useAnalyticsStore } from "@/stores/analytics.store";

const props = defineProps<{
  data: TrendPoint[] | null;
  loading: boolean;
  error: string | null;
}>();

const store = useAnalyticsStore();

const formatPeriod = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

const chartData = computed(() => {
  const points = props.data ?? [];
  return {
    labels: points.map((p) => formatPeriod(p.period)),
    datasets: [
      {
        label: "Creadas",
        data: points.map((p) => p.created),
        borderColor: "#6366f1",
        backgroundColor: "#6366f1",
        tension: 0.3,
      },
      {
        label: "Resueltas",
        data: points.map((p) => p.resolved),
        borderColor: "#10b981",
        backgroundColor: "#10b981",
        tension: 0.3,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 10, font: { size: 11 } } } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const onGranularityChange = (e: Event) => {
  const value = (e.target as HTMLSelectElement).value as "week" | "month";
  store.setGranularity(value);
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tendencia: Creadas vs Resueltas</p>
      <select
        :value="store.granularity"
        @change="onGranularityChange"
        class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="week">Semanal</option>
        <option value="month">Mensual</option>
      </select>
    </div>

    <div v-if="loading" class="animate-pulse h-56 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-16 text-center">
      No hay datos en este rango.
    </div>
    <div v-else class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/TrendLineChart.vue
git commit -m "feat(analytics): TrendLineChart con selector de granularidad"
```

---

### Task 16: `DashboardAnalyticsView.vue`

**Files:**
- Create: `frontend/src/views/dashboard/DashboardAnalyticsView.vue`

**Interfaces:**
- Consumes: `useAnalyticsStore` (Task 9), los 7 componentes de las Tasks 11-15.
- Produces: vista montada en la ruta `/dashboard/analytics` (ya registrada en Task 10).

- [ ] **Step 1: Crear la vista**

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAnalyticsStore } from "@/stores/analytics.store";
import SlaSummaryCard from "@/components/analytics/SlaSummaryCard.vue";
import FirstResponseCard from "@/components/analytics/FirstResponseCard.vue";
import StatusDonutChart from "@/components/analytics/StatusDonutChart.vue";
import CategoryBarChart from "@/components/analytics/CategoryBarChart.vue";
import MttrChart from "@/components/analytics/MttrChart.vue";
import AgentWorkloadTable from "@/components/analytics/AgentWorkloadTable.vue";
import TrendLineChart from "@/components/analytics/TrendLineChart.vue";

const store = useAnalyticsStore();

const dateFrom = ref("");
const dateTo = ref("");

const applyFilters = () => {
  store.fetchAll({
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  });
};

onMounted(() => {
  store.fetchAll({});
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Analítica</h1>
        <p class="text-sm text-gray-400 mt-0.5">Indicadores de gestión de solicitudes</p>
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model="dateFrom"
          type="date"
          class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <span class="text-gray-400 text-sm">a</span>
        <input
          v-model="dateTo"
          type="date"
          class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          @click="applyFilters"
          class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <SlaSummaryCard :data="store.sla.data" :loading="store.sla.loading" :error="store.sla.error" />
      <FirstResponseCard
        :data="store.firstResponseTime.data"
        :loading="store.firstResponseTime.loading"
        :error="store.firstResponseTime.error"
      />
      <StatusDonutChart
        :data="store.statusDistribution.data"
        :loading="store.statusDistribution.loading"
        :error="store.statusDistribution.error"
      />

      <div class="lg:col-span-2">
        <MttrChart :data="store.mttr.data" :loading="store.mttr.loading" :error="store.mttr.error" />
      </div>
      <AgentWorkloadTable
        :data="store.agentWorkload.data"
        :loading="store.agentWorkload.loading"
        :error="store.agentWorkload.error"
      />

      <div class="lg:col-span-2">
        <TrendLineChart :data="store.trends.data" :loading="store.trends.loading" :error="store.trends.error" />
      </div>
      <CategoryBarChart
        :data="store.categoryDistribution.data"
        :loading="store.categoryDistribution.loading"
        :error="store.categoryDistribution.error"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/dashboard/DashboardAnalyticsView.vue
git commit -m "feat(analytics): vista DashboardAnalyticsView con grid responsive y filtro de fechas"
```

---

### Task 17: Verificación end-to-end en el navegador

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Confirmar backend y frontend corriendo contra PostgreSQL local con datos de demo**

```bash
grep DB_HOST backend/.env
```

Expected: apunta a local. Si no, ajusta y reinicia el backend antes de continuar.

- [ ] **Step 2: Recorrido en el preview**

1. Login como `admin@empresa.com` / `Admin123*`.
2. Clic en "Analítica" en el sidebar.
3. Confirmar que las 7 cards/gráficas cargan (cada una con su propio spinner mientras carga, no un loader global).
4. Cambiar el selector de granularidad en la gráfica de tendencia (semana ↔ mes) y confirmar que solo esa gráfica recarga.
5. Cambiar el rango de fechas en el filtro superior y hacer clic en "Aplicar" — confirmar que las 7 métricas se refrescan.
6. Elegir un rango de fechas sin datos (p. ej. un año en el futuro) y confirmar que cada card muestra su propio mensaje de estado vacío, no una gráfica confusa ni un error genérico.
7. `read_console_messages` con `onlyErrors: true` — debe estar vacío.
8. `resize_window` a `mobile` (375×812) — confirmar que el grid pasa a una columna y todo sigue siendo legible.

- [ ] **Step 3: Confirmar el rechazo de acceso sin permiso**

Con un usuario de rol `user` (sin `analytics_read`), confirmar que el link "Analítica" no aparece en el sidebar y que navegar directo a `/dashboard/analytics` redirige a `/dashboard`.

No requiere commit (tarea de verificación).
