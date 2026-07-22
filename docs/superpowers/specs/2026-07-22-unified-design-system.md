# Sistema de Diseño Unificado (claro/oscuro) — Diseño

## Contexto

Se pidió, vía un prompt genérico de "rediseño visual de TicketFlow", unificar la app bajo un solo sistema de diseño con modo claro/oscuro. El prompt describe un estado del proyecto ("dashboard con tema claro genérico") que **no coincide** con la realidad: en una sesión anterior ya se rediseñó el dashboard con sidebar oscura (`slate-950`) + acento índigo + Heroicons, a juego con el login. El usuario decidió explícitamente revertir esa dirección y unificar todo bajo una paleta **clara**, con un **toggle real** de modo claro/oscuro.

## Hallazgos de la inspección (Paso 0)

- El proyecto usa **Tailwind v4** vía `@tailwindcss/vite` — no existe `tailwind.config.js` ni `postcss.config.js`. La configuración es CSS-first: `src/style.css` solo tiene `@import "tailwindcss";`. Los tokens de color se definen con un bloque `@theme`, no en un archivo JS.
- Tailwind v4 usa la estrategia de modo oscuro por `prefers-color-scheme` por defecto; la estrategia "class" (toggle manual) requiere `@custom-variant dark (&:where(.dark, .dark *));` explícito en el CSS — no existe la opción `darkMode: 'class'` de v3.
- No existe ningún componente compartido de UI (`Button`, `Input`, `Card`, badge) — cada vista repite sus propias clases Tailwind inline. `src/components/` solo tiene la carpeta `analytics/`.
- El índigo-500 real de Tailwind es `#6366F1`; `#4F46E5` (el hex que pedía el prompt para "500") es en realidad índigo-600. Se usan los valores reales de la paleta de Tailwind, no los hex del prompt.
- **Gap real encontrado**: `UsersView.vue` quedó fuera del rediseño anterior — sigue con botones `bg-blue-600` viejos mientras el resto del dashboard ya está en índigo.
- Los objetos `statusConfig` (6 estados: `open/in_progress/waiting_user/resolved/closed/rejected`) y `priorityConfig` (4 prioridades: `low/medium/high/urgent`) están **copiados literalmente** en `RequestsView.vue`, `ManageRequestsView.vue` y `Deletedrequestsview.vue` — duplicación real de datos, no solo de estilo.
- Las 4 pantallas de analítica que usan Chart.js (`StatusDonutChart`, `CategoryBarChart`, `MttrChart`, `TrendLineChart`) pintan en `<canvas>` con colores JS — no heredan `dark:` de CSS automáticamente.
- Auth (`LoginView`, `RegisterView`, `ForgotPasswordView`, `ResetPasswordView`, `DemoLoginBot`) ya está en oscuro/índigo consistente entre sí (hecho en una sesión previa a esta conversación) — pasa a claro también, según decisión del usuario.

## Decisiones

1. **Sidebar del dashboard**: pasa de oscura a **clara** (blanco/`gray-50`), revirtiendo la decisión de la sesión anterior.
2. **Login/Register/Forgot/Reset**: pasan a claro también — unificación total, sin excepciones.
3. **Toggle real de tema**: claro/oscuro con persistencia en `localStorage`, por defecto **claro**. Botón visible en el sidebar del dashboard y en el layout de auth.
4. **Colores de estado**: se mantiene el esquema de 6 estados ya construido (ámbar=abierta, azul=en progreso, violeta=esperando usuario, esmeralda=resuelta, gris=cerrada, rojo=rechazada) — es más preciso para el dominio real que el esquema genérico de 4 colores del prompt.
5. **Componentes compartidos**: se extraen 4 nuevos (`BaseButton`, `BaseInput`, `BaseCard`, `StatusBadge`/`PriorityBadge`) — decisión explícita del usuario de aprovechar este rediseño para resolver la duplicación de raíz, no solo aplicar clases inline pantalla por pantalla.
6. **Token de color primario**: se define `primary-*` en `@theme`, mapeado 1:1 a la escala real de índigo de Tailwind. Todo archivo que este rediseño toque usa `primary-*` en vez de `indigo-*` literal de ahí en adelante.
7. **Alcance**: una sola spec/plan cubriendo fundación + aplicación en las ~20 pantallas (auth + dashboard + analítica), sin dividir en fases separadas — decisión explícita del usuario.

