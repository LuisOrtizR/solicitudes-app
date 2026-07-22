# Paginación Real + Filtros y Búsqueda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los listados "traer todo y mostrar todo" de `requests` (3 endpoints), `roles` y `users` por paginación real en servidor (`LIMIT/OFFSET` + `COUNT(*)`), agregar búsqueda y filtros por módulo, y consumirlos desde 6 vistas del dashboard con un paginador y una barra de búsqueda/filtros reutilizables.

**Architecture:** Backend — cada módulo gana un query-schema `zod` validado vía `validate(schema, 'query')`, funciones de modelo parametrizadas con `LIMIT/OFFSET`/`ILIKE`/filtros dinámicos, y una respuesta uniforme `{ success, data, total, page, limit, totalPages }` igual a la que ya usa `/permissions`. `request.model.js` consolida sus 4 funciones de consulta casi-idénticas en una sola parametrizada por `scope`. Frontend — un componente `Pagination.vue` (Anterior/Siguiente + selector de tamaño) y un composable `useListQuery.ts` (debounce, manejo de carrera, chips de filtro, reseteo de página) reutilizados en las 6 vistas de listado.

**Tech Stack:** Node/Express, `pg` (queries parametrizadas, sin ORM), `zod`. Vue 3 `<script setup>` + TypeScript, Tailwind CSS v4, Pinia (sin cambios en stores existentes).

## Global Constraints

- Clases utilitarias de Tailwind únicamente — sin CSS custom, sin archivos `.css` nuevos.
- Reutilizar `BaseInput`/`BaseButton` donde aplique en vez de duplicar markup.
- No cambiar `authorize(...)` de ningún endpoint, ni la lógica de creación/edición/eliminación existente — solo los endpoints de listado.
- Token de color `primary-*` (no `indigo-*` literal) con pares `dark:` en todo el código visual nuevo.
- Enum real de `requests.status`: `open, in_progress, waiting_user, resolved, closed, rejected`. Enum real de `requests.priority`: `low, medium, high, urgent`.
- El filtro `assigned_to` solo se expone en `GET /requests` (no en `/mine` ni `/deleted`).
- No hay suite de tests automatizada en el proyecto. Verificación backend: `curl`/smoke test manual contra el servidor corriendo. Verificación frontend: `npm run type-check` + verificación visual en el preview.
- Commit por tarea.

---

### Task 1: Paginación real en `requests` (validator + model + service + controller + routes)

**Files:**
- Modify: `backend/src/requests/request.validator.js`
- Modify: `backend/src/requests/request.model.js`
- Modify: `backend/src/requests/request.service.js`
- Modify: `backend/src/requests/request.controller.js`
- Modify: `backend/src/requests/request.routes.js`

**Interfaces:**
- Produces: `GET /requests`, `GET /requests/mine`, `GET /requests/deleted` devuelven `{ success: true, data: Request[], total: number, page: number, limit: number, totalPages: number }` en vez de `Request[]` plano. Query params soportados: `page, limit, search, status, sort, order` (los 3 endpoints) + `assignedTo` (solo `GET /requests`).

- [ ] **Step 1: Agregar `listRequestsQuerySchema` a `request.validator.js`**

Agregar al final del archivo, antes del `module.exports`:

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

Y agregar `listRequestsQuerySchema` al `module.exports` existente (junto a `createRequestSchema`, `updateRequestSchema`, `deleteRequestSchema`).

- [ ] **Step 2: Reemplazar las 4 funciones de consulta en `request.model.js`**

Eliminar `getAllRequests`, `getRequestsByUser`, `getDeletedRequests`, `getDeletedRequestsByUser` (líneas 11-28 y 79-95 y 136-144 del archivo actual) y reemplazarlas por:

```js
const _buildRequestConditions = ({ scope, userId, search, status, assignedTo }) => {
  const conditions = [];
  const values = [];
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

  return { where: conditions.join(' AND '), values, nextIdx: idx };
};

const allowedRequestSort = ['created_at', 'title', 'status', 'priority'];

const getRequests = ({ scope, userId, limit, offset, search, status, assignedTo, sort, order }) => {
  const { where, values, nextIdx } = _buildRequestConditions({ scope, userId, search, status, assignedTo });

  const safeSort = allowedRequestSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const finalValues = [...values, limit, offset];

  return pool.query(
    `SELECT r.*, u.email
     FROM requests r
     JOIN users u ON u.id = r.user_id
     WHERE ${where}
     ORDER BY r.${safeSort} ${safeOrder}
     LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
    finalValues
  );
};

const countRequests = ({ scope, userId, search, status, assignedTo }) => {
  const { where, values } = _buildRequestConditions({ scope, userId, search, status, assignedTo });

  return pool.query(
    `SELECT COUNT(*) FROM requests r WHERE ${where}`,
    values
  );
};
```

`getExpiredDeletedRequests` (usada por el cron de purga, sin `deleted_at IS NOT NULL AND user_id`, distinta lógica) **no se toca**. `getRequestById`, `updateRequestFull`, `softDeleteRequest`, `hardDeleteRequest`, `logRequestHistory`, `getRequestHistory` **no se tocan**.

Actualizar el `module.exports` del archivo: quitar `getAllRequests, getRequestsByUser, getDeletedRequests, getDeletedRequestsByUser`, agregar `getRequests, countRequests`.

- [ ] **Step 3: Actualizar `request.service.js`**

Reemplazar el import (línea 1-14) quitando `getAllRequests, getRequestsByUser, getDeletedRequestsByUser` (mantener el resto) y agregando `getRequests, countRequests` desde `./request.model`.

Reemplazar las funciones `getDeletedRequestsService`/`getDeletedRequestsByUserService` (líneas 130-132) y agregar la nueva función compartida `listRequestsService`:

```js
const listRequestsService = async ({ scope, userId, page = 1, limit = 10, search, status, assignedTo, sort, order }) => {
  const offset = (page - 1) * limit;

  const data = await getRequests({ scope, userId, limit, offset, search, status, assignedTo, sort, order });
  const totalResult = await countRequests({ scope, userId, search, status, assignedTo });
  const total = Number(totalResult.rows[0].count);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: data.rows,
  };
};
```

Quitar `getDeletedRequestsService`/`getDeletedRequestsByUserService` del `module.exports` y agregar `listRequestsService`. Mantener `getHistoryByRequest`, `createNewRequest`, `updateExistingRequest`, `deleteRequestById`, `purgeExpiredRequests` sin cambios.

- [ ] **Step 4: Actualizar `request.controller.js`**

Reemplazar el import (quitar `getAllRequests, getRequestsByUser, getDeletedRequestsService, getDeletedRequestsByUserService`; agregar `listRequestsService` desde `./request.service`).

Reemplazar `getAll`, `getMine`, `getDeleted`:

```js
const getAll = asyncHandler(async (req, res) => {
  const result = await listRequestsService({ ...req.query, scope: 'all' });
  res.json({ success: true, ...result });
});

const getMine = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query;
  const result = await listRequestsService({ ...rest, scope: 'mine', userId: req.user.id });
  res.json({ success: true, ...result });
});

const getDeleted = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query;
  const isPrivileged = req.user.roles.includes('admin') || req.user.roles.includes('supervisor');
  const scope = isPrivileged ? 'deleted' : 'deleted-mine';
  const result = await listRequestsService({ ...rest, scope, userId: req.user.id });
  res.json({ success: true, ...result });
});
```

El resto del archivo (`create`, `getOne`, `update`, `remove`, `getHistory`, `isPrivileged` helper) no cambia.

- [ ] **Step 5: Wire `validate(listRequestsQuerySchema, 'query')` en `request.routes.js`**

Agregar el import de `listRequestsQuerySchema` (junto a los otros schemas ya importados de `./request.validator`).

En las 3 rutas `GET /`, `GET /mine`, `GET /deleted`, agregar `validate(listRequestsQuerySchema, 'query')` justo antes del controller (después de `authenticate`/`authorize`):

```js
router.get(
  '/',
  authenticate,
  authorize('requests_read_all'),
  validate(listRequestsQuerySchema, 'query'),
  controller.getAll
);

