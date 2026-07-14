# Rediseño Visual del Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender la identidad de marca "TicketFlow" (ya establecida en `LoginView.vue`: sidebar/panel `slate-950`, acento índigo, iconos Heroicons) a las 7 pantallas de `/dashboard`, sin tocar lógica de negocio, llamadas a la API, ni tipos.

**Architecture:** Cambios puramente de `<template>` (clases Tailwind + reemplazo de emoji por componentes Heroicons ya instalados). El `<script setup>` de cada archivo solo gana nuevas líneas `import { XIcon } from "@heroicons/vue/24/outline"` — cero cambios a refs, computed, llamadas API o validaciones existentes.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind CSS 4, `@heroicons/vue` (ya en `package.json`, no se agregan dependencias).

## Global Constraints

- Tailwind únicamente — no CSS custom, no nuevas dependencias.
- Acento primario: `indigo-600` (hover `indigo-700` / `indigo-500` sobre fondo oscuro) reemplaza `blue-600` en botones primarios, focus rings, links y estado activo de navegación. Los colores **semánticos** de estado de solicitud (ámbar/azul/violeta/esmeralda/gris/rojo) y prioridad **no cambian** — son información, no decoración.
- Todos los emoji usados como marcador funcional (no como parte de un string de datos) se reemplazan por `@heroicons/vue/24/outline`, tamaño `w-4 h-4` o `w-5 h-5` según contexto, `class="shrink-0"` cuando van junto a texto.
- Ningún cambio de ruta, de props, de emits, ni de lógica en `<script setup>` salvo agregar imports de iconos.
- Verificación de cada tarea: con el preview corriendo (`backend` puerto 3001, `frontend` puerto 5173), navegar a la ruta afectada, confirmar por consola (`read_console_messages`, `onlyErrors: true`) que no hay errores nuevos, y por `read_page`/screenshot que el contenido y las acciones (botones, modales) siguen funcionando.

## Mapa de iconos (reemplazo global de emoji → Heroicons `/24/outline`)

| Emoji | Icono | Uso |
|---|---|---|
| 🏠 | `HomeIcon` | Nav "Dashboard" |
| 📋 | `ClipboardDocumentListIcon` | Nav "Pendientes", historial de cambios |
| 🛠️ | `WrenchScrewdriverIcon` | Nav "Gestionar", técnico asignado |
| 🗑️ | `TrashIcon` | Nav "Eliminadas", botón/ícono eliminar |
| 👥 | `UsersIcon` | Nav "Usuarios" |
| 🎭 | `ShieldCheckIcon` | Nav "Roles" |
| 🔑 | `KeyIcon` | Nav "Permisos" |
| ✅ | `CheckCircleIcon` | Resolución / éxito |
| ⚠️ | `ExclamationTriangleIcon` | Errores, avisos |
| 🔥 | `FireIcon` | Prioridad urgente |
| 📭 | `InboxIcon` | Estado vacío (tablas) |
| 🔒 | `LockClosedIcon` | Solicitud bloqueada (cerrada/rechazada) |
| 👤 | `UserIcon` | Autor / usuario en detalle |
| 📅 | `CalendarDaysIcon` | Fecha en detalle |
| ✕ | `XMarkIcon` | Cerrar modal (ya usado en layout) |
| ⛔ | `NoSymbolIcon` | Acceso denegado (ManageRequestsView) |

---

### Task 1: Shell — `DashboardLayout.vue` (sidebar oscuro, referencia de marca)

**Files:**
- Modify: `frontend/src/layouts/DashboardLayout.vue` (completo)

**Interfaces:**
- Consumes: `useAuthStore()` (`auth.user`, `auth.hasPermission`, `auth.hasRole`, `auth.isAdmin`, `auth.logout`) — sin cambios de firma.
- Produces: patrón visual de referencia (sidebar `slate-950`, glow decorativo, nav con icono + estado activo índigo) que las Tasks 2-7 no repiten pero sí heredan por consistencia visual.

- [ ] **Step 1: Reemplazar el contenido completo de `DashboardLayout.vue`**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  UsersIcon,
  ShieldCheckIcon,
  KeyIcon,
  TicketIcon,
} from "@heroicons/vue/24/outline";

