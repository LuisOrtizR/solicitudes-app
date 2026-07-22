# Módulo de Analítica (KPIs de gestión) — Diseño

## Contexto

TicketFlow es un sistema de solicitudes (backend Node/Express/PostgreSQL sin ORM, frontend Vue 3 + Pinia + Tailwind). Se pidió un módulo de analítica con 7 indicadores de gestión (SLA, MTTR, distribución de estado, carga por agente, tendencias, distribución por categoría, tiempo de primera respuesta), a partir de un prompt genérico que asumía un esquema (`tickets`, `agents`, `categories`, roles `admin/manager/agent/client`) que no coincide con este proyecto.

## Hallazgos de la inspección (Paso 0)

- La entidad real es `requests`, no `tickets`. Columnas actuales: `id, title, description, status, priority, user_id, assigned_to, created_at, updated_at, resolved_at, closed_at, deleted_at, deleted_reason`.
- `status`: `open, in_progress, waiting_user, resolved, closed, rejected`. `priority`: `low, medium, high, urgent`.
- Roles reales: solo `admin` y `user` — no existen `manager`, `agent`, `client`, ni `supervisor` (mencionado en el código pero nunca creado como rol real).
- No existe `first_response_at`, `sla_due_at`, `sla_rules`, ni ninguna noción de categoría.
- `assigned_to` referencia `users.id` directamente — no hay tabla `agents` separada; "agente" = cualquier usuario con solicitudes asignadas.
- El proyecto organiza el backend por dominio (`src/requests/`, `src/roles/`, cada uno con su `.controller.js/.service.js/.model.js/.routes.js/.validator.js`), no por capa técnica (`src/controllers/`, `src/services/` sueltos).
- No existe carpeta de migraciones — el esquema vive en un único `schema.sql` (dump canónico) que se actualiza a mano junto con `ALTER TABLE`s directos.

## Decisiones (resueltas con el usuario)

1. **Tiempo de primera respuesta**: se deriva de `request_history` (primer registro con `changed_by != requests.user_id`) — sin columna nueva ni lógica de escritura nueva.
2. **Categorías**: se agrega `requests.category` con 5 valores: `soporte_tecnico, accesos_permisos, hardware, software, otro`.
3. **SLA**: tabla `sla_rules(priority PK, hours_to_resolve, hours_to_first_response)` con `urgent=4h/1h, high=24h/6h, medium=48h/12h, low=72h/18h`. `sla_due_at` se calcula al vuelo (`created_at + hours_to_resolve`), no se almacena.
4. **Seed de demo**: corre contra PostgreSQL local, nunca contra la Supabase de producción.
5. **Ajustes del usuario tras la propuesta inicial**:
   - Toda query de analítica excluye `deleted_at IS NOT NULL` (solicitudes eliminadas nunca cuentan).
   - MTTR y SLA excluyen `status = 'rejected'`; el endpoint `/sla` agrega `rejectedPercentage` (rechazadas / total creadas en el rango) como dato de salud general, separado del cálculo de cumplimiento.
   - MTTR y SLA usan `resolved_at` (no `closed_at`) como marca de fin — una solicitud sin `resolved_at` no entra en estos cálculos aunque esté `closed`.
   - La migración hace `UPDATE requests SET category = 'otro' WHERE category IS NULL` explícito (además del `DEFAULT 'otro'` de la columna), para que las solicitudes reales preexistentes queden categorizadas de forma consistente con las de demo.
   - El guard de la ruta `/dashboard/analytics` en el frontend valida el permiso `analytics_read` (no un rol hardcodeado) — requiere extender `authGuard` con soporte para `meta.requiresPermission`.

## Esquema — `backend/migrations/001_analytics.sql`

Primera migración formal del proyecto (documentada con comentario de cabecera). Contenido:

```sql
-- Migración: soporte para el módulo de Analítica.
-- Agrega: requests.category (nueva columna), tabla sla_rules.
-- Motivo: el módulo de analítica necesita categorizar solicitudes y calcular
-- cumplimiento de SLA por prioridad; ninguno de los dos conceptos existía antes.

ALTER TABLE requests
  ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'otro'
  CONSTRAINT check_request_category
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

`schema.sql` se actualiza en paralelo para reflejar el estado final (columna, constraint, índice y tabla nueva), manteniéndolo como el dump canónico completo.

## Backend — `src/analytics/`

```
src/analytics/
  analytics.routes.js
  analytics.controller.js
  analytics.service.js
  analytics.model.js
  analytics.validator.js
