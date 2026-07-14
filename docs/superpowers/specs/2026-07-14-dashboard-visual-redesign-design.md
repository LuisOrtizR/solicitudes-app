# Rediseño visual del dashboard — Diseño

## Contexto

El login (`frontend/src/views/auth/LoginView.vue`) ya tiene una identidad de marca definida: fondo `slate-950`, panel de branding con gradiente indigo/slate ("TicketFlow"), acento índigo, iconos Heroicons. El resto del área `/dashboard` (layout + 6 vistas) usa el estilo por defecto de Tailwind: fondo `gray-100`, sidebar blanco, acento azul genérico, emojis como iconos. El objetivo es extender la identidad "TicketFlow" a todo el dashboard, sin tocar lógica ni llamadas a la API.

## Alcance

Archivos a modificar (solo `<template>` y clases; `<script setup>` no se toca salvo para importar iconos de Heroicons en reemplazo de emojis):

1. `frontend/src/layouts/DashboardLayout.vue` — shell: sidebar, topbar móvil, menú móvil, logout.
2. `frontend/src/views/dashboard/DashboardHome.vue`
3. `frontend/src/views/dashboard/RequestsView.vue`
4. `frontend/src/views/dashboard/ManageRequestsView.vue`
5. `frontend/src/views/dashboard/RolesView.vue`
6. `frontend/src/views/dashboard/PermissionsView.vue`
7. `frontend/src/views/dashboard/Deletedrequestsview.vue`

Fuera de alcance: rutas de auth (`LoginView`, `RegisterView`, etc. — ya están bien), backend, tipos, stores, endpoints.

## Sistema de diseño

- **Color de marca:** `slate-950`/`slate-900` para el sidebar (igual que el panel izquierdo del login), con el mismo glow decorativo sutil (`bg-indigo-600/20 blur-3xl`). Acento primario **índigo** (`indigo-600`/`500`) reemplaza `blue-600` en botones primarios, focus rings, links y estados activos de navegación.
- **Contenido:** el área de trabajo (tablas, formularios, cards) se mantiene clara (`white`/`gray-50`) para legibilidad de datos — patrón de sidebar oscuro + workspace claro (Linear, Vercel, Stripe).
- **Semántica de estado:** se conserva la paleta ya usada para estados de solicitud (ámbar/azul/violeta/esmeralda/gris/rojo) y prioridad — es información, no decoración, y ya está bien pensada. Solo se homogeniza el tono/estilo del pill entre vistas.
- **Iconografía:** reemplazo de todos los emojis usados como marcadores funcionales (🏠📋🛠️🗑️👥🎭🔑✅⚠️🔥📭🔒👤📅🔧✕) por iconos de `@heroicons/vue/24/outline` (ya es dependencia del proyecto, usada en login).
- **Tipografía:** se mantiene la familia del sistema; se unifica jerarquía: `h1` de página en `text-2xl font-bold tracking-tight`, labels de formulario en `text-xs font-semibold uppercase tracking-wider text-gray-500` (patrón ya presente en `ManageRequestsView`/`PermissionsView`, se extiende a las demás vistas para consistencia).
- **Marca visible:** el logo "TicketFlow" (icono `TicketIcon` + wordmark) del login aparece también en el sidebar del dashboard, dando continuidad.

## Componentes del shell (`DashboardLayout.vue`)

- Sidebar: fondo `slate-950`, glow decorativo, logo TicketFlow, tarjeta de usuario con avatar circular sobre fondo oscuro, nav con iconos Heroicons y estado activo en índigo sólido.
- Topbar móvil: fondo oscuro consistente con el sidebar, botón hamburguesa con icono Heroicons.
- Menú móvil (drawer): mismo tratamiento oscuro que el sidebar de escritorio.
- Botón de logout: `ArrowLeftOnRectangleIcon` (ya importado), estilo consistente con el resto (outline sutil en vez de rojo sólido, para no competir visualmente con las acciones destructivas reales de las vistas).

## Vistas — qué se ajusta en cada una

Cada vista mantiene su estructura y lógica intactas; los cambios son: badges/pills con estilo unificado, botones primarios en índigo, botones secundarios/destructivos con jerarquía clara (sólido para la acción principal, outline para cancelar, outline rojo para eliminar), estados vacíos y de carga con iconos Heroicons en vez de emoji, modales con el mismo tratamiento de header/footer.

- **DashboardHome:** stat cards con icono de acento por categoría (usuarios, roles, permisos, solicitudes); barras de progreso mantienen sus colores semánticos.
- **RequestsView / ManageRequestsView:** tablas y cards móviles con badges homogéneos; modales de crear/editar/eliminar con header consistente.
- **RolesView / PermissionsView:** mismo tratamiento de tabla; modal de permisos por rol con estilo unificado.
- **Deletedrequestsview:** mantiene el tratamiento distintivo (texto tachado, motivo en rojo) pero con iconos Heroicons.

## Validación

Cambio puramente visual — se verifica navegando cada ruta en el preview (login → dashboard → cada vista) y confirmando que no hay errores de consola ni de red, y que la funcionalidad (crear/editar/eliminar/filtrar) sigue funcionando igual.

## Fuera de alcance / no ambigüedades

- No se agregan dependencias nuevas (Heroicons ya está instalado).
- No se modifica el backend ni los tipos compartidos.
- No se renombran rutas ni se cambia la navegación.
- Los emojis dentro de **contenido de datos** (ej. `🔥 Urgente` como texto de una prioridad, si el usuario lo prefiere así) se evalúan caso a caso; por defecto se reemplazan por icono + texto para consistencia.