const auth = useAuthStore();
const router = useRouter();
const mobileOpen = ref(false);
const loading = ref(true);

const displayRole = computed<string>(() => {
  const firstRole = auth.user?.roles?.[0];
  if (!firstRole) return "Usuario";
  if (firstRole === "admin") return "Admin";
  if (firstRole === "supervisor") return "Supervisor";
  return firstRole.charAt(0).toUpperCase() + firstRole.slice(1);
});

const canViewUsers = computed(() => auth.hasPermission("users_read") || auth.isAdmin);
const canViewRoles = computed(() => auth.hasPermission("manage_roles") || auth.isAdmin);
const canViewPermissions = computed(() => auth.hasPermission("manage_permissions") || auth.isAdmin);
const canManageRequests = computed(
  () => auth.hasPermission("requests_read.all") || auth.hasRole("supervisor") || auth.isAdmin
);

const navItems = computed(() => [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon, exact: true, show: true },
  { to: "/dashboard/requests", label: "Pendientes", icon: ClipboardDocumentListIcon, exact: false, show: true },
  { to: "/dashboard/manage-requests", label: "Gestionar", icon: WrenchScrewdriverIcon, exact: false, show: canManageRequests.value },
  { to: "/dashboard/deleted-requests", label: "Eliminadas", icon: TrashIcon, exact: false, show: true },
]);

const adminItems = computed(() => [
  { to: "/dashboard/users", label: "Usuarios", icon: UsersIcon, show: canViewUsers.value },
  { to: "/dashboard/roles", label: "Roles", icon: ShieldCheckIcon, show: canViewRoles.value },
  { to: "/dashboard/permissions", label: "Permisos", icon: KeyIcon, show: canViewPermissions.value },
]);

const showAdminSection = computed(() => canViewUsers.value || canViewRoles.value || canViewPermissions.value);

const handleLogout = async () => {
  await auth.logout();
  router.push("/login");
};

onMounted(async () => {
  if (!auth.user && auth.accessToken) {
    await auth.fetchUser();
  }
  loading.value = false;
});
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-500 text-sm">Cargando...</p>
      </div>
    </div>

    <template v-else>
      <!-- SIDEBAR ESCRITORIO -->
      <aside class="hidden md:flex md:flex-col w-72 bg-slate-950 relative overflow-hidden h-screen sticky top-0">
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" aria-hidden="true" />
        <div class="absolute bottom-0 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />

        <div class="relative z-10 flex flex-col h-full">
          <div class="px-6 py-6 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                <TicketIcon class="w-5 h-5 text-white" />
              </div>
              <div class="min-w-0">
                <span class="text-white font-semibold text-base tracking-tight block truncate">TicketFlow</span>
                <span class="text-slate-500 text-xs block truncate">Panel de control</span>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-b border-white/10 flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-semibold shrink-0">
              {{ auth.user?.name?.charAt(0) ?? "U" }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-slate-500 truncate">{{ displayRole }}</p>
            </div>
          </div>

          <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitudes</p>

            <router-link
              v-for="item in navItems.filter(i => i.show)"
              :key="item.to"
              :to="item.to"
              v-slot="{ isActive, isExactActive, navigate }"
            >
              <div
                @click="navigate"
                :class="[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  (item.exact ? isExactActive : isActive)
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                ]"
              >
                <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                {{ item.label }}
              </div>
            </router-link>

            <div v-if="showAdminSection" class="pt-6">
              <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administración</p>

              <router-link
                v-for="item in adminItems.filter(i => i.show)"
                :key="item.to"
                :to="item.to"
                v-slot="{ isActive, navigate }"
              >
                <div
                  @click="navigate"
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  ]"
                >
                  <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                  {{ item.label }}
                </div>
              </router-link>
            </div>
          </nav>

          <div class="p-4 border-t border-white/10">
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeftOnRectangleIcon class="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <!-- MENÚ MÓVIL -->
      <div v-if="mobileOpen" class="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="mobileOpen = false">
        <aside class="w-72 bg-slate-950 h-full shadow-xl relative overflow-hidden" @click.stop>
          <div class="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" aria-hidden="true" />

          <div class="relative z-10 flex flex-col h-full">
            <div class="p-6 flex justify-between items-center border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <TicketIcon class="w-4.5 h-4.5 text-white" />
                </div>
                <span class="text-white font-semibold">TicketFlow</span>
              </div>
              <button @click="mobileOpen = false" class="text-slate-400 hover:text-white transition-colors">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
              <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitudes</p>

              <router-link
                v-for="item in navItems.filter(i => i.show)"
                :key="item.to"
                :to="item.to"
                v-slot="{ isActive, isExactActive, navigate }"
              >
                <div
                  @click="() => { navigate(); mobileOpen = false; }"
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    (item.exact ? isExactActive : isActive) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  ]"
                >
                  <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                  {{ item.label }}
                </div>
              </router-link>

              <div v-if="showAdminSection" class="border-t border-white/10 pt-3 mt-3">
                <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administración</p>

                <router-link
                  v-for="item in adminItems.filter(i => i.show)"
                  :key="item.to"
                  :to="item.to"
                  v-slot="{ isActive, navigate }"
                >
                  <div
                    @click="() => { navigate(); mobileOpen = false; }"
                    :class="[
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    ]"
                  >
                    <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                    {{ item.label }}
                  </div>
                </router-link>
              </div>
            </nav>

            <div class="p-4 border-t border-white/10">
              <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <ArrowLeftOnRectangleIcon class="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>
      </div>

      <!-- CONTENIDO -->
      <main class="flex-1 flex flex-col min-w-0">
        <div class="md:hidden bg-slate-950 px-4 py-3 flex items-center justify-between">
          <button @click="mobileOpen = true" class="text-slate-300 hover:text-white transition-colors">
            <Bars3Icon class="w-6 h-6" />
          </button>
          <div class="flex items-center gap-2">
            <div class="text-right min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ auth.user?.name ?? "TicketFlow" }}</p>
              <p class="text-xs text-slate-500 truncate">{{ displayRole }}</p>
            </div>
            <div class="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-semibold text-sm shrink-0">
              {{ auth.user?.name?.charAt(0) ?? "U" }}
            </div>
          </div>
        </div>

        <div class="flex-1 p-4 md:p-8">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-6 min-h-[80vh]">
            <router-view />
          </div>
        </div>
      </main>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Verificar en el preview**