router.get(
  '/mine',
  authenticate,
  authorize('requests_read'),
  validate(listRequestsQuerySchema, 'query'),
  controller.getMine
);

router.get(
  '/deleted',
  authenticate,
  authorize('requests_read'),
  validate(listRequestsQuerySchema, 'query'),
  controller.getDeleted
);
```

- [ ] **Step 6: Smoke test manual**

Con el backend corriendo (`cd backend && npm run dev` si no está ya activo) y una sesión autenticada como admin (usar las credenciales demo `admin@empresa.com` / `Admin123*` vía `POST /api/auth/login` para obtener el cookie/token, según el mecanismo de auth ya usado por el resto del proyecto):

```bash
curl -s "http://localhost:3001/api/requests?page=1&limit=5" -H "Authorization: Bearer <token>" | jq
```

Verificar: `success: true`, `data` con 5 elementos, `total` = 280 (o el conteo real actual), `totalPages` correcto.

```bash
curl -s "http://localhost:3001/api/requests?status=open&limit=5" -H "Authorization: Bearer <token>" | jq '.data[].status'
```

Verificar: todos los `status` devueltos son `"open"`.

```bash
curl -s "http://localhost:3001/api/requests?search=demo" -H "Authorization: Bearer <token>" | jq '.total'
```

Verificar: un `total` menor al total general (filtra por texto).

```bash
curl -s "http://localhost:3001/api/requests/mine?assignedTo=<cualquier-uuid>" -H "Authorization: Bearer <token>" | jq
```

Verificar: el request no falla (zod lo acepta como opcional válido) y el resultado ignora `assignedTo` (mismo resultado que sin ese param) — confirma que `/mine` descarta el filtro correctamente.

- [ ] **Step 7: Commit**

```bash
git add backend/src/requests/request.validator.js backend/src/requests/request.model.js backend/src/requests/request.service.js backend/src/requests/request.controller.js backend/src/requests/request.routes.js
git commit -m "feat(backend): paginacion real, busqueda y filtros en requests"
```

---

### Task 2: Paginación real en `roles` (validator + model + service + controller + routes)

**Files:**
- Modify: `backend/src/roles/role.validator.js`
- Modify: `backend/src/roles/role.model.js`
- Modify: `backend/src/roles/role.service.js`
- Modify: `backend/src/roles/role.controller.js`
- Modify: `backend/src/roles/role.routes.js`

**Interfaces:**
- Produces: `GET /roles` devuelve `{ success: true, data: Role[], total, page, limit, totalPages }`. Query params: `page, limit, search, sort∈{name,created_at}, order`.

- [ ] **Step 1: Agregar `listRolesQuerySchema` a `role.validator.js`**

```js
const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['name', 'created_at']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});
```

Agregar `listRolesQuerySchema` al `module.exports`.

- [ ] **Step 2: Reemplazar `getRoles` en `role.model.js`**

Reemplazar:
```js
const getRoles = () =>
  pool.query(`SELECT * FROM roles ORDER BY id ASC`);
```

Por:
```js
const allowedRoleSort = ['name', 'created_at'];

const getRolesPaginated = (limit, offset, search, sort, order) => {
  const values = [];
  let where = '';
  let idx = 1;

  if (search) {
    where = `WHERE name ILIKE $${idx++}`;
    values.push(`%${search}%`);
  }

  const safeSort = allowedRoleSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  values.push(limit, offset);

  return pool.query(
    `SELECT * FROM roles
     ${where}
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
};

const countRoles = (search) =>
  search
    ? pool.query(`SELECT COUNT(*) FROM roles WHERE name ILIKE $1`, [`%${search}%`])
    : pool.query(`SELECT COUNT(*) FROM roles`);
```

Actualizar `module.exports`: quitar `getRoles`, agregar `getRolesPaginated, countRoles`.

- [ ] **Step 3: Actualizar `role.service.js`**

Reemplazar el import (quitar `getRoles`, agregar `getRolesPaginated, countRoles` desde `./role.model`).

Reemplazar `getRolesService`:

```js
const getRolesService = async ({ page = 1, limit = 10, search, sort, order }) => {
  const offset = (page - 1) * limit;

  const data = await getRolesPaginated(limit, offset, search, sort, order);
  const totalResult = await countRoles(search);
  const total = Number(totalResult.rows[0].count);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: data.rows,
  };
};
```

El resto del archivo (`createRoleService`, `getRoleService`, `updateRoleService`, `deleteRoleService`, `assignPermissionService`, `removePermissionService`, `getRolePermissionsService`, `SYSTEM_ROLES`, `PROTECTED_ROLE_PERMISSIONS`) no cambia.

- [ ] **Step 4: Actualizar `role.controller.js`**

Reemplazar `getAll`:

```js
const getAll = asyncHandler(async (req, res) => {
  const result = await getRolesService(req.query);
  res.json({ success: true, ...result });
});
```

(El import ya trae `getRolesService` desde `./role.service` — no cambia el import, solo el cuerpo de `getAll`.)

- [ ] **Step 5: Wire `validate(listRolesQuerySchema, 'query')` en `role.routes.js`**

Agregar el import de `listRolesQuerySchema`. En `GET /`:

```js
router.get(
  '/',
  authenticate,
  authorize('view_roles'),
  validate(listRolesQuerySchema, 'query'),
  controller.getAll
);
```

- [ ] **Step 6: Smoke test manual**

```bash
curl -s "http://localhost:3001/api/roles?page=1&limit=1" -H "Authorization: Bearer <token>" | jq
```

Verificar: `success: true`, `data` con 1 elemento, `total` = 2 (admin + user, salvo que se hayan creado más en la sesión), `totalPages: 2`.

```bash
curl -s "http://localhost:3001/api/roles?search=admin" -H "Authorization: Bearer <token>" | jq '.data[].name'
```

Verificar: solo devuelve el rol `admin`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/roles/role.validator.js backend/src/roles/role.model.js backend/src/roles/role.service.js backend/src/roles/role.controller.js backend/src/roles/role.routes.js
git commit -m "feat(backend): paginacion real y busqueda en roles"
```

---

### Task 3: Paginación real en `users` (validator + model + service + controller + routes)

**Files:**
- Modify: `backend/src/users/user.validator.js`
- Modify: `backend/src/users/user.model.js`
- Modify: `backend/src/users/user.service.js`
- Modify: `backend/src/users/user.controller.js`
- Modify: `backend/src/users/user.routes.js`

**Interfaces:**
- Produces: `GET /users` devuelve `{ success: true, data: User[], total, page, limit, totalPages }`. Query params: `page, limit, search, role, is_active, sort∈{name,email,created_at}, order`.

- [ ] **Step 1: Agregar `listUsersQuerySchema` a `user.validator.js`**

```js
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  role: z.string().min(1).max(50).optional(),
  is_active: z.coerce.boolean().optional(),
  sort: z.enum(['name', 'email', 'created_at']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});
```

Agregar `listUsersQuerySchema` al `module.exports`.

- [ ] **Step 2: Reemplazar `getAllUsers` en `user.model.js`**

Reemplazar la función `getAllUsers` (líneas 102-137 del archivo actual) por:

```js
const allowedUserSort = ['name', 'email', 'created_at'];

const _buildUserConditions = ({ search, role, isActive }) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (isActive !== undefined) {
    conditions.push(`u.is_active = $${idx++}`);
    values.push(isActive);
  }
  if (role) {
    conditions.push(
      `EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id AND r2.name = $${idx++})`
    );
    values.push(role);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    nextIdx: idx,
  };
};

