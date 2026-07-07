# 🚀 Backend — Sistema de Solicitudes (Auth + RBAC)

API REST en Node.js/Express con autenticación JWT y control de acceso basado en roles y permisos (RBAC), para un sistema de gestión de solicitudes (tickets) tipo HelpDesk.

---

## 🏗️ Arquitectura del proyecto

Estructura modular por dominio:

```
src/
├── auth/            → Registro, login, refresh, logout, recuperación de contraseña
├── users/            → CRUD de usuarios, cambio de rol
├── roles/            → CRUD de roles y asignación de permisos
├── permissions/      → CRUD de permisos del sistema
├── requests/         → Solicitudes: crear, actualizar, eliminar (soft-delete), historial, purga
├── seed/              → Scripts de siembra inicial (roles, permisos, usuario admin)
├── routes/            → Montaje de todas las rutas bajo /api
├── shared/
│   ├── config/db.js        → Pool de conexión PostgreSQL (pg)
│   ├── middleware/          → authenticate, authorizePermission, validate, error
│   ├── services/             → Envío de correos (Resend)
│   ├── jobs/                  → Cron de limpieza de tokens expirados
│   └── utils/AppError.js      → Error tipado con statusCode
├── app.js             → Configuración de Express (CORS, JSON, rutas)
└── server.js           → Punto de entrada
```

**Tecnologías:** Node.js, Express, PostgreSQL (`pg`), JWT (`jsonwebtoken`), Zod, bcryptjs, Resend (email), node-cron.

---

## ⚙️ Instalación

### 1. Requisitos previos

- Node.js 20+ (o 22+)
- PostgreSQL 14+ corriendo localmente o accesible por red

### 2. Instalar dependencias

```bash
cd backend
npm install
```

### 3. Crear la base de datos y cargar el esquema

```bash
# crear la base de datos (una sola vez)
createdb -U postgres solicitudes_app

# cargar el esquema (tablas, índices, triggers)
psql -U postgres -d solicitudes_app -f schema.sql
```

`schema.sql` crea las tablas `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `requests`, `request_history`, `request_logs`, `refresh_tokens` y `password_resets`, además de la extensión `pgcrypto` y el trigger `update_timestamp`.

### 4. Crear el archivo `.env`

Crea `backend/.env` con estas variables (ninguna tiene un valor por defecto salvo las marcadas):

```env
PORT=3000
NODE_ENV=development

# Conexión a PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=solicitudes_app

# JWT — usa valores largos y aleatorios en producción
JWT_ACCESS_SECRET=cambia-esto-por-un-secreto-aleatorio
JWT_REFRESH_SECRET=cambia-esto-por-otro-secreto-aleatorio
ACCESS_TOKEN_EXPIRES=15m   # opcional, por defecto 15m
REFRESH_TOKEN_EXPIRES=7d   # opcional, por defecto 7d

# URL del frontend (usada en enlaces de correo y CORS)
FRONTEND_URL=http://localhost:5173

# Envío de correo (recuperación de contraseña, notificación de purga)
# Resend exige una key no vacía aunque sea de prueba, o el servidor no arranca.
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_NAME=Sistema de Solicitudes
COMPANY_NAME=Sistema de Solicitudes
COMPANY_SUPPORT_EMAIL=soporte@empresa.com
COMPANY_LOGO_URL=
```

> ⚠️ `RESEND_API_KEY` no puede quedar vacío: el SDK de Resend lanza una excepción en el arranque si la key es una cadena vacía. Si no vas a probar el envío real de correos, pon cualquier valor no vacío (p. ej. `re_dev_placeholder`).

### 5. Sembrar roles, permisos y el usuario administrador

```bash
node src/seed/permissions.seed.js   # crea los 18 permisos del sistema
node src/seed/admin.seed.js         # crea roles admin/user + usuario admin@empresa.com / Admin123*
```

Ejecutar `admin.seed.js` es seguro repetir: usa `ON CONFLICT DO NOTHING` y detecta si el admin ya existe.

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Servidor disponible en `http://localhost:3000`. `npm start` lo corre sin `nodemon` (para producción).

---