Con `frontend` corriendo en `http://localhost:5173`, inicia sesión como `admin@empresa.com` / `Admin123*` y confirma:
- El sidebar se ve oscuro (`slate-950`) con el logo "TicketFlow" y glow índigo sutil.
- Los items de navegación muestran icono Heroicons (no emoji) y el activo tiene fondo índigo sólido.
- En viewport angosto (`resize_window` a `mobile`), el botón hamburguesa abre el drawer oscuro y el botón X lo cierra.
- `read_console_messages` con `onlyErrors: true` no muestra errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layouts/DashboardLayout.vue
git commit -m "feat(dashboard): sidebar oscuro con marca TicketFlow e iconos Heroicons"
```

---

### Task 2: `DashboardHome.vue` — stat cards con icono de acento

**Files:**
- Modify: `frontend/src/views/dashboard/DashboardHome.vue`

**Interfaces:**
- Consumes: sin cambios — mismos `stats`, `recentRequests`, `isAdmin`, `loadStats()`.
- Produces: patrón de "stat card con icono" reutilizable visualmente (no como componente separado, YAGNI — son 4 cards, no justifica extraer un componente).

- [ ] **Step 1: Agregar imports de iconos en `<script setup>`**

Al inicio del bloque `<script setup>`, después de los imports existentes, agregar:

```ts
import {
  UsersIcon,
  ShieldCheckIcon,
  KeyIcon,
  ClipboardDocumentListIcon,
  InboxIcon,
} from "@heroicons/vue/24/outline";
```

- [ ] **Step 2: Reemplazar las 4 stat cards (líneas 166-206 del archivo original) por:**

```vue
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">

        <div v-if="isAdmin" class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-400 font-medium">Total Usuarios</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ stats.users }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UsersIcon class="w-5 h-5" />
          </div>
        </div>

        <div v-if="isAdmin" class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-400 font-medium">Total Roles</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ stats.roles }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheckIcon class="w-5 h-5" />
          </div>
        </div>

        <div v-if="isAdmin" class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-400 font-medium">Total Permisos</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ stats.permissions }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <KeyIcon class="w-5 h-5" />
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-start justify-between">
          <div class="min-w-0">
            <p class="text-xs text-gray-400 font-medium">
              {{ isAdmin ? "Total Solicitudes" : "Mis Solicitudes" }}
            </p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ stats.requests.total }}</p>
            <p class="text-xs text-gray-400 mt-1">
              {{ stats.requests.open }} abiertas · {{ stats.requests.in_progress }} en progreso
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ClipboardDocumentListIcon class="w-5 h-5" />
          </div>
        </div>

      </div>