const getUsersPaginated = async ({ limit, offset, search, role, isActive, sort, order }) => {
  const { where, values, nextIdx } = _buildUserConditions({ search, role, isActive });

  const safeSort = allowedUserSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const finalValues = [...values, limit, offset];

  const { rows } = await pool.query(
    `
    SELECT
      u.id, u.name, u.email, u.is_active, u.created_at, u.is_protected,
      COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::VARCHAR[]) AS roles,
      COALESCE(ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::VARCHAR[]) AS permissions
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    ${where}
    GROUP BY u.id
    ORDER BY u.${safeSort} ${safeOrder}
    LIMIT $${nextIdx} OFFSET $${nextIdx + 1}
    `,
    finalValues
  );

  return rows.map(user => ({
    ...user,
    roles: parsePostgresArray(user.roles),
    permissions: parsePostgresArray(user.permissions),
  }));
};

const countUsersFiltered = async ({ search, role, isActive }) => {
  const { where, values } = _buildUserConditions({ search, role, isActive });

  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM users u ${where}`,
    values
  );
  return parseInt(rows[0].count, 10);
};
```

Nota: el filtro `role` usa una subconsulta `EXISTS` en vez de sumarse a los `LEFT JOIN` de agregación — así no interfiere con el cálculo de `roles`/`permissions` de cada fila, y `countUsersFiltered` no necesita ningún `JOIN` (más simple y rápido que si reutilizara los joins de agregación).

Actualizar `module.exports`: quitar `getAllUsers`, agregar `getUsersPaginated, countUsersFiltered`. Mantener `countUsers`, `countUsersByRole` (usadas por otro flujo, sin relación) y el resto de funciones sin cambios.

- [ ] **Step 3: Actualizar `user.service.js`**

Reemplazar el import (quitar `getAllUsers`, agregar `getUsersPaginated, countUsersFiltered` desde `./user.model`).

Reemplazar `getUsersService`:

```js
const getUsersService = async ({ page = 1, limit = 10, search, role, is_active, sort, order }) => {
  const offset = (page - 1) * limit;

  const data = await getUsersPaginated({ limit, offset, search, role, isActive: is_active, sort, order });
  const total = await countUsersFiltered({ search, role, isActive: is_active });

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data,
  };
};
```

El resto del archivo (`getUserService`, `updateUserService`, `deleteUserService`, `changeUserRoleService`) no cambia.

- [ ] **Step 4: Actualizar `user.controller.js`**

Reemplazar `getAll`:

```js
const getAll = asyncHandler(async (req, res) => {
  const result = await getUsersService(req.query);
  res.json({ success: true, ...result });
});
```

(`getUsersService` ya está importado desde `./user.service` — no cambia el import.)

- [ ] **Step 5: Wire `validate(listUsersQuerySchema, 'query')` en `user.routes.js`**

Agregar el import de `listUsersQuerySchema`. En `GET /`:

```js
router.get(
  '/',
  authenticate,
  authorizePermission('users_read'),
  validate(listUsersQuerySchema, 'query'),
  controller.getAll
);
```

- [ ] **Step 6: Smoke test manual**

```bash
curl -s "http://localhost:3001/api/users?page=1&limit=1" -H "Authorization: Bearer <token>" | jq
```

Verificar: `success: true`, `data` con 1 elemento, `total` real vía `COUNT(*)` (no el largo de un array ya cargado).

```bash
curl -s "http://localhost:3001/api/users?role=admin" -H "Authorization: Bearer <token>" | jq '.data[].roles'
```

Verificar: todos los usuarios devueltos tienen `"admin"` en su array `roles`.

```bash
curl -s "http://localhost:3001/api/users?is_active=false" -H "Authorization: Bearer <token>" | jq '.total'
```

Verificar: no falla (aunque el resultado sea `0` si no hay usuarios inactivos en el seed actual).

- [ ] **Step 7: Commit**

```bash
git add backend/src/users/user.validator.js backend/src/users/user.model.js backend/src/users/user.service.js backend/src/users/user.controller.js backend/src/users/user.routes.js
git commit -m "feat(backend): paginacion real, busqueda y filtros en users"
```

---

### Task 4: `Pagination.vue` — componente compartido nuevo

**Files:**
- Create: `frontend/src/components/ui/Pagination.vue`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: componente con props `{ page: number; totalPages: number; total: number; limit: number }`, emits `update:page` (number), `update:limit` (number). Usado por las Tasks 7-12.

- [ ] **Step 1: Crear el componente**

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}>();

const emit = defineEmits<{
  "update:page": [value: number];
  "update:limit": [value: number];
}>();

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1));
const rangeEnd = computed(() => Math.min(props.page * props.limit, props.total));

const onLimitChange = (e: Event) => {
  emit("update:limit", Number((e.target as HTMLSelectElement).value));
};
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
    <span class="text-sm text-gray-500 dark:text-gray-400">
      Mostrando {{ rangeStart }}-{{ rangeEnd }} de {{ total }}
    </span>
    <div class="flex items-center gap-3">
      <select
        :value="limit"
        @change="onLimitChange"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option :value="10">10 / página</option>
        <option :value="20">20 / página</option>
        <option :value="50">50 / página</option>
      </select>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          @click="emit('update:page', page - 1)"
          class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
        >
          Anterior
        </button>
        <span class="text-sm text-gray-600 dark:text-gray-300 px-2 whitespace-nowrap">
          Página {{ page }} de {{ totalPages || 1 }}
        </span>
        <button
          :disabled="page >= totalPages"
          @click="emit('update:page', page + 1)"
          class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Pagination.vue
git commit -m "feat(frontend): componente Pagination compartido"
```

---

### Task 5: `useListQuery.ts` — composable compartido nuevo

**Files:**
- Create: `frontend/src/composables/useListQuery.ts`

**Interfaces:**
- Consumes: nada nuevo (Vue `ref`/`computed`/`watch`).
- Produces: función `useListQuery<TFilters>(fetchFn, options)` que devuelve `{ page, limit, search, filters, data, total, totalPages, loading, error, activeFilterChips, setFilter, clearFilter, refetch }`. Usado por las Tasks 7-12.

- [ ] **Step 1: Crear el directorio y el composable**

Verificar primero si `frontend/src/composables/` existe (`ls frontend/src/composables` o equivalente); si no existe, crearlo al crear el archivo.

```ts
import { ref, reactive, computed, watch, type Ref } from "vue";

export interface ListQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterChip {
  key: string;
  label: string;
}

