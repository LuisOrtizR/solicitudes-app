# 🖥️ Frontend — Sistema de Gestión de Solicitudes

Interfaz web (Vue 3 + TypeScript) para el sistema de autenticación y control de acceso basado en roles (RBAC). Permite a administradores y usuarios gestionar solicitudes, permisos y roles desde un panel centralizado.

---

## 🎯 ¿Qué hace este sistema?

- Los usuarios se registran, inician sesión y crean/gestionan **sus propias** solicitudes (tickets) mientras estén en estado "Abierta".
- Los administradores gestionan usuarios, roles, permisos, y todas las solicitudes del sistema (asignar, cambiar estado, eliminar con motivo).
- Las solicitudes eliminadas quedan visibles 15 días antes de purgarse definitivamente.

### Estados de una solicitud
| Estado | Significado |
|---|---|
| 🔵 `open` | Recién creada, editable/eliminable por su dueño |
| 🟡 `in_progress` | Un administrador la está atendiendo |
| 🟠 `waiting_user` | Se requiere información adicional del solicitante |
| 🟢 `resolved` | Atendida exitosamente |
| ⚪ `closed` | Finalizada y archivada |
| 🔴 `rejected` | No aprobada |

---

## 🛠️ Tecnologías

| Tecnología | Propósito |
|---|---|
| **Vue 3** (`<script setup>`) | Framework de interfaz |
| **TypeScript** | Tipado estático |
| **Pinia** | Estado global (sesión / usuario autenticado) |
| **Vue Router** | Navegación y protección de rutas por rol |
| **Axios** | Cliente HTTP con refresh automático de token |
| **Tailwind CSS 4** | Estilos |
| **Vite** | Build y servidor de desarrollo |

---

## 🚀 Instalación y puesta en marcha

> **Requisito:** Node.js 20.19+ o 22.12+. El backend debe estar corriendo antes de iniciar sesión (ver `../backend/README.md`).

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz de `frontend/`:

```env
VITE_API_URL=http://localhost:3000/api
```

> 🔒 No subas `.env` al repositorio — ya está en `.gitignore`.

### 3. Iniciar en modo desarrollo

```bash
npm run dev
```

Disponible en `http://localhost:5173`.

### 4. Compilar para producción

```bash
npm run build     # type-check + build
npm run preview   # sirve el build localmente
```

---

## 📁 Estructura del proyecto

```
src/
├── api/
│   ├── axios.ts                  # instancia Axios: adjunta el token y refresca en 401
│   └── endpoints/
│       ├── auth.api.ts
│       ├── user.api.ts
│       ├── role.api.ts
│       ├── permission.api.ts
│       └── request.api.ts
├── layouts/
│   ├── AuthLayout.vue            # layout para login/registro/recuperación
│   └── DashboardLayout.vue       # layout del panel (sidebar + guards de rol)
├── router/
│   ├── index.ts                  # definición de rutas
│   └── guards.ts                 # authGuard: exige sesión y, si aplica, rol
├── stores/
│   └── auth.store.ts             # sesión, tokens, roles/permisos del usuario
├── types/                        # tipos compartidos (auth, user, request)
├── utils/
│   └── token.ts                  # lectura/escritura de tokens en localStorage
└── views/
    ├── auth/                     # LoginView, RegisterView, Forgot/ResetPasswordView
    └── dashboard/
        ├── DashboardHome.vue          # resumen y estadísticas
        ├── RequestsView.vue           # "Mis Solicitudes" (usuario)
        ├── ManageRequestsView.vue     # "Gestionar" — todas las solicitudes (admin/supervisor)
        ├── Deletedrequestsview.vue    # solicitudes eliminadas (pendientes de purga)
        ├── UsersView.vue              # administración de usuarios (solo admin)
        ├── RolesView.vue              # administración de roles (solo admin)
        └── PermissionsView.vue        # administración de permisos (solo admin)
```

### Rutas de la aplicación

| Ruta | Vista | Acceso |
|---|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | `AuthLayout` | público |
| `/dashboard` | `DashboardHome` | sesión activa |
| `/dashboard/requests` | `RequestsView` | sesión activa |
| `/dashboard/manage-requests` | `ManageRequestsView` | rol `admin` o `supervisor` |
| `/dashboard/deleted-requests` | `Deletedrequestsview` | sesión activa |
| `/dashboard/users` | `UsersView` | rol `admin` |
| `/dashboard/roles` | `RolesView` | rol `admin` |
| `/dashboard/permissions` | `PermissionsView` | rol `admin` |

`authGuard` (`router/guards.ts`) exige un `accessToken` válido y, si la ruta lo pide, un rol específico; si el perfil del usuario aún no se ha cargado (por ejemplo tras recargar la página) espera a `fetchUser()` antes de decidir, para no expulsar por error a un administrador legítimo.

---

## ⚙️ Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API del backend, incluyendo `/api` (ej. `http://localhost:3000/api`) |

---

## 🔗 Repositorio relacionado

Este frontend consume la API documentada en [`../backend/README.md`](../backend/README.md). Asegúrate de tener el backend corriendo (con la base de datos migrada y sembrada) antes de iniciar el frontend.