```

- [ ] **Step 3: En la sección "SOLICITUDES RECIENTES", reemplazar el botón de estado vacío**

Buscar:
```vue
        <div v-if="recentRequests.length === 0" class="text-gray-400 text-center py-10">
          No hay solicitudes registradas
        </div>
```

Reemplazar por:
```vue
        <div v-if="recentRequests.length === 0" class="flex flex-col items-center text-gray-400 text-center py-10 gap-2">
          <InboxIcon class="w-8 h-8 text-gray-300" />
          No hay solicitudes registradas
        </div>
```

- [ ] **Step 4: Reemplazar el color del link final "Ver todas las solicitudes"**

Buscar `class="block text-center text-sm md:text-base text-blue-600 hover:text-blue-700 font-medium"` y cambiar a `class="block text-center text-sm md:text-base text-indigo-600 hover:text-indigo-700 font-medium"`.

- [ ] **Step 5: Verificar en el preview**

Navegar a `/dashboard` como admin: las 4 stat cards muestran icono en un cuadro `indigo-50`/`indigo-600`; sin datos de solicitudes recientes se ve el icono `InboxIcon`. Repetir login como usuario regular (rol `user`) y confirmar que solo se ve la card de "Mis Solicitudes" (comportamiento sin cambios, solo visual). Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/dashboard/DashboardHome.vue
git commit -m "feat(dashboard): stat cards con icono de acento indigo"
```

---

### Task 3: `RequestsView.vue` — badges, botones y modales

**Files:**
- Modify: `frontend/src/views/dashboard/RequestsView.vue`

**Interfaces:** sin cambios de `<script setup>` salvo imports de iconos.

- [ ] **Step 1: Agregar imports de iconos**

```ts
import {
  ExclamationTriangleIcon,
  InboxIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";
```

- [ ] **Step 2: Botón "+ Nueva" — cambiar acento**

Buscar:
```vue
        <button
          @click="showCreateModal = true"
          class="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + Nueva
        </button>
```
Reemplazar `bg-blue-600` → `bg-indigo-600` y `hover:bg-blue-700` → `hover:bg-indigo-700`.

- [ ] **Step 3: Banner de error — icono en vez de emoji**

Buscar:
```vue
    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
      ⚠️ {{ error }}
    </div>
```
Reemplazar por:
```vue
    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
    </div>
```

- [ ] **Step 4: Fila vacía de la tabla (desktop) — icono en vez de emoji**

Buscar:
```vue
              <tr v-if="requests.length === 0">
                <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                  📭 No hay solicitudes registradas.
                </td>
              </tr>
```
Reemplazar por:
```vue
              <tr v-if="requests.length === 0">
                <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                  <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No hay solicitudes registradas.
                </td>
              </tr>
```

- [ ] **Step 5: Botones "Editar/Guardar/Crear" en tabla, cards móviles y modales — acento índigo**

Reemplazar todas las ocurrencias de `bg-blue-600 text-white` (botones "Editar", "Crear", "Guardar") por `bg-indigo-600 text-white`, y sus `hover:bg-blue-700` por `hover:bg-indigo-700`. Ocurre en: botón "Editar" de la tabla desktop, botón "Editar" de las cards móviles, botón "Crear" del modal de creación, botón "Guardar" del modal de edición.

- [ ] **Step 6: Icono en el header del modal de eliminar**

Buscar:
```vue
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg">
            🗑️
          </div>
```
Reemplazar por:
```vue
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <TrashIcon class="w-5 h-5" />
          </div>
```

- [ ] **Step 7: Icono de error en textarea de motivo de eliminación**