export function useListQuery<T, TFilters extends Record<string, string | undefined>>(
  fetchFn: (params: { page: number; limit: number; search?: string } & TFilters) => Promise<ListQueryResult<T>>,
  options: {
    initialFilters: TFilters;
    filterLabels: Partial<Record<keyof TFilters, (value: string) => string>>;
  }
) {
  const page = ref(1);
  const limit = ref(10);
  const search = ref("");
  const filters = reactive({ ...options.initialFilters }) as TFilters;

  const data = ref([]) as Ref<T[]>;
  const total = ref(0);
  const totalPages = ref(1);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let requestToken = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const fetchNow = async () => {
    const token = ++requestToken;
    loading.value = true;
    error.value = null;

    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
      ) as TFilters;

      const result = await fetchFn({
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
        ...cleanFilters,
      });

      if (token !== requestToken) return; // respuesta obsoleta, se descarta

      data.value = result.data;
      total.value = result.total;
      totalPages.value = result.totalPages;
    } catch (err: any) {
      if (token !== requestToken) return;
      error.value = err.response?.data?.message || "Error cargando datos";
    } finally {
      if (token === requestToken) loading.value = false;
    }
  };

  const setFilter = <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    filters[key] = value;
    page.value = 1;
  };

  const clearFilter = (key: keyof TFilters) => {
    filters[key] = undefined as TFilters[keyof TFilters];
    page.value = 1;
  };

  const activeFilterChips = computed<FilterChip[]>(() =>
    (Object.keys(filters) as (keyof TFilters)[])
      .filter((key) => filters[key] !== undefined && filters[key] !== "")
      .map((key) => ({
        key: String(key),
        label: options.filterLabels[key]?.(filters[key] as string) ?? `${String(key)}: ${filters[key]}`,
      }))
  );

  watch(search, () => {
    page.value = 1;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchNow, 300);
  });

  watch(page, fetchNow);
  watch(limit, () => {
    page.value = 1;
    fetchNow();
  });
  watch(
    () => ({ ...filters }),
    fetchNow,
    { deep: true }
  );

  return {
    page,
    limit,
    search,
    filters,
    data,
    total,
    totalPages,
    loading,
    error,
    activeFilterChips,
    setFilter,
    clearFilter,
    refetch: fetchNow,
  };
}
```

Nota: `watch(page, fetchNow)` y `watch(limit, ...)`/`watch(() => ({...filters}), fetchNow, {deep:true})` disparan `fetchNow` cada vez que cambian — incluyendo el cambio de `page.value = 1` que ya hacen `setFilter`/`clearFilter`/el watcher de `limit`. Esto puede causar una petición doble en esos casos (una por el watcher de `page`, otra por el watcher de `filters`/`limit`) — es un comportamiento aceptable (no rompe nada, solo una llamada de red extra ocasional) dado que no hay suite de tests que lo penalice y simplifica la lógica; **no** optimizar con debounce/coalescing adicional en esta tarea — si se nota como problema real durante la verificación manual, reportarlo en el `NEEDS_CONTEXT`/`DONE_WITH_CONCERNS` del reporte de esta tarea en vez de resolverlo por cuenta propia.

Cada vista llama `fetchNow()` (via `refetch`) una vez en `onMounted` para la carga inicial (los `watch` no disparan en el montaje por defecto).

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/composables/useListQuery.ts
git commit -m "feat(frontend): composable useListQuery compartido"
```

---

### Task 6: Actualizar clientes API (`request.api.ts`, `role.api.ts`, `user.api.ts`)

**Files:**
- Modify: `frontend/src/api/endpoints/request.api.ts`
- Modify: `frontend/src/api/endpoints/role.api.ts`
- Modify: `frontend/src/api/endpoints/user.api.ts`

**Interfaces:**
- Produces: `requestApi.getAll/getMine/getDeleted`, `roleApi.getAll`, `userApi.getAll` aceptan un objeto de params y devuelven `AxiosResponse<{ success: boolean; data: T[]; total: number; page: number; limit: number; totalPages: number }>`. Usado por las Tasks 7-12.

- [ ] **Step 1: Actualizar `request.api.ts`**

Reemplazar el contenido completo:

```ts
import api from "../axios";
import type { Request, CreateRequestDTO, UpdateRequestDTO } from "@/types/request.types";

export interface RequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  assignedTo?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface RequestListResponse {
  success: boolean;
  data: Request[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const requestApi = {
  create:     (data: CreateRequestDTO)             => api.post<Request>("/requests", data),
  getAll:     (params: RequestListParams = {})     => api.get<RequestListResponse>("/requests", { params }),
  getMine:    (params: RequestListParams = {})     => api.get<RequestListResponse>("/requests/mine", { params }),
  getDeleted: (params: RequestListParams = {})     => api.get<RequestListResponse>("/requests/deleted", { params }),
  getOne:     (id: string)                         => api.get<Request>(`/requests/${id}`),
  update:     (id: string, data: UpdateRequestDTO) => api.put<Request>(`/requests/${id}`, data),
  delete:     (id: string, reason: string)         => api.delete(`/requests/${id}`, { data: { reason } }),
  history:    (id: string)                         => api.get<any[]>(`/requests/${id}/history`),
};
```

- [ ] **Step 2: Actualizar `role.api.ts`**

Reemplazar solo la firma de `getAll` y agregar los tipos de params/respuesta (mantener `Role`, `CreateRoleDTO`, `UpdateRoleDTO` y el resto de métodos tal cual):

```ts
export interface RoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface RoleListResponse {
  success: boolean;
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Y en el objeto `roleApi`:

```ts
  getAll(params: RoleListParams = {}) {
    return api.get<RoleListResponse>("/roles", { params });
  },
```

- [ ] **Step 3: Actualizar `user.api.ts`**

Agregar tipos de params y respuesta (mantener `User`, `ApiResponse` tal cual; `UserListResponse` ya existente se ajusta para incluir `success`/`totalPages`):

```ts
export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface UserListResponse {
  success: boolean;
  data: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}
```

Y en el objeto `userApi`:

```ts
  getAll(params: UserListParams = {}) {
    return api.get<UserListResponse>("/users", { params })
  },
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run type-check`
Expected: errores esperados en `RequestsView.vue`, `ManageRequestsView.vue`, `Deletedrequestsview.vue`, `RolesView.vue`, `PermissionsView.vue`, `UsersView.vue` (aún leen `res.data` como array plano en vez de `res.data.data`) — se resuelven en las Tasks 7-12. Si hay errores en archivos fuera de esa lista, detenerse y revisar.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/endpoints/request.api.ts frontend/src/api/endpoints/role.api.ts frontend/src/api/endpoints/user.api.ts
git commit -m "feat(frontend): clientes API de requests/roles/users devuelven shape paginado"
```

---

### Task 7: `RequestsView.vue` — búsqueda + filtro de estado + paginación

**Files:**
- Modify: `frontend/src/views/dashboard/RequestsView.vue`

**Interfaces:**
- Consumes: `Pagination.vue` (Task 4), `useListQuery` (Task 5), `requestApi.getMine`/`getAll` con el nuevo shape (Task 6, `admin` sigue viendo todas via `getAll`, resto via `getMine` — mismo criterio que ya usaba `fetchRequests`).

- [ ] **Step 1: Leer el archivo actual completo**

Confirmar el estado exacto de `fetchRequests`, `isAdmin`, el template (tabla desktop + cards mobile) antes de editar — el archivo ya fue tocado en el trabajo de sistema de diseño anterior (usa `StatusBadge`/`PriorityBadge`/`BaseButton`), no reescribir desde cero, solo insertar lo necesario.

- [ ] **Step 2: Reemplazar `fetchRequests` por `useListQuery`**

En el `<script setup>`, importar:

```ts
import Pagination from "@/components/ui/Pagination.vue";
import { useListQuery } from "@/composables/useListQuery";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
```

Quitar `requests`, `loading`, `error`, y la función `fetchRequests` existentes. Reemplazar por:

```ts
interface RequestFilters {
  status?: string;
}

const statusFilterLabels: Record<string, string> = {
  open: "Abierta", in_progress: "En Progreso", waiting_user: "Esp. Usuario",
  resolved: "Resuelta", closed: "Cerrada", rejected: "Rechazada",
};

const {
  page, limit, search, filters, data: requests, total, totalPages,
  loading, error, activeFilterChips, setFilter, clearFilter, refetch,
} = useListQuery<Request, RequestFilters>(
  async (params) => {
    const res = isAdmin.value ? await requestApi.getAll(params) : await requestApi.getMine(params);
    return res.data;
  },
  {
    initialFilters: { status: undefined },
    filterLabels: { status: (v) => `Estado: ${statusFilterLabels[v] ?? v}` },
  }
);

onMounted(refetch);
```

Eliminar el `onMounted(fetchRequests)` anterior (queda reemplazado por `onMounted(refetch)` de arriba). Todas las demás funciones (`createRequest`, `openEditModal`, `updateRequest`, `openDeleteModal`, `confirmDelete`, `openDetail`, `isOwner`, `canEdit`, `canDelete`) se mantienen sin cambios, salvo que `createRequest`/`updateRequest`/`confirmDelete` deben llamar a `refetch()` en vez de la vieja `fetchRequests()` donde corresponda (buscar esas 3 llamadas y reemplazar el nombre de función).

- [ ] **Step 3: Agregar la barra de búsqueda + chips en el template**

Insertar justo debajo del header (`<div class="flex justify-between items-start">...</div>`) y antes del bloque `<div v-if="error" ...>`:

```vue
<div class="flex flex-col sm:flex-row gap-3 sm:items-center">
  <div class="relative flex-1 max-w-sm">
    <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
    <input
      v-model="search"
      placeholder="Buscar solicitud..."
      class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
  <select
    :value="filters.status ?? ''"
    @change="setFilter('status', ($event.target as HTMLSelectElement).value || undefined)"
    class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="">Todos los estados</option>
    <option value="open">Abierta</option>
    <option value="in_progress">En Progreso</option>
    <option value="waiting_user">Esp. Usuario</option>
    <option value="resolved">Resuelta</option>
    <option value="closed">Cerrada</option>
    <option value="rejected">Rechazada</option>
  </select>
</div>

<div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
  <span
    v-for="chip in activeFilterChips" :key="chip.key"
    class="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-xs px-3 py-1"
  >
    {{ chip.label }}
    <button @click="clearFilter(chip.key as keyof typeof filters)" class="hover:text-primary-900 dark:hover:text-primary-200">✕</button>
  </span>
</div>
```

- [ ] **Step 4: Agregar `<Pagination>` al final del listado**

Insertar justo antes del cierre del `<div class="space-y-6">` raíz (después de las secciones de tabla desktop y cards mobile, antes de los modales):

```vue
<Pagination
  v-if="!loading && requests.length > 0"
  :page="page"
  :limit="limit"
  :total="total"
  :total-pages="totalPages"
  @update:page="page = $event"
  @update:limit="limit = $event"
/>
```

- [ ] **Step 5: Ajustar el empty-state para reflejar filtros activos**

En el `<tr v-if="requests.length === 0">` (tabla desktop) y su equivalente mobile, cambiar el texto condicionalmente:

```vue
{{ search || filters.status ? "No hay solicitudes con estos filtros." : "No hay solicitudes registradas." }}
```

- [ ] **Step 6: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 7: Verificar en el preview**

Navegar a `/dashboard/requests`. Confirmar: la lista carga paginada (10 por página inicialmente, con 280 solicitudes de demo debería mostrar "Página 1 de 28"), escribir en el buscador y confirmar que tras ~300ms se filtra, seleccionar un estado y confirmar que aparece el chip removible y la lista se filtra, hacer clic en la "✕" del chip y confirmar que vuelve a la lista completa, cambiar el selector de tamaño a 50 y confirmar que se recalcula `totalPages`, navegar con Anterior/Siguiente.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/dashboard/RequestsView.vue
git commit -m "feat(frontend): RequestsView usa busqueda, filtro de estado y paginacion real"
```

---

### Task 8: `ManageRequestsView.vue` — búsqueda + filtro de estado + filtro de agente + paginación

**Files:**
- Modify: `frontend/src/views/dashboard/ManageRequestsView.vue`

**Interfaces:**
- Consumes: `Pagination.vue` (Task 4), `useListQuery` (Task 5), `requestApi.getAll` con el nuevo shape (Task 6).

- [ ] **Step 1: Leer el archivo actual completo**

Confirmar el estado exacto — ya usa `StatusBadge`/`PriorityBadge`/`BaseButton`/`counters` (contadores por estado, que **se mantienen**, son un filtro rápido visual complementario, no se reemplazan).

- [ ] **Step 2: Reemplazar `loadRequests` por `useListQuery`, mantener `loadUsers`**

Importar `Pagination`, `useListQuery`, `MagnifyingGlassIcon` igual que en la Task 7.

Quitar `requests`, `loading`, `error`, `filterStatus`, `filterPriority`, `filtered` (el `computed` de filtro en memoria) y la función `loadRequests`. **Mantener** `users`, `loadUsers`, `getUserName` sin cambios (siguen usándose para el selector "Asignar a" del modal de gestión y ahora también para el nuevo filtro de agente).

```ts
interface ManageFilters {
  status?: string;
  assignedTo?: string;
}

const statusFilterLabels: Record<string, string> = {
  open: "Abierta", in_progress: "En Progreso", waiting_user: "Esp. Usuario",
  resolved: "Resuelta", closed: "Cerrada", rejected: "Rechazada",
};

const {
  page, limit, search, filters, data: requests, total, totalPages,
  loading, error, activeFilterChips, setFilter, clearFilter, refetch,
} = useListQuery<Request, ManageFilters>(
  async (params) => (await requestApi.getAll(params)).data,
  {
    initialFilters: { status: undefined, assignedTo: undefined },
    filterLabels: {
      status: (v) => `Estado: ${statusFilterLabels[v] ?? v}`,
      assignedTo: (v) => `Agente: ${getUserName(v)}`,
    },
  }
);

onMounted(async () => {
  if (!canManage.value) { router.push("/dashboard"); return; }
  await loadUsers();
  await refetch();
});
```

(Reemplaza el `onMounted` existente que llamaba `Promise.all([loadRequests(), loadUsers()])` — ahora `loadUsers` primero para que `getUserName` esté listo antes de que el composable arme los chips.)

Los contadores (`counters`, calculados hoy sobre `requests.filter(...)`) **cambian de fuente de datos**: hoy cuentan sobre el array ya cargado (que con paginación real solo tendría la página actual, no el total — esto rompería los contadores). Reemplazar el cálculo de cada contador para que, al hacer clic, en vez de filtrar en memoria, llame a `setFilter('status', c.status)` (o `clearFilter('status')` si ya estaba activo ese filtro) — los contadores dejan de mostrar un conteo en vivo del array cargado y pasan a ser botones de acceso rápido al filtro de estado (incluir el número real requeriría una llamada adicional de conteo por estado, fuera de alcance de esta tarea; en su lugar, mostrar el contador solo mientras `filters.status` coincide con ese estado usando `total` de la respuesta ya cargada, o remover el número y dejar solo la etiqueta+color como acceso rápido). Implementación concreta:

```vue
<div
  v-for="c in counters" :key="c.status"
  :class="[c.bg, c.color, 'border-l-4 rounded-xl p-3 flex flex-col gap-0.5 cursor-pointer transition-opacity', filters.status === c.status ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100']"
  @click="filters.status === c.status ? clearFilter('status') : setFilter('status', c.status)"
>
  <span :class="[c.num, 'text-xl font-bold leading-none']">
    {{ filters.status === c.status ? total : '—' }}
  </span>
  <span class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ c.label }}</span>