## Fundación

### `src/style.css` — tokens y estrategia de dark mode

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-primary-50: #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;
  --color-primary-950: #1e1b4b;
}
```

(Estos son exactamente los valores reales de `indigo-*` de Tailwind — el token es un alias semántico, no una paleta nueva.)

### `src/stores/theme.store.ts`

Pinia. Estado `mode: 'light' | 'dark'`, inicializado desde `localStorage` (clave `theme`, default `'light'`). Acción `toggle()` y `init()` (aplica la clase `dark` en `document.documentElement` al arrancar la app, llamada desde `main.ts`). Cada cambio de `mode` persiste a `localStorage` y sincroniza la clase `dark`.

### Componentes compartidos (`src/components/ui/`)

- **`BaseButton.vue`**: prop `variant: 'primary' | 'secondary' | 'danger' | 'danger-solid'` (default `'primary'`), hereda atributos nativos de `<button>` (`type`, `disabled`, `@click` vía `v-bind="$attrs"`), slot por defecto.
  - `primary`: `bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white`
  - `secondary`: `border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900`
  - `danger` (outline, acciones de fila): `border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40`
  - `danger-solid` (confirmar en modal): `bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white`
  - Base común a las 4: `rounded-lg text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`
- **`BaseInput.vue`**: props `modelValue`, `type` (default `'text'`), `placeholder`, `label` (opcional). Emite `update:modelValue`. Clases: `border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 w-full`.
- **`BaseCard.vue`**: wrapper de slot único. Clases: `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6`.
- **`StatusBadge.vue`**: prop `status: string`. Mapeo interno (el mismo ya usado, ahora centralizado):
  `open`→ámbar, `in_progress`→azul, `waiting_user`→violeta, `resolved`→esmeralda, `closed`→gris, `rejected`→rojo. Cada color con su par claro/oscuro (ej. `bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-900`). Formato `rounded-full text-xs font-medium px-2.5 py-1` con punto de color, igual que ya se usaba.
- **`PriorityBadge.vue`**: prop `priority: string`. Mapeo: `low`→slate, `medium`→sky, `high`→orange, `urgent`→rose (negrita), igual al esquema ya usado, con pares claro/oscuro.

## Aplicación (una sola pasada, sin fases separadas)

Todas las pantallas de `src/views/auth/*`, `src/layouts/*`, `src/views/dashboard/*` y `src/components/analytics/*` se actualizan para:
1. Usar `primary-*` en vez de `indigo-*`.
2. Agregar variantes `dark:` a cada superficie (fondos, bordes, texto).
3. Reemplazar botones/inputs/cards por los 4 componentes compartidos donde aplique.
4. Reemplazar los objetos `statusConfig`/`priorityConfig` duplicados por `<StatusBadge>`/`<PriorityBadge>`.
5. `DashboardLayout.vue`: sidebar pasa de `bg-slate-950` a `bg-white dark:bg-gray-900` con borde derecho, item activo `bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400`, se agrega el botón toggle de tema.
6. `UsersView.vue`: se corrige el gap — botones `bg-blue-600` → `<BaseButton variant="primary">`.
7. Los 4 componentes de gráficas (Chart.js): un `computed` que lee `theme.store.mode` y ajusta `color`/`grid.color` de los ejes y la leyenda entre un set de colores claros y oscuros — los colores de los datos (estado/categoría) no cambian.
8. Layout de contenido del dashboard: se agrega `max-w-7xl mx-auto` al contenedor de contenido (pedido explícito del prompt), manteniendo el padding responsivo ya existente.

## Fuera de alcance

- No se toca la lógica funcional de ningún componente (stores, llamadas API, validaciones) — solo clases de estilo y la extracción de los 4 componentes de presentación pura.
- No se agregan librerías de UI ni de estilos nuevas (Tailwind puro, como pide el prompt).
- No se implementa selector de tema "según preferencia del sistema" (`prefers-color-scheme`) como fuente inicial — el default es siempre claro hasta que el usuario haga toggle, por decisión explícita.