Buscar `<p v-if="deleteError" class="text-red-500 text-xs mb-3">⚠️ {{ deleteError }}</p>` y reemplazar por:
```vue
        <p v-if="deleteError" class="text-red-500 text-xs mb-3 flex items-center gap-1">
          <ExclamationTriangleIcon class="w-3.5 h-3.5 shrink-0" /> {{ deleteError }}
        </p>
```

- [ ] **Step 8: Sección de resolución e historial en el modal de detalle**

Buscar:
```vue
          <div v-if="detailRequest?.resolution" class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p class="text-emerald-800 font-semibold text-sm mb-1">✅ Resolución</p>
            <p class="text-emerald-700 text-sm">{{ detailRequest?.resolution }}</p>
          </div>
```
Reemplazar por:
```vue
          <div v-if="detailRequest?.resolution" class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p class="text-emerald-800 font-semibold text-sm mb-1 flex items-center gap-1.5">
              <CheckCircleIcon class="w-4 h-4" /> Resolución
            </p>
            <p class="text-emerald-700 text-sm">{{ detailRequest?.resolution }}</p>
          </div>
```

Y buscar `<h3 class="text-sm font-semibold text-gray-700 mb-3">📋 Historial de cambios</h3>`, reemplazar por:
```vue
        <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <ClipboardDocumentListIcon class="w-4 h-4" /> Historial de cambios
        </h3>
```

- [ ] **Step 9: Focus rings de inputs/selects/textarea — índigo**

En los 3 modales (crear, editar, eliminar), todos los `focus:ring-2 focus:ring-blue-400`/`focus:ring-blue-500` (si los hubiera) deben quedar `focus:ring-indigo-400`. Nota: en este archivo los inputs de los modales de crear/editar no usan `focus:ring` explícito (usan solo `border`); dejar como están — no hay que agregar estilos nuevos, solo convertir los que ya existen.

- [ ] **Step 10: Verificar en el preview**

Como usuario regular con una solicitud propia abierta: crear una solicitud (botón índigo), verla en detalle, editarla, eliminarla con motivo — confirmar que cada paso sigue funcionando igual y que los colores/iconos cambiaron. Sin errores de consola.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/views/dashboard/RequestsView.vue
git commit -m "feat(dashboard): acento indigo e iconos Heroicons en RequestsView"
```

---

### Task 4: `ManageRequestsView.vue` — panel de gestión

**Files:**
- Modify: `frontend/src/views/dashboard/ManageRequestsView.vue`

- [ ] **Step 1: Agregar imports de iconos**

```ts
import {
  NoSymbolIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  UserIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/vue/24/outline";
```

- [ ] **Step 2: Pantalla de "Acceso Denegado"**

Buscar:
```vue
  <div v-if="!canManage" class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="text-5xl">⛔</div>
    <h2 class="text-xl font-bold text-gray-700">Acceso Denegado</h2>
    <p class="text-gray-400 text-sm">No tienes permisos para gestionar tickets.</p>
  </div>
```
Reemplazar por:
```vue
  <div v-if="!canManage" class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="w-16 h-16 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center">
      <NoSymbolIcon class="w-8 h-8" />
    </div>
    <h2 class="text-xl font-bold text-gray-700">Acceso Denegado</h2>
    <p class="text-gray-400 text-sm">No tienes permisos para gestionar tickets.</p>
  </div>
```

- [ ] **Step 3: Banner de error**

Buscar `<span>⚠️</span> {{ error }}` y reemplazar por `<ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}`.

- [ ] **Step 4: Selects de filtro y focus rings — índigo**

Reemplazar en los dos `<select>` de filtro: `focus:ring-2 focus:ring-blue-400` → `focus:ring-2 focus:ring-indigo-400` (2 ocurrencias).

- [ ] **Step 5: Botón "Gestionar" (tabla y cards móviles) — acento índigo**

Reemplazar las 2 ocurrencias de `bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors whitespace-nowrap` (tabla) y `flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors` (móvil) cambiando `blue` → `indigo`.

- [ ] **Step 6: Filas/estados vacíos con icono**

Buscar las 2 ocurrencias de:
```vue
                  <div class="text-3xl mb-2">📭</div>
                  <p class="text-gray-400 text-sm">No hay solicitudes con estos filtros.</p>