</div>
```

(Cuando el contador no es el filtro activo, muestra `—` en vez de un número potencialmente incorrecto — es preferible a mostrar un conteo desactualizado del array paginado. Cuando SÍ es el filtro activo, `total` ya es el conteo real filtrado por ese estado, gracias al backend.)

- [ ] **Step 3: Reemplazar los `<select>` de filtro existentes por los nuevos controlados por el composable**

El template ya tiene `<select v-model="filterStatus">` y `<select v-model="filterPriority">` con un botón "Limpiar filtros" — **quitar el de `filterPriority`** (no estaba en el alcance pedido: solo estado + agente para Gestionar) y cambiar el de estado para usar `filters`/`setFilter` en vez de `filterStatus`:

```vue
<div class="flex flex-wrap gap-2 items-center">
  <div class="relative flex-1 max-w-xs">
    <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
    <input
      v-model="search"
      placeholder="Buscar ticket..."
      class="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-400"
    />
  </div>
  <select
    :value="filters.status ?? ''"
    @change="setFilter('status', ($event.target as HTMLSelectElement).value || undefined)"
    class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-400"
  >
    <option value="">Todos los estados</option>
    <option value="open">Abierta</option>
    <option value="in_progress">En Progreso</option>
    <option value="waiting_user">Esp. Usuario</option>
    <option value="resolved">Resuelta</option>
    <option value="closed">Cerrada</option>
    <option value="rejected">Rechazada</option>
  </select>
  <select
    :value="filters.assignedTo ?? ''"
    @change="setFilter('assignedTo', ($event.target as HTMLSelectElement).value || undefined)"
    class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-400"
  >
    <option value="">Todos los agentes</option>
    <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
  </select>
  <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">{{ total }} resultado{{ total !== 1 ? 's' : '' }}</span>
</div>

<div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
  <span
    v-for="chip in activeFilterChips" :key="chip.key"
    class="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-xs px-3 py-1"
  >
    {{ chip.label }}
    <button @click="clearFilter(chip.key as keyof typeof filters)" class="hover:text-primary-900 dark:hover:text-primary-200">✕</button>
  </span>
</div>
```

Quitar el bloque viejo `<select v-model="filterStatus">...<select v-model="filterPriority">...<button @click="filterStatus='all'...">Limpiar filtros</button>` completo (ya reemplazado arriba).

- [ ] **Step 4: Reemplazar todos los usos de `filtered` por `requests` en el template**

La tabla desktop y las cards mobile iteran hoy `v-for="r in filtered"` — cambiar a `v-for="r in requests"` en ambos bloques (la paginación/filtrado ya ocurre en el backend, `requests` ya viene filtrado y paginado).

- [ ] **Step 5: Agregar `<Pagination>`**

Igual que en la Task 7, insertar antes de los modales:

```vue
<Pagination
  v-if="!loading && requests.length > 0"
  :page="page" :limit="limit" :total="total" :total-pages="totalPages"
  @update:page="page = $event"
  @update:limit="limit = $event"
/>
```

- [ ] **Step 6: Ajustar el empty-state**

Cambiar el texto de "No hay solicitudes con estos filtros." (ya existente, revisar que siga siendo condicionalmente correcto ahora que la condición de "hay filtros" incluye `search`/`filters.assignedTo`, no solo `filterStatus`/`filterPriority`).

- [ ] **Step 7: Actualizar las llamadas a `loadRequests()` restantes**

`openModal`/`save`/`openDeleteModal`/`confirmDelete` llaman a `loadRequests()` tras cada mutación — reemplazar esas 2-3 llamadas por `refetch()`.

- [ ] **Step 8: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 9: Verificar en el preview**

Navegar a `/dashboard/manage-requests` (como admin). Confirmar: paginación real, búsqueda, filtro de estado (dropdown y contadores clicables), filtro de agente, chips removibles, gestionar/eliminar un ticket sigue funcionando y refresca la lista tras la acción.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/views/dashboard/ManageRequestsView.vue
git commit -m "feat(frontend): ManageRequestsView usa busqueda, filtros y paginacion real"
```

---

### Task 9: `Deletedrequestsview.vue` — búsqueda + filtro de estado + paginación

**Files:**
- Modify: `frontend/src/views/dashboard/Deletedrequestsview.vue`

**Interfaces:**
- Consumes: `Pagination.vue` (Task 4), `useListQuery` (Task 5), `requestApi.getDeleted` con el nuevo shape (Task 6).

- [ ] **Step 1: Leer el archivo actual completo**

Confirmar el estado exacto de `fetchDeleted`, `requests`, `loading`, `error`, `isAdmin` antes de editar — el archivo ya usa `StatusBadge`/`PriorityBadge`/`BaseButton` (sesión de sistema de diseño).

- [ ] **Step 2: Reemplazar `fetchDeleted` por `useListQuery`**

Importar:

```ts
import Pagination from "@/components/ui/Pagination.vue";
import { useListQuery } from "@/composables/useListQuery";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
```

Quitar `requests`, `loading`, `error` y la función `fetchDeleted` existentes. Reemplazar por:

```ts
interface DeletedFilters {
  status?: string;
}

const statusFilterLabels: Record<string, string> = {
  open: "Abierta", in_progress: "En Progreso", waiting_user: "Esp. Usuario",
  resolved: "Resuelta", closed: "Cerrada", rejected: "Rechazada",
};

const {
  page, limit, search, filters, data: requests, total, totalPages,
  loading, error, activeFilterChips, setFilter, clearFilter, refetch,
} = useListQuery<Request, DeletedFilters>(
  async (params) => (await requestApi.getDeleted(params)).data,
  {
    initialFilters: { status: undefined },
    filterLabels: { status: (v) => `Estado: ${statusFilterLabels[v] ?? v}` },
  }
);

onMounted(refetch);
```

(Sin distinción admin/no-admin en el frontend — el backend ya decide `deleted`/`deleted-mine` según `req.user.roles`, igual que hacía la función `getDeleted` del controller antes de esta serie de tareas. **No** se agrega filtro `assignedTo` — fuera de alcance para esta vista según el spec.)

- [ ] **Step 3: Agregar barra de búsqueda + filtro de estado + chips**

Insertar bajo el header (`<div class="flex justify-between items-start">...</div>`), antes del bloque `<div v-if="error" ...>`:

```vue
<div class="flex flex-col sm:flex-row gap-3 sm:items-center">
  <div class="relative flex-1 max-w-sm">
    <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
    <input
      v-model="search"
      placeholder="Buscar solicitud eliminada..."
      class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
  <select
    :value="filters.status ?? ''"
    @change="setFilter('status', ($event.target as HTMLSelectElement).value || undefined)"
    class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="">Todos los estados</option>
    <option value="open">Abierta</option>
    <option value="in_progress">En Progreso</option>
    <option value="waiting_user">Esp. Usuario</option>
    <option value="resolved">Resuelta</option>
    <option value="closed">Cerrada</option>
    <option value="rejected">Rechazada</option>
  </select>
</div>

<div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
  <span
    v-for="chip in activeFilterChips" :key="chip.key"
    class="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-xs px-3 py-1"
  >
    {{ chip.label }}
    <button @click="clearFilter(chip.key as keyof typeof filters)" class="hover:text-primary-900 dark:hover:text-primary-200">✕</button>
  </span>
</div>
```

- [ ] **Step 4: Agregar `<Pagination>`**

Insertar antes del modal de detalle (`<div v-if="showDetailModal" ...>`), después de las secciones de tabla desktop y cards mobile:

```vue
<Pagination
  v-if="!loading && requests.length > 0"
  :page="page" :limit="limit" :total="total" :total-pages="totalPages"
  @update:page="page = $event"
  @update:limit="limit = $event"
/>
```

