# Paginación Real + Filtros y Búsqueda — Diseño

## Contexto

Segunda parte del prompt "Auth unificado + Paginación real y filtros en TicketFlow". La Parte 1 (unificación del layout de autenticación) ya se completó, revisó y pusheó por separado. Este documento cubre exclusivamente la Parte 2: paginación real en servidor, búsqueda y filtros en los listados del dashboard.

## Hallazgos de la inspección (Paso 0)

- `GET /permissions` **ya tiene paginación real en servidor**: `permission.model.js` implementa `getPermissions(limit, offset, search, sort, order)` + `countPermissions(search)` con `LIMIT/OFFSET`/`ILIKE` reales; `permission.service.js` arma la respuesta `{ total, page, limit, totalPages, data }`; `permission.controller.js` la expone como `{ success: true, ...result }`. Este es el patrón de referencia a replicar.
- `GET /requests`, `GET /requests/mine`, `GET /requests/deleted` — **sin paginación, búsqueda ni filtros**. `request.model.js` tiene 4 funciones casi idénticas (`getAllRequests`, `getRequestsByUser`, `getDeletedRequests`, `getDeletedRequestsByUser`) que siempre traen el array completo.
- `GET /roles` — sin paginación (`getRoles()` trae todo).
- `GET /users` — sin paginación real: `getAllUsers()` trae todo; el `total` que expone el controller (`{ total: users.length, data: users }`) es solo el largo del array ya cargado, no un `COUNT(*)`.
- **Esquema real de `requests`** (`schema.sql`): `status` — enum real `open, in_progress, waiting_user, resolved, closed, rejected` (constraint `check_request_status`). `priority` — enum real `low, medium, high, urgent` (constraint `check_request_priority`). El prompt original pedía filtrar por status con valores `urgente, en_progreso, resuelto, nuevo`, que no existen — es una mezcla incorrecta de `priority` con nombres inventados. Se usa el enum real de `status`.
- `requests.assigned_to` es `uuid` nullable — columna real, filtro válido.
- `users.is_active` es `boolean` — filtro real, ya usado en `toggleUserActiveStatus`.
- Los usuarios **no tienen una columna `role` directa** — la relación es `users` → `user_roles` → `roles` (1 rol por usuario en la práctica, reforzado por `updateUserRole` que hace upsert de una sola fila en `user_roles` por usuario). Filtrar por rol requiere un `JOIN`.
- `roles` solo tiene `id, name, description, created_at` — sin campos adicionales para filtrar, coincide con lo pedido ("solo búsqueda").
- Los 4 módulos ya usan `zod` (no Joi) para validación, con un middleware genérico `validate(schema, property = 'body')` que ya soporta `validate(schema, 'query')` — patrón usado y funcionando en `analytics.routes.js`. Se reutiliza tal cual para los nuevos query-schemas de paginación.
- Ninguno de los endpoints de listado actuales valida sus query params con `zod` (permissions hace un safelist manual dentro del modelo). Se introduce validación `zod` real para los 3 módulos nuevos, por consistencia y seguridad de entrada.
- El token de color `primary-*` (definido en `@theme` de `style.css`, alias real de la paleta índigo de Tailwind) ya es el estándar establecido en todo el dashboard desde el sistema de diseño unificado — el prompt pedía clases `indigo-*` literales; se usa `primary-*` en su lugar, igual que en toda la Parte 1 y en el resto del dashboard.

## Decisiones