```
Reemplazar por:
```vue
                  <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p class="text-gray-400 text-sm">No hay solicitudes con estos filtros.</p>
```
(Ajustar la indentación/etiqueta contenedora según el contexto exacto de cada una — una está dentro de `<td>`, la otra dentro de un `<div>`, mantener el tag contenedor existente.)

- [ ] **Step 7: Metadatos del ticket en el modal — iconos en vez de emoji**

Buscar:
```vue
              <span class="text-xs text-gray-400">👤 {{ current?.email }}</span>
              <span class="text-xs text-gray-400">📅 {{ current ? new Date(current.created_at).toLocaleString("es-ES") : "" }}</span>
              <span class="text-xs text-gray-400">🔧 {{ getUserName(current?.assigned_to) }}</span>
```
Reemplazar por:
```vue
              <span class="text-xs text-gray-400 flex items-center gap-1"><UserIcon class="w-3.5 h-3.5" /> {{ current?.email }}</span>
              <span class="text-xs text-gray-400 flex items-center gap-1"><CalendarDaysIcon class="w-3.5 h-3.5" /> {{ current ? new Date(current.created_at).toLocaleString("es-ES") : "" }}</span>
              <span class="text-xs text-gray-400 flex items-center gap-1"><WrenchScrewdriverIcon class="w-3.5 h-3.5" /> {{ getUserName(current?.assigned_to) }}</span>
```
Ajustar el `div` padre de `flex flex-wrap gap-x-4 gap-y-1 pt-1` a `flex flex-wrap gap-x-4 gap-y-1.5 pt-1 items-center` si es necesario para alinear icono+texto.

- [ ] **Step 8: Bloque "Solicitud bloqueada"**

Buscar:
```vue
          <div v-if="isLocked" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <span class="text-2xl">🔒</span>
```
Reemplazar el `<span>` por:
```vue
            <div class="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
              <LockClosedIcon class="w-4.5 h-4.5" />
            </div>
```

- [ ] **Step 9: Focus rings de selects/textarea del modal — índigo**

Reemplazar las ocurrencias de `focus:ring-2 focus:ring-blue-400 focus:border-transparent` (selects de estado/prioridad/asignar, textarea de resolución) por `focus:ring-2 focus:ring-indigo-400 focus:border-transparent` (4 ocurrencias).

- [ ] **Step 10: Botón "Ver historial de cambios" — icono**

Buscar:
```vue
              <span class="flex items-center gap-2 font-medium">
                <span>📋</span>
                <span>{{ historyLoading ? "Cargando..." : showHistory ? "Actualizar historial" : "Ver historial de cambios" }}</span>
              </span>
```
Reemplazar el primer `<span>📋</span>` por `<ClipboardDocumentListIcon class="w-4 h-4" />`.

- [ ] **Step 11: Botón "Guardar Cambios" y botones del modal de eliminar — acento índigo**

Reemplazar `bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700` (botón Guardar Cambios) → `bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700`.

- [ ] **Step 12: Modal de eliminar — icono de papelera y advertencia**

Buscar `<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">🗑️</div>` → reemplazar por `<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500"><TrashIcon class="w-5 h-5" /></div>`.

Buscar `<span class="text-amber-500 mt-0.5">⚠️</span>` → reemplazar por `<ExclamationTriangleIcon class="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />`.

Reemplazar el `focus:ring-2 focus:ring-red-400` del textarea de motivo — **sin cambios** (rojo es correcto aquí, es una acción destructiva).

- [ ] **Step 13: Verificar en el preview**

Como admin: abrir "Gestionar", aplicar filtros de estado/prioridad, abrir el modal de un ticket, ver historial, guardar cambios, eliminar un ticket con motivo. Confirmar iconos visibles y sin errores de consola.

- [ ] **Step 14: Commit**

```bash
git add frontend/src/views/dashboard/ManageRequestsView.vue
git commit -m "feat(dashboard): acento indigo e iconos Heroicons en ManageRequestsView"
```

---

### Task 5: `RolesView.vue`

**Files:**
- Modify: `frontend/src/views/dashboard/RolesView.vue`

- [ ] **Step 1: Agregar imports de iconos**

```ts
import { ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/vue/24/outline";
```

- [ ] **Step 2: Botón "Crear Rol" y focus rings — índigo**