- [ ] **Step 5: Ajustar el empty-state**

En el `<tr v-if="requests.length === 0">` (tabla desktop) y su equivalente mobile, cambiar el texto:

```vue
{{ search || filters.status ? "No hay solicitudes con estos filtros." : "No hay solicitudes pendientes de purga." }}
```

- [ ] **Step 6: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 7: Verificar en el preview**

Navegar a `/dashboard/deleted-requests`. Confirmar carga paginada, búsqueda, filtro de estado, chips, y que "Ver historial" sigue abriendo el modal de detalle correctamente para un ítem de la página actual.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/dashboard/Deletedrequestsview.vue
git commit -m "feat(frontend): Deletedrequestsview usa busqueda, filtro de estado y paginacion real"
```

---

### Task 10: `RolesView.vue` — búsqueda + paginación

**Files:**
- Modify: `frontend/src/views/dashboard/RolesView.vue`

**Interfaces:**
- Consumes: `Pagination.vue` (Task 4), `useListQuery` (Task 5), `roleApi.getAll` con el nuevo shape (Task 6).

- [ ] **Step 1: Leer el archivo actual completo**

Ya usa `BaseButton`/`BaseInput` (de la sesión de sistema de diseño). Confirmar estado exacto de `fetchRoles`, `roles`, el modal de permisos (que usa `roleApi.getAll()` indirectamente a través de `roles` para resolver `selectedRole`).

- [ ] **Step 2: Reemplazar `fetchRoles` por `useListQuery`**

```ts
import Pagination from "@/components/ui/Pagination.vue";
import { useListQuery } from "@/composables/useListQuery";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

const {
  page, limit, search: roleSearch, data: roles, total, totalPages,
  loading, error, refetch,
} = useListQuery<Role, Record<string, never>>(
  async (params) => (await roleApi.getAll(params)).data,
  { initialFilters: {}, filterLabels: {} }
);

onMounted(refetch);
```

Nota: la vista ya tiene una variable local `searchPerm` (para el buscador de permisos DENTRO del modal de asignar permisos, no relacionada con este cambio) — usar el nombre `roleSearch` para el nuevo campo de búsqueda de roles y evitar colisión de nombres.

Reemplazar el `onMounted(() => { fetchRoles(); fetchPermissions(); })` existente por:

```ts
onMounted(() => {
  refetch();
  fetchPermissions();
});
```

Las llamadas a `fetchRoles()` dentro de `createRole`/`updateRole`/`deleteRole` (tras cada mutación) se reemplazan por `refetch()`.

- [ ] **Step 3: Agregar barra de búsqueda (sin filtros adicionales, según el spec)**

Insertar bajo el header, antes del bloque "Nuevo Rol" o después (decisión del implementador, mantener el orden visual lógico: buscador arriba de la tabla):

```vue
<div class="relative max-w-sm">
  <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
  <input
    v-model="roleSearch"
    placeholder="Buscar rol..."
    class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
  />
</div>
```

- [ ] **Step 4: Agregar `<Pagination>`**

Insertar después de las secciones de tabla/cards, antes de los modales:

```vue
<Pagination
  v-if="!loading && roles.length > 0"
  :page="page" :limit="limit" :total="total" :total-pages="totalPages"
  @update:page="page = $event"
  @update:limit="limit = $event"
/>
```

- [ ] **Step 5: Ajustar empty-state**

`{{ roleSearch ? "No se encontraron roles con esa búsqueda." : "No hay roles creados." }}` en el `<tr v-if="roles.length === 0">` y su equivalente mobile.

- [ ] **Step 6: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 7: Verificar en el preview**

Navegar a `/dashboard/roles`. Confirmar paginación (con solo 2 roles en el seed actual, probar creando un rol de prueba para ver "Página 1 de 1" con `limit=10` no cambia mucho — verificar al menos que el componente `Pagination` se renderiza sin errores con pocos datos), búsqueda por nombre, que crear/editar/eliminar un rol sigue funcionando y refresca la lista, que el modal de permisos (con su propio buscador `searchPerm` interno) sigue funcionando sin interferencia del nuevo `roleSearch`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/dashboard/RolesView.vue
git commit -m "feat(frontend): RolesView usa busqueda y paginacion real"
```

---

### Task 11: `PermissionsView.vue` — migrar al paginador compartido

**Files:**
- Modify: `frontend/src/views/dashboard/PermissionsView.vue`

**Interfaces:**
- Consumes: `Pagination.vue` (Task 4). **No** requiere `useListQuery` — `PermissionsView` ya tiene su propia lógica de paginación/búsqueda funcional contra un backend que ya soportaba esto desde antes; esta tarea solo reemplaza el **paginador visual** (botones numerados → `Pagination.vue`), sin tocar la lógica de datos existente.

- [ ] **Step 1: Leer el archivo actual completo**

Confirmar el estado exacto de `fetchPermissions`, `currentPage`, `totalPages`, `total`, `limit`, `pageNumbers` (el `computed` que arma los botones numerados — se elimina), y el bloque de paginación en el template (líneas con `<div v-if="totalPages > 1">...<button v-for="page in pageNumbers">`).

- [ ] **Step 2: Agregar el selector de tamaño de página (no existía)**

`limit` ya es un `ref(10)` fijo sin UI para cambiarlo — se conecta ahora al nuevo `<Pagination>` vía `v-model`. Como `fetchPermissions(page)` ya construye la llamada con `limit.value` internamente (revisar la firma real: `permissionApi.getAll(page, limit.value, search.value, sort.value, order.value)`), agregar un handler para cuando `Pagination` emite `update:limit`:

```ts
const onLimitChange = (newLimit: number) => {
  limit.value = newLimit;
  fetchPermissions(1);
};
```

- [ ] **Step 3: Reemplazar el bloque de paginación en el template**

Quitar completamente:

```vue
<div v-if="totalPages > 1" class="flex justify-between items-center pt-4">
  <span class="text-sm text-gray-500 dark:text-gray-400">Página {{ currentPage }} de {{ totalPages }}</span>
  <div class="flex gap-2">
    <button v-for="page in pageNumbers" :key="page" @click="fetchPermissions(page)" ...>{{ page }}</button>
  </div>
</div>
```

Reemplazar por:

```vue
<Pagination
  v-if="!loading && permissions.length > 0"
  :page="currentPage"
  :limit="limit"
  :total="total"
  :total-pages="totalPages"
  @update:page="fetchPermissions($event)"
  @update:limit="onLimitChange"
/>
```

Quitar el `computed` `pageNumbers` del `<script setup>` (ya no se usa) y su import si quedó huérfano.

- [ ] **Step 4: Agregar el import de `Pagination`**

```ts
import Pagination from "@/components/ui/Pagination.vue";
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 6: Verificar en el preview**

Navegar a `/dashboard/permissions` (19 permisos en el seed actual → con `limit=10` da 2 páginas). Confirmar: "Mostrando 1-10 de 19", botones Anterior/Siguiente funcionan igual que antes (antes navegaban por número, ahora por Anterior/Siguiente — comportamiento distinto, confirmado y aceptado), el nuevo selector de tamaño de página (10/20/50) funciona y al elegir 20 se ve todo en una sola página, la búsqueda existente (`search`) sigue funcionando exactamente igual que antes (no se tocó esa lógica).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/dashboard/PermissionsView.vue
git commit -m "refactor(frontend): PermissionsView migra a Pagination compartido"
```

---

### Task 12: `UsersView.vue` — búsqueda + filtro de rol + filtro de estado + paginación

**Files:**
- Modify: `frontend/src/views/dashboard/UsersView.vue`