```

- Nuevo permiso `analytics_read` — agregado a `permissions.seed.js` y asignado al rol `admin` (ajuste al script de seed de admin o inserción directa). Middleware: `authenticate` + `authorize('analytics_read')` en las 7 rutas, montadas bajo `/api/analytics` en `src/routes/index.js`.
- Validación común (Zod, `analytics.validator.js`): `dateFrom`, `dateTo` (ISO date, opcionales — si faltan, se usa un rango por defecto de los últimos 6 meses), `priority` (opcional, enum), y para `/trends` además `granularity` (`week`|`month`, default `week`).
- Filtro base aplicado en **todas** las queries de `analytics.model.js`: `WHERE r.deleted_at IS NULL AND r.created_at BETWEEN $dateFrom AND $dateTo [AND r.priority = $priority]`.
- Para MTTR y SLA, filtro adicional: `AND r.status != 'rejected' AND r.resolved_at IS NOT NULL`.

### Los 7 endpoints (bajo `/api/analytics`, todos `GET`, todos requieren `analytics_read`)

1. **`/sla`** → `{ withinSla, breachedSla, withinSlaPercentage, totalResolved, rejectedPercentage, byPriority: [{priority, withinSlaPercentage, total}] }`. `withinSla` = `resolved_at <= created_at + (sla_rules.hours_to_resolve || 'hours')::interval`. `rejectedPercentage` = rechazadas / total creadas en el rango (no solo resueltas).
2. **`/mttr`** → `{ overallMttrHours, byPriority: [{priority, avgHours}], byAgent: [{agentId, agentName, avgHours, ticketsResolved}] }`. Cálculo vía `EXTRACT(EPOCH FROM (resolved_at - created_at))/3600` agregado en SQL (`AVG(...)`, `GROUP BY`).
3. **`/status-distribution`** → `[{status, count, percentage}]`. Sin excluir `rejected` aquí (es una distribución de TODOS los estados actuales, rejected incluido) — solo excluye soft-deleted.
4. **`/agent-workload`** → `[{agentId, agentName, openTickets, inProgressTickets, totalActive}]`, `status IN ('open','in_progress')`, ordenado por `totalActive DESC`.
5. **`/trends`** → `[{period, created, resolved}]` vía `date_trunc(granularity, created_at)` / `date_trunc(granularity, resolved_at)`, dos CTEs unidas por período.
6. **`/category-distribution`** → `[{category, count, percentage}]`.
7. **`/first-response-time`** → `{ overallAvgHours, byPriority: [{priority, avgHours}] }`. Subquery: `MIN(rh.created_at) FROM request_history rh WHERE rh.request_id = r.id AND rh.changed_by != r.user_id`, promediado contra `r.created_at`.

Todas las queries parametrizadas (`$1, $2...`), nunca interpolación de strings.

## Seed de demo — `backend/src/seed/analytics-demo.seed.js`

Corre explícitamente contra PostgreSQL local (reconecto el `.env` del backend antes de ejecutarlo, con aviso previo). Genera ~250-300 solicitudes con:
- Fechas de `created_at` distribuidas en los últimos 6 meses (no uniforme — más densidad reciente).
- Mezcla de prioridad/categoría/usuario asignado/estado, con proporción deliberada dentro/fuera de SLA (para que el % de cumplimiento no sea ni 100% ni 0%).
- Para solicitudes con `status IN ('resolved','closed')`: `resolved_at` coherente (posterior a `created_at`), algunas dentro de SLA y otras fuera.
- Un registro en `request_history` con `changed_by` = un usuario admin distinto del dueño, para poblar el cálculo de primera respuesta.

## Frontend

### Router (`router/guards.ts`, `router/index.ts`)

`authGuard` se extiende con soporte para `meta.requiresPermission: string` (nuevo, además de los ya existentes `requiresRole`/`requiresAnyRole`):

```ts
if (to.meta.requiresPermission) {
  const perm = to.meta.requiresPermission as string;
  if (!auth.hasPermission(perm) && !auth.isAdmin) {
    return next("/dashboard");
  }
}
```

Ruta nueva: `{ path: "analytics", name: "analytics", component: () => import(".../DashboardAnalyticsView.vue"), meta: { requiresPermission: "analytics_read" } }`.

### Estructura

```
src/types/analytics.types.ts
src/api/endpoints/analytics.api.ts
src/stores/analytics.store.ts
src/views/dashboard/DashboardAnalyticsView.vue
src/components/analytics/SlaSummaryCard.vue
src/components/analytics/MttrChart.vue
src/components/analytics/StatusDonutChart.vue
src/components/analytics/AgentWorkloadTable.vue
src/components/analytics/TrendLineChart.vue
src/components/analytics/CategoryBarChart.vue
src/components/analytics/FirstResponseCard.vue
```

(Se ajustan los nombres de carpeta a las convenciones ya usadas en el proyecto: `api/endpoints/*.api.ts`, no `services/*.service.ts`.)

- Se instala `vue-chartjs` + `chart.js`.
- `analytics.store.ts`: un estado independiente por métrica (`sla`, `mttr`, `statusDistribution`, `agentWorkload`, `trends`, `categoryDistribution`, `firstResponseTime`), cada uno con su propio `loading`/`error`. Acción `fetchAll(filters)` vía `Promise.allSettled`. Tipado completo, sin `any`.
- `DashboardAnalyticsView.vue`: grid `grid-cols-1 lg:grid-cols-3` (Tailwind), filtro superior de rango de fechas que dispara `fetchAll`, skeleton individual por card mientras cada métrica carga, mensaje de estado vacío por card si no hay datos en el rango.
- Sidebar (`DashboardLayout.vue`): nuevo link "Analítica" con `ChartBarIcon`, visible si `auth.hasPermission('analytics_read') || auth.isAdmin` (mismo patrón que `canViewUsers`/`canViewRoles`), acento índigo consistente con el rediseño reciente.

## Fuera de alcance (explícito, no ambiguo)

- Materialized views o cron de precálculo (`node-cron` ya es dependencia) — se deja como comentario de mejora futura en `analytics.model.js`, no se implementa.
- Cualquier UI de administración de `sla_rules` o `category` (crear/editar categorías) — la migración las deja fijas; no hay pantalla de gestión para esto en esta iteración.
- Paginación de las respuestas de analítica — los volúmenes (7 métricas sobre cientos/miles de filas agregadas) no la requieren todavía.