1. **Alcance del filtro `assigned_to`**: solo se expone en `GET /requests` (usado por `ManageRequestsView`). `GET /requests/mine` y `GET /requests/deleted` no lo exponen — no tiene sentido de negocio para un usuario viendo sus propias solicitudes como reportante, ni para el historial de eliminadas.
2. **Consolidación de `request.model.js`**: las 4 funciones de consulta se reemplazan por una función parametrizada por `scope` (`'all' | 'mine' | 'deleted' | 'deleted-mine'`) + `page/limit/search/status/assignedTo/sort/order`, más su función `count` homóloga — mismo patrón que `permission.model.js`. Los controllers (`getAll`, `getMine`, `getDeleted`) siguen siendo 3 funciones separadas por fuera; internamente eligen el `scope` correcto y qué filtros exponer.
3. **Paginador compartido con patrón Anterior/Siguiente**: se unifica `PermissionsView` (que hoy tiene botones numerados `1 2 3`) al nuevo componente `Pagination.vue` (Anterior/Siguiente + "Página X de Y" + selector de tamaño). Cambio visual confirmado y aceptado.
4. **Shape de respuesta uniforme** en los 3 módulos nuevos, igual al de `/permissions`: `{ success: true, data: [...], total, page, limit, totalPages }`.
5. **Validación de query params con `zod`** vía `validate(schema, 'query')` en las 4 rutas GET de listado que ganan paginación (`/requests`, `/requests/mine`, `/requests/deleted`, `/roles`, `/users`) — `page`/`limit` coeccionados a número con `z.coerce.number()`, clamps de rango, enums para `status`/`sort`/`order`/`role`, boolean coercion para `is_active`.
6. **Token de color**: todo el nuevo código visual usa `primary-*`, no `indigo-*` literal, más pares `dark:` en cada clase — consistente con el resto del dashboard.
7. **Búsqueda con debounce de 300ms** y manejo de condición de carrera (se ignora la respuesta de una petición vieja si ya se disparó una más nueva) — implementado en un composable reutilizable, no en cada vista.
8. **Alcance de filtros por vista**:
   - `RequestsView` (mis tickets): búsqueda + filtro `status`.
   - `ManageRequestsView`: búsqueda + filtro `status` + filtro `assigned_to`. Mantiene además su fila de contadores por estado ya existente (no se elimina, es una funcionalidad distinta que ya sirve como filtro rápido visual — la nueva barra de búsqueda/filtros la complementa, no la reemplaza).
   - `Deletedrequestsview`: búsqueda + filtro `status`.
   - `RolesView`: solo búsqueda.
   - `PermissionsView`: ya tenía búsqueda (campo `search` existente); se migra a los componentes compartidos nuevos (`Pagination.vue` + barra de búsqueda reutilizable), sin filtros adicionales.
   - `UsersView`: búsqueda + filtro `role` + filtro `is_active` (activo/inactivo).

## Diseño técnico — Backend

### Query schema — patrón común (ejemplo para requests)

`backend/src/requests/request.validator.js` (se agrega, sin tocar los schemas existentes de create/update/delete):

```js
const listRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: z.enum(statusEnum).optional(),
  assignedTo: z.string().uuid().optional(),
  sort: z.enum(['created_at', 'title', 'status', 'priority']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});
```

Análogos para `role.validator.js` (`listRolesQuerySchema`: `page/limit/search/sort∈{name,created_at}/order`) y `user.validator.js` (`listUsersQuerySchema`: `page/limit/search/role/is_active: z.coerce.boolean().optional()/sort∈{name,email,created_at}/order`).

### `request.model.js` — consolidación

Reemplaza `getAllRequests`, `getRequestsByUser`, `getDeletedRequests`, `getDeletedRequestsByUser` por:

```js
const SCOPE_WHERE = {
  all:          'r.deleted_at IS NULL',
  mine:         'r.deleted_at IS NULL AND r.user_id = $USER_ID',
  deleted:      'r.deleted_at IS NOT NULL',
  'deleted-mine': 'r.deleted_at IS NOT NULL AND r.user_id = $USER_ID',
};

const getRequests = ({ scope, userId, limit, offset, search, status, assignedTo, sort, order }) => {
  const values = [];
  const conditions = [];
  let idx = 1;

  if (scope === 'mine' || scope === 'deleted-mine') {
    conditions.push(scope === 'mine' ? 'r.deleted_at IS NULL' : 'r.deleted_at IS NOT NULL');
    conditions.push(`r.user_id = $${idx++}`);
    values.push(userId);
  } else {
    conditions.push(scope === 'all' ? 'r.deleted_at IS NULL' : 'r.deleted_at IS NOT NULL');
  }

  if (search) {
    conditions.push(`(r.title ILIKE $${idx} OR r.description ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`r.status = $${idx++}`);
    values.push(status);
  }
  if (assignedTo) {
    conditions.push(`r.assigned_to = $${idx++}`);
    values.push(assignedTo);
  }

  const allowedSort = ['created_at', 'title', 'status', 'priority'];
  const safeSort = allowedSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  values.push(limit, offset);

  return pool.query(
    `SELECT r.*, u.email
     FROM requests r
     JOIN users u ON u.id = r.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.${safeSort} ${safeOrder}
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
};

const countRequests = ({ scope, userId, search, status, assignedTo }) => {
  // misma construcción de `conditions`/`values` que getRequests, sin limit/offset/sort
  // SELECT COUNT(*) FROM requests r WHERE ${conditions.join(' AND ')}
};
```

`getRequestById`, `updateRequestFull`, `softDeleteRequest`, `getDeletedRequests`-por-id-único, `logRequestHistory`, `getRequestHistory`, `getExpiredDeletedRequests`, `hardDeleteRequest` — **no se tocan**, son funciones de una sola fila o del cron de purga, ajenas a este cambio.

`request.service.js`: `getAllRequests`, `getRequestsByUser`, `getDeletedRequestsService`, `getDeletedRequestsByUserService` pasan a construir sus llamadas a `getRequests`/`countRequests` con el `scope` correspondiente y arman `{ total, page, limit, totalPages, data }`. `purgeExpiredRequests` no cambia (usa `getExpiredDeletedRequests`, sin tocar).

### `request.controller.js`

```js
const getAll = asyncHandler(async (req, res) => {
  const result = await requestService.listRequests({ ...req.query, scope: 'all' });
  res.json({ success: true, ...result });
});

const getMine = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query; // assignedTo no se acepta aquí aunque llegue
  const result = await requestService.listRequests({ ...rest, scope: 'mine', userId: req.user.id });
  res.json({ success: true, ...result });
});

const getDeleted = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query;
  const isPrivileged = req.user.roles.includes('admin') || req.user.roles.includes('supervisor');
  const scope = isPrivileged ? 'deleted' : 'deleted-mine';
  const result = await requestService.listRequests({ ...rest, scope, userId: req.user.id });
  res.json({ success: true, ...result });
});
```

`getMine`/`getDeleted` reciben `listRequestsQuerySchema` igual que `getAll` a nivel de ruta (mismo query-schema para las 3, ya que zod ya valida `assignedTo` como opcional; el controller simplemente lo descarta donde no aplica — así no se necesitan 3 schemas distintos).

### `role.model.js` / `role.service.js` / `role.controller.js`

Mismo patrón que permissions, pero solo con `search` (sin filtros adicionales):

```js
const getRoles = (limit, offset, search, sort, order) => { /* WHERE name ILIKE, LIMIT/OFFSET */ };
const countRoles = (search) => { /* SELECT COUNT(*) ... */ };
```

`getRoleService` (obtener uno) y el resto de funciones de `role.model.js`/`role.service.js` (`createRole`, `updateRole`, `deleteRole`, `assignPermission`, etc.) **no se tocan**.

### `user.model.js` / `user.service.js` / `user.controller.js`

```js
const getUsers = ({ limit, offset, search, role, isActive, sort, order }) => {
  // FROM users u
  // LEFT JOIN user_roles ur ON u.id = ur.user_id
  // LEFT JOIN roles r ON ur.role_id = r.id
  // WHERE (search → u.name ILIKE OR u.email ILIKE)
  //   AND (role → r.name = $role)
  //   AND (isActive !== undefined → u.is_active = $isActive)
  // GROUP BY u.id  -- se mantiene el mismo agregado de roles/permissions que ya usa getAllUsers
  // ORDER BY u.${safeSort} ${safeOrder} LIMIT/OFFSET
};
const countUsers = ({ search, role, isActive }) => { /* SELECT COUNT(DISTINCT u.id) con los mismos JOIN/WHERE */ };
```

El resto de `user.model.js` (`createUser`, `updateUser`, `deleteUser`, `updateUserRole`, `toggleUserActiveStatus`, `emailExists`, `findUserByEmail`, etc.) **no se toca**. `countUsersByRole` existente se mantiene (lo usa otro flujo, no relacionado).

### Rutas

En `request.routes.js`, `role.routes.js`, `user.routes.js`: se agrega `validate(listXQuerySchema, 'query')` a cada `router.get('/', ...)` de listado (y a `/mine`, `/deleted` en requests), antes del controller, siguiendo el mismo orden que ya usan (`authenticate`, `authorize(...)`, `validate(...)`, `controller.getAll`).

## Diseño técnico — Frontend

### `frontend/src/components/ui/Pagination.vue` (nuevo)

Props: `{ page: number; totalPages: number; total: number; limit: number }`. Emits: `update:page`, `update:limit`.

```vue
<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
    <span class="text-sm text-gray-500 dark:text-gray-400">
      Mostrando {{ rangeStart }}-{{ rangeEnd }} de {{ total }}
    </span>
    <div class="flex items-center gap-3">
      <select :value="limit" @change="$emit('update:limit', Number(($event.target as HTMLSelectElement).value))"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-500">
        <option :value="10">10 / página</option>
        <option :value="20">20 / página</option>
        <option :value="50">50 / página</option>
      </select>
      <div class="flex items-center gap-2">
        <button :disabled="page <= 1" @click="$emit('update:page', page - 1)"
          class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">
          Anterior
        </button>
        <span class="text-sm text-gray-600 dark:text-gray-300 px-2">Página {{ page }} de {{ totalPages || 1 }}</span>
        <button :disabled="page >= totalPages" @click="$emit('update:page', page + 1)"
          class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>
```

`rangeStart`/`rangeEnd` computados: `(page-1)*limit + 1` y `Math.min(page*limit, total)`, con guarda para `total === 0`.

(Nota: el spec original pedía resaltar la página activa en `bg-primary-50 text-primary-600` como si hubiera botones numerados — al no haberlos en el patrón Anterior/Siguiente, ese estilo no aplica; el texto "Página X de Y" cumple el mismo rol informativo.)

### `frontend/src/composables/useListQuery.ts` (nuevo)

Composable genérico reutilizado por las 6 vistas. Responsabilidades:
- Estado reactivo: `page`, `limit`, `search`, `filters` (objeto de clave→valor, distinto por vista).
- Debounce de 300ms sobre `search` antes de disparar `fetch`.
- Al cambiar `page`/`limit`/`filters`, dispara `fetch` inmediatamente (sin debounce — solo el texto de búsqueda lo lleva).
- Manejo de carrera: cada llamada a `fetch` lleva un contador incremental; si la respuesta que vuelve no es la de la última llamada disparada, se descarta.
- Expone `activeFilterChips: computed<{ key: string; label: string }[]>` a partir de `filters` + un mapa de etiquetas que cada vista le pasa (ej. `{ status: 'Estado: Abierta' }`), para renderizar los chips removibles.
- Resetea `page` a 1 cuando cambian `search` o `filters` (evita quedar en una página vacía tras filtrar).

Firma aproximada:

```ts
function useListQuery<TFilters extends Record<string, string | undefined>>(
  fetchFn: (params: { page: number; limit: number; search?: string } & TFilters) => Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>,
  options: { initialFilters: TFilters; filterLabels: Partial<Record<keyof TFilters, (value: string) => string>> }
) { /* ... */ }
```

### Vista de barra de búsqueda + filtros (patrón de markup, no componente único forzado)

Dado que los filtros varían por vista (selects de estado/agente en tickets, rol/estado en usuarios, ninguno en roles/permisos), **no se fuerza un único componente `SearchFilterBar.vue` con slots complejos** — cada vista arma su propia barra usando: un `BaseInput` con `:icon="MagnifyingGlassIcon"` conectado a `useListQuery().search`, más los `<select>` de filtro que le correspondan (mismo patrón `<select>` ya usado en `ManageRequestsView`), más un contenedor de chips que itera `activeFilterChips` del composable. Esto evita crear una abstracción de componente sobre-genérica para 6 casos con necesidades distintas, mientras el composable sí centraliza toda la lógica no-visual (debounce, carrera, reseteo de página, chips computados) — que es donde vive la complejidad real a compartir.

Markup de chip (idéntico en las 6 vistas, vía un pequeño snippet repetido, no un componente aparte — es 3 líneas):

```vue
<span v-for="chip in activeFilterChips" :key="chip.key"
  class="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-xs px-3 py-1">
  {{ chip.label }}
  <button @click="clearFilter(chip.key)" class="hover:text-primary-900 dark:hover:text-primary-200">✕</button>
</span>
```

### Empty state al filtrar sin resultados

Cada vista ya tiene un empty-state (ícono + texto) para "sin datos" — se reutiliza el mismo bloque condicional, cambiando el texto cuando `search`/`filters` están activos (ej. "No hay solicitudes con estos filtros." vs "No hay solicitudes registradas.") — `ManageRequestsView` ya tiene este patrón exacto hoy con sus contadores; se extiende el mismo criterio a `search`/nuevos filtros.

### Aplicación por vista (API client)

- `request.api.ts`: `getAll`, `getMine`, `getDeleted` ganan parámetros `{ page, limit, search?, status?, assignedTo? }`, devuelven `{ success, data, total, page, limit, totalPages }` en vez de `Request[]` plano — cambia el tipo de retorno, cada vista ajusta su consumo (`res.data.data` en vez de `res.data`).
- `role.api.ts`: `getAll` gana `{ page, limit, search? }`, mismo cambio de shape.
- `user.api.ts`: `getAll` gana `{ page, limit, search?, role?, isActive? }`, mismo cambio de shape (el tipo `UserListResponse` ya declarado en `user.api.ts` — `{data, total, page, limit}` — ya anticipaba esto; solo falta que el backend lo cumpla de verdad y que `getAll` acepte params).
- `permission.api.ts`: **no cambia** — ya tiene el shape y los params correctos; solo cambia qué componentes de UI consume `PermissionsView.vue`.

## Fuera de alcance

- No se cambian los permisos de acceso (`authorize(...)`) de ningún endpoint.
- No se cambia el comportamiento de creación/edición/eliminación de solicitudes, usuarios, roles ni permisos — solo los endpoints de **listado**.
- No se toca `analytics.*` (ya tiene su propio filtrado por rango de fechas, ajeno a este trabajo).
- No se agregan índices de base de datos nuevos — el volumen actual (280 solicitudes de demo, pocos usuarios/roles) no lo amerita; si se requiere en el futuro, es un cambio de infraestructura aparte.
- No se implementa ordenamiento (sort) interactivo en la UI (clic en encabezado de columna) — los query params `sort`/`order` existen en el backend por consistencia con el patrón de permissions, pero el frontend de esta parte no expone un control de UI para cambiarlos manualmente (se mantiene el default `created_at DESC` en todas las vistas, igual que hoy).