**Interfaces:**
- Consumes: `Pagination.vue` (Task 4), `useListQuery` (Task 5), `userApi.getAll` con el nuevo shape (Task 6), `roleApi.getAll` (ya usado por esta vista para el `<select>` de rol del modal de edición — se reutiliza también para el nuevo filtro de rol).

- [ ] **Step 1: Leer el archivo actual completo**

Confirmar estado exacto — esta vista tiene el mismo gap real que se corrigió en el sistema de diseño (usa `BaseButton`), pero **no tiene vista mobile** (`<div class="hidden md:block ...">` sin equivalente `md:hidden`) — esto es un gap preexistente NO relacionado con esta tarea; no corregirlo aquí (fuera de alcance), solo advertirlo en el reporte si se nota.

- [ ] **Step 2: Reemplazar `fetchUsers` por `useListQuery`**

```ts
import Pagination from "@/components/ui/Pagination.vue";
import { useListQuery } from "@/composables/useListQuery";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

interface UserFilters {
  role?: string;
  is_active?: string; // "true" | "false" como string para el <select>, se convierte antes de llegar al backend
}

const {
  page, limit, search, filters, data: users, total, totalPages,
  loading, error, activeFilterChips, setFilter, clearFilter, refetch,
} = useListQuery<User, UserFilters>(
  async (params) => {
    const { is_active, ...rest } = params;
    const apiParams = is_active !== undefined ? { ...rest, is_active: is_active === "true" } : rest;
    return (await userApi.getAll(apiParams)).data;
  },
  {
    initialFilters: { role: undefined, is_active: undefined },
    filterLabels: {
      role: (v) => `Rol: ${v}`,
      is_active: (v) => `Estado: ${v === "true" ? "Activo" : "Inactivo"}`,
    },
  }
);

onMounted(() => {
  refetch();
  fetchRoles();
});
```

(`fetchRoles` ya existente se mantiene igual — sigue llenando `roles` para el `<select>` del modal de edición, y ahora también para el nuevo filtro.)

Reemplazar el `onMounted(async () => { await fetchUsers(); await fetchRoles(); })` existente por el bloque de arriba. Las llamadas a `fetchUsers()` dentro de `updateUser`/`deleteUser` (tras cada mutación) se reemplazan por `refetch()`.

- [ ] **Step 3: Agregar barra de búsqueda + filtros + chips**

Insertar bajo el `<h1>`:

```vue
<div class="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
  <div class="relative flex-1 max-w-sm">
    <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
    <input
      v-model="search"
      placeholder="Buscar usuario..."
      class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
  <select
    :value="filters.role ?? ''"
    @change="setFilter('role', ($event.target as HTMLSelectElement).value || undefined)"
    class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="">Todos los roles</option>
    <option v-for="r in roles" :key="r.id" :value="r.name">{{ r.name }}</option>
  </select>
  <select
    :value="filters.is_active ?? ''"
    @change="setFilter('is_active', ($event.target as HTMLSelectElement).value || undefined)"
    class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="">Todos los estados</option>
    <option value="true">Activo</option>
    <option value="false">Inactivo</option>
  </select>
</div>

<div v-if="activeFilterChips.length" class="flex flex-wrap gap-2 mb-4">
  <span
    v-for="chip in activeFilterChips" :key="chip.key"
    class="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-xs px-3 py-1"
  >
    {{ chip.label }}
    <button @click="clearFilter(chip.key as keyof typeof filters)" class="hover:text-primary-900 dark:hover:text-primary-200">✕</button>
  </span>
</div>
```

- [ ] **Step 4: Agregar `<Pagination>`**

Insertar después de la tabla, antes del modal de edición:

```vue
<Pagination
  v-if="!loading && users.length > 0"
  :page="page" :limit="limit" :total="total" :total-pages="totalPages"
  @update:page="page = $event"
  @update:limit="limit = $event"
/>
```

- [ ] **Step 5: Empty-state**

Agregar un `<tr v-if="users.length === 0">` (no existía ninguno antes — la tabla solo mostraba `loading`/`error`, sin estado vacío explícito):

```vue
<tr v-if="!loading && users.length === 0">
  <td colspan="6" class="p-8 text-center text-gray-400 dark:text-gray-500">
    <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
    {{ search || filters.role || filters.is_active ? "No hay usuarios con estos filtros." : "No hay usuarios registrados." }}
  </td>
</tr>
```

Agregar el import de `InboxIcon` desde `@heroicons/vue/24/outline` si no está ya importado.

- [ ] **Step 6: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 7: Verificar en el preview**

Navegar a `/dashboard/users`. Confirmar carga paginada, búsqueda por nombre/email, filtro de rol, filtro de estado activo/inactivo, chips removibles, editar/eliminar un usuario sigue funcionando y refresca la lista.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/dashboard/UsersView.vue
git commit -m "feat(frontend): UsersView usa busqueda, filtros de rol/estado y paginacion real"
```

---

### Task 13: Verificación final end-to-end

**Files:** ninguno (solo verificación, sin cambios de código).

- [ ] **Step 1: Backend — smoke test consolidado**

Repetir rápidamente los `curl` de las Tasks 1-3 contra el servidor ya corriendo con todo el código final integrado (no solo el estado intermedio de cada tarea), confirmando que ningún cambio posterior rompió un endpoint anterior.

- [ ] **Step 2: Frontend — recorrido de las 6 vistas en modo claro**

Para cada una de `/dashboard/requests`, `/dashboard/manage-requests`, `/dashboard/deleted-requests`, `/dashboard/roles`, `/dashboard/permissions`, `/dashboard/users`: confirmar que carga, pagina, busca (con debounce perceptible, no en cada tecla), filtra, muestra chips removibles donde aplica, y que el empty-state aparece correctamente si se filtra hacia un resultado vacío (ej. buscar un texto que no existe).

- [ ] **Step 3: Recorrido en modo oscuro**

Repetir el Step 2 con el tema en oscuro (usando el toggle ya existente en `DashboardLayout`) — confirmar que la barra de búsqueda, los `<select>` de filtro, los chips y el componente `Pagination` se ven correctamente oscuros (fondos `gray-800`/`gray-900`, sin bloques blancos residuales).

- [ ] **Step 4: Consola sin errores nuevos**

Revisar `read_console_messages` en cada vista — comparar contra el histórico ya conocido de errores 401/Network-Error de sesiones previas (no relacionados). Confirmar que no aparecen errores nuevos de Vue o de red relacionados con los nuevos parámetros de query.

- [ ] **Step 5: Condición de carrera del buscador**

En una vista con datos (`/dashboard/requests` con 280 registros), escribir rápidamente varios caracteres distintos en el buscador sin pausar, y confirmar que el resultado final mostrado corresponde al último texto escrito (no queda "atascado" mostrando el resultado de un texto intermedio) — verifica que el descarte de respuestas obsoletas del composable funciona.

- [ ] **Step 6: Regresión de escritura/mutación**

En al menos 2 de las vistas (ej. `RequestsView` crear una solicitud, `UsersView` editar un usuario), confirmar que la acción sigue funcionando de punta a punta y que la lista se refresca correctamente tras la mutación (sin quedar desactualizada ni perder el filtro/página activos de forma confusa).

(Sin commit en esta tarea — es solo verificación. Si se encuentra algún problema, corregirlo en el archivo correspondiente y hacer un commit de fix antes de continuar.)

---

## Cierre

Al completar la Task 13 sin hallazgos, invocar `superpowers:finishing-a-development-branch` (ya en `master`, sin worktree — ofrecer push a `origin/master` siguiendo el patrón establecido en esta sesión).