Reemplazar `bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700` → `bg-indigo-600 ... hover:bg-indigo-700`. Reemplazar las 2 ocurrencias de `focus:ring-2 focus:ring-blue-400 focus:border-transparent` (inputs de nombre/descripción) → `focus:ring-indigo-400`.

- [ ] **Step 3: Banner de error**

Buscar `<span>⚠️</span> {{ error }}` → `<ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}`.

- [ ] **Step 4: Fila vacía de la tabla**

Buscar:
```vue
                <div class="text-3xl mb-2">🎭</div>
                <p class="text-gray-400 text-sm">No hay roles creados.</p>
```
Reemplazar el `<div>` por `<ShieldCheckIcon class="w-8 h-8 mx-auto mb-2 text-gray-300" />`.

- [ ] **Step 5: Botón "Editar" (tabla y cards móviles) y modal editar/permisos — índigo**

Reemplazar todas las ocurrencias de `bg-blue-600 ... hover:bg-blue-700` (botón "Editar" en tabla y móvil, botón "Guardar" del modal editar, botón "Asignar" del modal de permisos) por `bg-indigo-600 ... hover:bg-indigo-700`. Reemplazar los `focus:ring-2 focus:ring-blue-400` restantes (inputs del modal editar, buscador de permisos) por `focus:ring-indigo-400`.

- [ ] **Step 6: Verificar en el preview**

Como admin: crear un rol de prueba, editarlo, abrir "Permisos" y asignar/quitar uno, eliminarlo. Confirmar acento índigo consistente y sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/dashboard/RolesView.vue
git commit -m "feat(dashboard): acento indigo e iconos Heroicons en RolesView"
```

---

### Task 6: `PermissionsView.vue`

**Files:**
- Modify: `frontend/src/views/dashboard/PermissionsView.vue`

- [ ] **Step 1: Agregar import de icono**

```ts
import { InboxIcon } from "@heroicons/vue/24/outline";
```

(El banner de error de este archivo usa `⚠️ {{ error }}` como texto plano sin `<span>` — ver Step 3.)

- [ ] **Step 2: Botón "+ Nuevo" — índigo**

Reemplazar `bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700` → `bg-indigo-600 ... hover:bg-indigo-700`.

- [ ] **Step 3: Banner de error**

Buscar:
```vue
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
    >
      ⚠️ {{ error }}
    </div>
```
Agregar import `ExclamationTriangleIcon` a la lista del Step 1 y reemplazar el emoji:
```vue
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
    >
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
    </div>
```

- [ ] **Step 4: Fila vacía de la tabla**

Buscar:
```vue
                  <div class="text-3xl mb-2">📭</div>
                  <p class="text-gray-400 text-sm">
                    No hay permisos registrados.
                  </p>
```
Reemplazar el `<div>` por `<InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300" />`.

- [ ] **Step 5: Botón "Editar" de la tabla y paginación — índigo**

Reemplazar `bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700` (botón Editar) → `bg-indigo-600 ... hover:bg-indigo-700`. En la paginación, reemplazar `page === currentPage ? 'bg-blue-600 text-white' : ...` → `'bg-indigo-600 text-white'`.

- [ ] **Step 6: Modal crear/editar — inputs y botón Guardar**

Reemplazar los `focus:ring-2 focus:ring-blue-400` de los 2 inputs (nombre, descripción) → `focus:ring-indigo-400`. Reemplazar `bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700` (botón Guardar) → `bg-indigo-600 ... hover:bg-indigo-700`.

- [ ] **Step 7: Verificar en el preview**

Como admin: crear un permiso, editarlo, intentar editar/eliminar uno protegido (`is_protected`, debe seguir bloqueado igual que antes), eliminar el de prueba, paginar si hay más de 10. Sin errores de consola.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/dashboard/PermissionsView.vue
git commit -m "feat(dashboard): acento indigo e iconos Heroicons en PermissionsView"
```

---

### Task 7: `Deletedrequestsview.vue`

**Files:**
- Modify: `frontend/src/views/dashboard/Deletedrequestsview.vue`

- [ ] **Step 1: Agregar imports de iconos**

```ts
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/vue/24/outline";
```

(`CheckCircleIcon` se reutiliza en dos lugares de este archivo: el estado vacío "sin pendientes de purga" y la sección "Resolución" — es el mismo componente en ambos casos, no hace falta un segundo import.)

- [ ] **Step 2: Banner de error**

Buscar `⚠️ {{ error }}` → `<ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}` (envolver en el mismo `<div class="flex items-center gap-3 ...">` que ya existe).

- [ ] **Step 3: Fila vacía "no hay pendientes de purga"**

Buscar:
```vue
              <tr v-if="requests.length === 0">
                <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                  ✅ No hay solicitudes pendientes de purga.
                </td>
              </tr>