## 🔐 Autenticación y RBAC

- **Login** genera un access token (JWT corto) y un refresh token persistido en `refresh_tokens`.
- El middleware `authenticate` valida el access token y adjunta `req.user` (con `roles` y `permissions`).
- El middleware `authorizePermission(nombre)` exige que el usuario tenga ese permiso — el rol `admin` siempre pasa (bypass total).
- Los usuarios con rol `user` solo tienen `requests_create` y `requests_read` de fábrica; pueden editar/eliminar **sus propias** solicitudes mientras estén en estado `open` (la autorización por dueño vive en `request.service.js`, no en el middleware de ruta).
- El usuario administrador sembrado (`admin@empresa.com`) queda marcado `is_protected = true`: no puede eliminarse, no se le puede cambiar el rol y no puede modificarse su email.
- Los permisos del sistema (los 18 sembrados) quedan marcados `is_protected = true` y no pueden editarse ni eliminarse vía API; lo mismo para los roles `admin` y `user`.

---

## 📌 Endpoints (`/api`)

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registrar usuario (rol `user` por defecto) |
| POST | `/auth/login` | Iniciar sesión → `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Revocar refresh token |
| POST | `/auth/forgot` | Solicitar enlace de recuperación (no filtra si el email existe) |
| POST | `/auth/reset` | Restablecer contraseña con el token recibido por correo |

### Usuarios (`/users`)
| Método | Ruta | Permiso requerido |
|---|---|---|
| GET | `/users/me` | sesión activa |
| PUT | `/users/me` | sesión activa |
| DELETE | `/users/me` | sesión activa |
| GET | `/users` | `users_read` |
| GET | `/users/:id` | `users_read` |
| PUT | `/users/:id` | `users_update` |
| DELETE | `/users/:id` | `users_delete` |
| PATCH | `/users/:id/role` | `users_change_role` |

### Roles (`/roles`)
| Método | Ruta | Permiso requerido |
|---|---|---|
| POST | `/roles` | `create_roles` |
| GET | `/roles` | `view_roles` |
| GET | `/roles/:id` | `view_roles` |
| PUT | `/roles/:id` | `edit_roles` |
| DELETE | `/roles/:id` | `delete_roles` |
| POST | `/roles/:id/permissions` | `assign_permissions` |
| DELETE | `/roles/:id/permissions/:permissionId` | `assign_permissions` |
| GET | `/roles/:id/permissions` | `view_roles` |

### Permisos (`/permissions`)
| Método | Ruta | Permiso requerido |
|---|---|---|
| POST | `/permissions` | `permissions_create` |
| GET | `/permissions?page=&limit=&search=&sort=&order=` | `permissions_read` |
| GET | `/permissions/:uuid` | `permissions_read` |
| PUT | `/permissions/:uuid` | `permissions_update` |
| DELETE | `/permissions/:uuid` | `permissions_delete` |

### Solicitudes (`/requests`)
| Método | Ruta | Acceso |
|---|---|---|
| POST | `/requests` | `requests_create` |
| GET | `/requests` | `requests_read_all` (admin/supervisor) |
| GET | `/requests/mine` | `requests_read` |
| GET | `/requests/deleted` | `requests_read` (admin ve todas, el resto solo las propias) |
| GET | `/requests/:id` | dueño de la solicitud, o admin/supervisor |
| GET | `/requests/:id/history` | dueño de la solicitud, o admin/supervisor |
| PUT | `/requests/:id` | dueño (solo si está `open`) o admin/supervisor |
| DELETE | `/requests/:id` | dueño (solo si está `open`, requiere `reason`) o admin/supervisor |

Las solicitudes eliminadas quedan en soft-delete (`deleted_at`, `deleted_reason`) y se purgan automáticamente a los 15 días mediante un cron diario (`node-cron`, 2:00 AM hora Bogotá), enviando antes una notificación por correo al dueño.

---

## 🧪 Estados y prioridades de una solicitud

- **Estados:** `open` → `in_progress` → `waiting_user` → `resolved` / `closed` / `rejected`
- **Prioridades:** `low`, `medium`, `high`, `urgent`