```
Reemplazar por:
```vue
              <tr v-if="requests.length === 0">
                <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                  <CheckCircleIcon class="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                  No hay solicitudes pendientes de purga.
                </td>
              </tr>
```

- [ ] **Step 4: Botón "Ver historial" (tabla y móvil) — acento índigo**

Reemplazar las 2 ocurrencias de `bg-gray-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-gray-700` (tabla) y `w-full bg-gray-600 text-white py-2 rounded-xl text-sm hover:bg-gray-700` (móvil) por `bg-indigo-600 ... hover:bg-indigo-700` — es la única acción disponible en esta vista, debe ser el acento primario, no gris.

- [ ] **Step 5: Modal de detalle — icono de papelera en el header**

Buscar:
```vue
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg shrink-0">
            🗑️
          </div>
```
Reemplazar por:
```vue
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <TrashIcon class="w-5 h-5" />
          </div>
```

- [ ] **Step 6: Sección de resolución y motivo de eliminación**

Buscar:
```vue
          <div v-if="detailRequest?.resolution" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p class="text-emerald-800 font-semibold text-xs mb-1">✅ Resolución</p>
```
Reemplazar el `<p>` por:
```vue
            <p class="text-emerald-800 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <CheckCircleIcon class="w-3.5 h-3.5" /> Resolución
            </p>
```

Buscar `<p class="text-red-800 font-semibold text-xs mb-1">🗑️ Motivo de eliminación</p>` → reemplazar por:
```vue
            <p class="text-red-800 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <TrashIcon class="w-3.5 h-3.5" /> Motivo de eliminación
            </p>
```

Y en la card móvil (fuera del modal), buscar `<p class="text-xs text-gray-400 mb-0.5">Motivo de eliminación</p>` — este ya no tiene emoji, dejar sin cambios.

- [ ] **Step 7: Título del historial en el modal**

Buscar `<h3 class="text-sm font-semibold text-gray-700 mb-3">📋 Historial de cambios</h3>` → reemplazar por:
```vue
        <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <ClipboardDocumentListIcon class="w-4 h-4" /> Historial de cambios
        </h3>
```

- [ ] **Step 8: Verificar en el preview**

Como admin: eliminar una solicitud de prueba desde "Pendientes", ir a "Eliminadas", abrir "Ver historial", confirmar el badge de días para purga sin cambios (semántica intacta) y los nuevos iconos. Sin errores de consola.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/views/dashboard/Deletedrequestsview.vue
git commit -m "feat(dashboard): acento indigo e iconos Heroicons en Deletedrequestsview"
```

---

### Task 8: Verificación final end-to-end

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Recorrido completo con el preview activo**

Con `backend` (3001) y `frontend` (5173) corriendo:
1. Login como `admin@empresa.com` / `Admin123*` → confirmar sidebar oscuro con marca.
2. Navegar por las 7 rutas del dashboard (`/dashboard`, `/dashboard/requests`, `/dashboard/manage-requests`, `/dashboard/deleted-requests`, `/dashboard/users`, `/dashboard/roles`, `/dashboard/permissions`).
3. En cada una, `read_console_messages` con `onlyErrors: true` → debe estar vacío de errores nuevos.
4. Probar al menos una acción de escritura por módulo (crear solicitud, crear rol, crear permiso) para confirmar que la lógica sigue intacta.
5. `resize_window` a `mobile` (375×812) y repetir el recorrido de navegación por el drawer móvil.

- [ ] **Step 2: Captura de pantalla final**

Tomar un screenshot de `/dashboard` en escritorio y uno en móvil como evidencia de que el rediseño quedó aplicado consistentemente.

No requiere commit (tarea de verificación, no de código).
