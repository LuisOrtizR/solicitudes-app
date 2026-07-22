# Sistema de Diseño Unificado (claro/oscuro) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar visualmente toda la app (auth + dashboard + analítica) bajo una sola paleta clara con acento índigo (token semántico `primary`), con un toggle real de modo claro/oscuro persistente, reemplazando las clases inline duplicadas por 4 componentes compartidos nuevos.

**Architecture:** Tokens de color en `@theme` de Tailwind v4 (`src/style.css`) + `@custom-variant dark` para estrategia "class". Store de Pinia (`theme.store.ts`) que aplica la clase `dark` en `<html>` y persiste en `localStorage`. 4 componentes de presentación pura en `src/components/ui/` (`BaseButton`, `BaseInput`, `BaseCard`, `StatusBadge`, `PriorityBadge`) consumidos por las ~20 pantallas existentes, cuyas clases se reescriben para usar `primary-*` + variantes `dark:`.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Tailwind CSS v4 (CSS-first, sin `tailwind.config.js`), Heroicons (`@heroicons/vue/24/outline`, ya instalado).

## Global Constraints

- Solo clases utilitarias de Tailwind — cero CSS custom fuera del bloque `@theme` en `style.css`, cero estilos inline con objetos JS, cero librerías de UI nuevas.
- El token de color primario es `primary-*`, definido en `@theme` con los valores **reales** de la escala índigo de Tailwind (índigo-500 real = `#6366f1`; `#4F46E5` es índigo-600, no 500).
- Todo archivo que este plan toque usa `primary-*` en vez de `indigo-*`/`blue-*`/`purple-*` literal de ahí en adelante.
- El tema por defecto es **claro**; el toggle es manual (clase `dark` en `<html>`), no `prefers-color-scheme`.
- Se mantiene el esquema de 6 colores de estado ya construido (ámbar/azul/violeta/esmeralda/gris/rojo) y el de 4 colores de prioridad (slate/sky/orange/rose) — no se cambia a un esquema distinto.
- No se toca lógica funcional (stores, llamadas API, validaciones, computeds de negocio) — solo clases de estilo y la extracción de los 4 componentes de presentación pura.
- Cada tarea de "aplicación" (auth, dashboard, analítica) se verifica navegando la pantalla en el preview, en claro y en oscuro, revisando consola sin errores.

---

## FUNDACIÓN

### Task 1: Tokens de tema y estrategia dark en `style.css`

**Files:**
- Modify: `frontend/src/style.css`

**Interfaces:**
- Produces: clases `bg-primary-50` … `bg-primary-950` (y `text-`, `border-`, `ring-` equivalentes) disponibles en todo el proyecto; variante `dark:` funcionando por clase manual en `<html>`.

- [ ] **Step 1: Reemplazar el contenido completo de `style.css`**

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

- [ ] **Step 2: Verificar que Vite sigue sirviendo sin errores**

Con el frontend corriendo, confirma en el preview que la app carga (aunque visualmente nada cambió todavía) y que no hay errores en la consola ni en los logs del servidor de Vite.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/style.css
git commit -m "feat(design): agrega token primary y estrategia dark class en Tailwind v4"
```

---

### Task 2: `theme.store.ts`

**Files:**
- Create: `frontend/src/stores/theme.store.ts`
- Modify: `frontend/src/main.ts`

**Interfaces:**
- Produces: `useThemeStore()` con estado `mode: 'light' | 'dark'`, acción `toggle()`, acción `init()`. Consumido por el botón de toggle (Task 12, Task 7) y por los 4 componentes de gráficas (Task 21).

- [ ] **Step 1: Crear el store**

```ts
import { defineStore } from "pinia";

const STORAGE_KEY = "theme";

type ThemeMode = "light" | "dark";

const applyClass = (mode: ThemeMode) => {
  document.documentElement.classList.toggle("dark", mode === "dark");
};

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: "light" as ThemeMode,
  }),

  actions: {
    init() {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      this.mode = stored === "dark" ? "dark" : "light";
      applyClass(this.mode);
    },

    toggle() {
      this.mode = this.mode === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, this.mode);
      applyClass(this.mode);
    },
  },
});
```

- [ ] **Step 2: Inicializar en `main.ts`**

Reemplaza el contenido completo de `frontend/src/main.ts`:

```ts
import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme.store'

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend)

const app = createApp(App)

app.use(createPinia())
app.use(router)

useThemeStore().init()

app.mount('#app')
```

- [ ] **Step 3: Verificar en consola del navegador**

Con el frontend corriendo, en la consola del navegador ejecuta `document.documentElement.classList.contains('dark')` → debe dar `false` (tema claro por defecto). Ejecuta `localStorage.getItem('theme')` → debe dar `null` (todavía no se ha hecho toggle).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores/theme.store.ts frontend/src/main.ts
git commit -m "feat(design): store de tema con persistencia y toggle claro/oscuro"
```

---

### Task 3: `BaseButton.vue`

**Files:**
- Create: `frontend/src/components/ui/BaseButton.vue`

**Interfaces:**
- Produces: componente `<BaseButton variant="primary|secondary|danger|danger-solid">`, usado en las ~20 pantallas de aplicación.

- [ ] **Step 1: Crear el componente**

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "danger" | "danger-solid";
  }>(),
  { variant: "primary" }
);

const variantClass = computed(() => ({
  primary: "bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white",
  secondary:
    "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800",
  danger:
    "border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40",
  "danger-solid": "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white",
}[props.variant]));
</script>

<template>
  <button
    :class="[
      'rounded-lg text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
      variantClass,
    ]"
  >
    <slot />
  </button>
</template>
```

(Vue 3 propaga automáticamente `disabled`, `@click`, `type`, etc. al `<button>` raíz sin configuración adicional — no hace falta `inheritAttrs: false` porque el componente tiene un único elemento raíz.)

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npm run type-check
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/BaseButton.vue
git commit -m "feat(design): componente BaseButton con 4 variantes"
```

---

### Task 4: `BaseInput.vue`

**Files:**
- Create: `frontend/src/components/ui/BaseInput.vue`

**Interfaces:**
- Consumes: ninguno.
- Produces: `<BaseInput v-model="x" type="email" placeholder="..." label="..." />`.

- [ ] **Step 1: Crear el componente**

```vue
<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    label?: string;
    autocomplete?: string;
  }>(),
  { type: "text" }
);

defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white
             dark:placeholder:text-gray-500 rounded-lg px-3 py-2.5 text-sm outline-none transition
             focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400"
    />
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
git add frontend/src/components/ui/BaseInput.vue
git commit -m "feat(design): componente BaseInput"
```

---

### Task 5: `BaseCard.vue`

**Files:**
- Create: `frontend/src/components/ui/BaseCard.vue`

- [ ] **Step 1: Crear el componente**

```vue
<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
    <slot />
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
git add frontend/src/components/ui/BaseCard.vue
git commit -m "feat(design): componente BaseCard"
```

---

### Task 6: `StatusBadge.vue` + `PriorityBadge.vue`

**Files:**
- Create: `frontend/src/components/ui/StatusBadge.vue`
- Create: `frontend/src/components/ui/PriorityBadge.vue`

**Interfaces:**
- Produces: `<StatusBadge :status="r.status" />`, `<PriorityBadge :priority="r.priority" />` — reemplazan los objetos `statusConfig`/`priorityConfig` duplicados en `RequestsView.vue`, `ManageRequestsView.vue`, `Deletedrequestsview.vue` (Tasks 15-17).

- [ ] **Step 1: Crear `StatusBadge.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ status: string }>();

const config: Record<string, { color: string; dot: string; label: string }> = {
  open: {
    color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-900",
    dot: "bg-amber-400",
    label: "Abierta",
  },
  in_progress: {
    color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-900",
    dot: "bg-blue-400",
    label: "En Progreso",
  },
  waiting_user: {
    color: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-900",
    dot: "bg-violet-400",
    label: "Esp. Usuario",
  },
  resolved: {
    color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-900",
    dot: "bg-emerald-400",
    label: "Resuelta",
  },
  closed: {
    color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700",
    dot: "bg-gray-400",
    label: "Cerrada",
  },
  rejected: {
    color: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900",
    dot: "bg-red-400",
    label: "Rechazada",
  },
};

const current = computed(() => config[props.status] ?? config.open);
</script>

<template>
  <span
    :class="current.color"
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
  >
    <span :class="current.dot" class="w-1.5 h-1.5 rounded-full shrink-0" />
    {{ current.label }}
  </span>
</template>
```

- [ ] **Step 2: Crear `PriorityBadge.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ priority: string }>();

const config: Record<string, { color: string; label: string }> = {
  low: { color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", label: "Baja" },
  medium: { color: "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400", label: "Media" },
  high: { color: "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400", label: "Alta" },
  urgent: {
    color: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-bold",
    label: "🔥 Urgente",
  },
};

const current = computed(() => config[props.priority] ?? config.medium);
</script>

<template>
  <span :class="current.color" class="px-2 py-0.5 rounded-lg text-xs">
    {{ current.label }}
  </span>
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
git add frontend/src/components/ui/StatusBadge.vue frontend/src/components/ui/PriorityBadge.vue
git commit -m "feat(design): componentes StatusBadge y PriorityBadge (deduplican statusConfig/priorityConfig)"
```

---

## APLICACIÓN — AUTH

### Task 7: `LoginView.vue` + `AuthLayout.vue` a claro

**Files:**
- Modify: `frontend/src/views/auth/LoginView.vue`
- Modify: `frontend/src/layouts/AuthLayout.vue`

**Interfaces:**
- Consumes: `useThemeStore` (Task 2).

- [ ] **Step 1: `AuthLayout.vue` — agregar fondo base (claro/oscuro)**

Reemplaza el contenido completo:

```vue
<template>
  <div class="auth-layout bg-gray-50 dark:bg-gray-950 min-h-screen">
    <router-view />
  </div>
</template>
```

- [ ] **Step 2: `LoginView.vue` — importar el store de tema y el ícono de toggle**

Agrega al bloque de imports:

```ts
import { SunIcon, MoonIcon } from "@heroicons/vue/24/outline";
import { useThemeStore } from "@/stores/theme.store";
```

Y después de `const auth = useAuthStore();`:

```ts
const theme = useThemeStore();
```

- [ ] **Step 3: Reemplazar el fondo general y el panel izquierdo (oscuro → claro con branding índigo, con `dark:` para cuando el usuario elija oscuro)**

Buscar:
```vue
  <div class="min-h-screen flex bg-slate-950">
    <!-- PANEL IZQUIERDO — Branding / valor del producto -->
    <div
      class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 xl:p-16 flex-col justify-between"
    >
      <!-- Glow decorativo -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" aria-hidden="true" />
      <div class="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />

      <div class="relative z-10">
        <div class="flex items-center gap-2.5 mb-16">
          <div class="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
            <TicketIcon class="w-5 h-5 text-white" />
          </div>
          <span class="text-white font-semibold text-lg tracking-tight">TicketFlow</span>
        </div>

        <h2 class="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
          Gestiona soporte<br />sin perder el control
        </h2>
        <p class="text-slate-400 text-base mb-12 max-w-md">
          La plataforma para equipos que necesitan resolver tickets rápido, con trazabilidad completa y cero fricción operativa.
        </p>

        <div class="space-y-6">
          <div v-for="f in features" :key="f.title" class="flex items-start gap-3.5">
            <div class="shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <component :is="f.icon" class="w-4.5 h-4.5 text-indigo-300" />
            </div>
            <div>
              <p class="text-white text-sm font-medium">{{ f.title }}</p>
              <p class="text-slate-400 text-sm">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <p class="relative z-10 text-slate-500 text-xs">
        © {{ new Date().getFullYear() }} TicketFlow. Todos los derechos reservados.
      </p>
    </div>
```

Reemplazar por:
```vue
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-950">
    <!-- PANEL IZQUIERDO — Branding / valor del producto -->
    <div
      class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-50 dark:bg-gray-900 p-12 xl:p-16 flex-col justify-between border-r border-primary-100 dark:border-gray-800"
    >
      <!-- Glow decorativo -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary-200/40 dark:bg-primary-600/20 rounded-full blur-3xl" aria-hidden="true" />
      <div class="absolute bottom-0 right-0 w-80 h-80 bg-primary-200/30 dark:bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />

      <div class="relative z-10">
        <div class="flex items-center gap-2.5 mb-16">
          <div class="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
            <TicketIcon class="w-5 h-5 text-white" />
          </div>
          <span class="text-gray-900 dark:text-white font-semibold text-lg tracking-tight">TicketFlow</span>
        </div>

        <h2 class="text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
          Gestiona soporte<br />sin perder el control
        </h2>
        <p class="text-gray-500 dark:text-slate-400 text-base mb-12 max-w-md">
          La plataforma para equipos que necesitan resolver tickets rápido, con trazabilidad completa y cero fricción operativa.
        </p>

        <div class="space-y-6">
          <div v-for="f in features" :key="f.title" class="flex items-start gap-3.5">
            <div class="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-white/5 border border-primary-100 dark:border-white/10 flex items-center justify-center shadow-sm">
              <component :is="f.icon" class="w-4.5 h-4.5 text-primary-600 dark:text-primary-300" />
            </div>
            <div>
              <p class="text-gray-900 dark:text-white text-sm font-medium">{{ f.title }}</p>
              <p class="text-gray-500 dark:text-slate-400 text-sm">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <p class="relative z-10 text-gray-400 dark:text-slate-500 text-xs">
        © {{ new Date().getFullYear() }} TicketFlow. Todos los derechos reservados.
      </p>
    </div>
```

- [ ] **Step 4: Panel derecho (formulario) — claro con `dark:`, agregar botón de toggle**

Buscar:
```vue
    <!-- PANEL DERECHO — Formulario -->
    <div class="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
      <div class="w-full max-w-sm">
        <!-- Logo visible solo en mobile (panel izq. oculto) -->
        <div class="flex lg:hidden items-center justify-center gap-2.5 mb-8">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <TicketIcon class="w-4.5 h-4.5 text-white" />
          </div>
          <span class="text-white font-semibold text-base">TicketFlow</span>
        </div>

        <div class="mb-8">
          <h1 class="text-2xl font-bold text-white mb-1.5">Bienvenido de nuevo</h1>
          <p class="text-slate-400 text-sm">Ingresa tus credenciales para acceder al panel de tickets.</p>
        </div>

        <div
          v-if="error"
          role="alert"
          aria-live="assertive"
          class="mb-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20"
        >
          {{ error }}
        </div>

        <form @submit.prevent="submit" class="space-y-4" novalidate>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">Correo electrónico</label>
            <div class="relative">
              <EnvelopeIcon class="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="tu@empresa.com"
                class="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                       placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       outline-none transition"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-medium text-slate-300">Contraseña</label>
              <RouterLink to="/forgot-password" class="text-xs text-indigo-400 hover:text-indigo-300 transition">
                ¿Olvidaste tu contraseña?
              </RouterLink>
            </div>
            <div class="relative">
              <LockClosedIcon class="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                       placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       outline-none transition"
              />
            </div>
          </div>

          <button
            :disabled="!isValid || loading"
            class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm
                   hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 transition"
          >
            <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
              <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
            </svg>
            {{ loading ? "Entrando..." : "Entrar" }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-400">
          ¿No tienes cuenta?
          <RouterLink to="/register" class="text-indigo-400 hover:text-indigo-300 font-medium transition">
            Regístrate
          </RouterLink>
        </p>
      </div>
    </div>

    <DemoLoginBot @autofill="handleAutofill" />
  </div>
</template>
```

Reemplazar por:
```vue
    <!-- PANEL DERECHO — Formulario -->
    <div class="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 relative">
      <button
        @click="theme.toggle"
        :aria-label="theme.mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        class="absolute top-4 right-4 p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"
      >
        <SunIcon v-if="theme.mode === 'dark'" class="w-5 h-5" />
        <MoonIcon v-else class="w-5 h-5" />
      </button>

      <div class="w-full max-w-sm">
        <!-- Logo visible solo en mobile (panel izq. oculto) -->
        <div class="flex lg:hidden items-center justify-center gap-2.5 mb-8">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <TicketIcon class="w-4.5 h-4.5 text-white" />
          </div>
          <span class="text-gray-900 dark:text-white font-semibold text-base">TicketFlow</span>
        </div>

        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Bienvenido de nuevo</h1>
          <p class="text-gray-500 dark:text-slate-400 text-sm">Ingresa tus credenciales para acceder al panel de tickets.</p>
        </div>

        <div
          v-if="error"
          role="alert"
          aria-live="assertive"
          class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
        >
          {{ error }}
        </div>

        <form @submit.prevent="submit" class="space-y-4" novalidate>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Correo electrónico</label>
            <div class="relative">
              <EnvelopeIcon class="w-5 h-5 absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" />
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="tu@empresa.com"
                class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm
                       placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       outline-none transition"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300">Contraseña</label>
              <RouterLink to="/forgot-password" class="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition">
                ¿Olvidaste tu contraseña?
              </RouterLink>
            </div>
            <div class="relative">
              <LockClosedIcon class="w-5 h-5 absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" />
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm
                       placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       outline-none transition"
              />
            </div>
          </div>

          <button
            :disabled="!isValid || loading"
            class="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium text-sm
                   hover:bg-primary-700 dark:hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 transition"
          >
            <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
              <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
            </svg>
            {{ loading ? "Entrando..." : "Entrar" }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
          ¿No tienes cuenta?
          <RouterLink to="/register" class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition">
            Regístrate
          </RouterLink>
        </p>
      </div>
    </div>

    <DemoLoginBot @autofill="handleAutofill" />
  </div>
</template>
```

- [ ] **Step 5: Verificar en el preview**

Navega a `/login`. Debe verse claro (panel izquierdo `primary-50`, panel derecho blanco). Haz clic en el botón de sol/luna arriba a la derecha del formulario — confirma que pasa a oscuro (panel izquierdo `gray-900`, panel derecho `gray-950`) y que `localStorage.getItem('theme')` ahora es `'dark'`. Recarga la página — debe seguir en oscuro (persistencia). Vuelve a clic para dejarlo en claro. Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/auth/LoginView.vue frontend/src/layouts/AuthLayout.vue
git commit -m "feat(design): LoginView y AuthLayout a paleta clara con toggle de tema"
```

---

### Task 8: `RegisterView.vue` a claro (unifica el layout con Login)

**Files:**
- Modify: `frontend/src/views/auth/RegisterView.vue`

**Interfaces:**
- Consumes: `BaseInput` (Task 4), `BaseButton` (Task 3).

- [ ] **Step 1: Agregar imports**

```ts
import BaseInput from "@/components/ui/BaseInput.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
```

- [ ] **Step 2: Simplificar `inputClass` — ya no hace falta la lógica de borde rojo por invalidez para el estilo base (se mantiene la validación, pero ahora usa un helper que retorna solo el color de foco)**

Buscar:
```ts
const inputClass = (valid: boolean, touched: boolean) => [
  "w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base",
  !touched || valid
    ? "border-gray-300 focus:ring-2 focus:ring-indigo-500"
    : "border-red-400 focus:ring-2 focus:ring-red-400",
];
```

Reemplazar por:
```ts
const inputBorderClass = (valid: boolean, touched: boolean) =>
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-red-400 focus:border-red-400";
```

- [ ] **Step 3: Reemplazar el template completo**

```vue
<template>
  <div class="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 bg-gray-50 dark:bg-gray-950">
    <div class="w-full max-w-md bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
      <div class="flex items-center justify-center gap-2.5 mb-6">
        <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <UserIcon class="w-4.5 h-4.5 text-white" />
        </div>
        <span class="text-gray-900 dark:text-white font-semibold text-base">TicketFlow</span>
      </div>

      <h1 class="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
        Crear Cuenta
      </h1>

      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form @submit.prevent="submit" class="space-y-4" novalidate>
        <div class="relative">
          <UserIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="name"
            type="text"
            autocomplete="name"
            placeholder="Nombre completo"
            :class="[
              'w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white',
              inputBorderClass(isNameValid, name.length > 0),
            ]"
          />
        </div>

        <div class="relative">
          <EnvelopeIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="Correo electrónico"
            :class="[
              'w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white',
              inputBorderClass(isEmailValid, email.length > 0),
            ]"
          />
        </div>

        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            :class="[
              'w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white',
              inputBorderClass(isPasswordValid, password.length > 0),
            ]"
          />
        </div>

        <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
          </svg>
          {{ loading ? "Creando..." : "Registrarse" }}
        </BaseButton>
      </form>

      <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿Ya tienes cuenta?
        <RouterLink to="/login" class="text-primary-600 dark:text-primary-400 hover:underline font-medium">
          Inicia sesión
        </RouterLink>
      </div>
    </div>
  </div>
</template>
```

(`BaseInput` no se usa aquí porque el campo tiene un ícono absoluto superpuesto que `BaseInput` no soporta — se mantiene el `<input>` nativo con las clases del sistema, y sí se usa `BaseButton` para el botón, que no tiene esa restricción.)

- [ ] **Step 4: Agregar el import de `UserIcon` faltante si no está**

`UserIcon` ya está importado en el bloque original (`import { UserIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";`) — no requiere cambio.

- [ ] **Step 5: Verificar en el preview**

Navega a `/register`. Debe verse claro, consistente con `/login` (mismo `bg-gray-50`, misma card blanca, mismo botón índigo). Prueba el toggle heredado del store (si ya estaba en oscuro desde el Task 7, `/register` debe abrir oscuro también — es el mismo store global). Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/auth/RegisterView.vue
git commit -m "feat(design): RegisterView unificado a la paleta clara del sistema"
```

---

### Task 9: `ForgotPasswordView.vue` a claro

**Files:**
- Modify: `frontend/src/views/auth/ForgotPasswordView.vue`

**Interfaces:**
- Consumes: `BaseButton` (Task 3).

- [ ] **Step 1: Agregar import**

```ts
import BaseButton from "@/components/ui/BaseButton.vue";
```

- [ ] **Step 2: Reemplazar el template completo**

```vue
<template>
  <div class="min-h-screen flex items-center justify-center px-6 py-8 bg-gray-50 dark:bg-gray-950">
    <div class="w-full max-w-md bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
      <h1 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
        Recuperar Contraseña
      </h1>

      <!-- ÉXITO -->
      <div
        v-if="success"
        class="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm"
      >
        ✔ Si el correo existe, recibirás instrucciones en tu bandeja de entrada.
      </div>

      <!-- ERROR -->
      <div
        v-if="error"
        class="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form v-if="!success" @submit.prevent="submit" class="space-y-4">
        <div class="relative">
          <EnvelopeIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="email"
            type="email"
            placeholder="Correo electrónico"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition dark:bg-gray-800 dark:text-white',
              isValid
                ? 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500'
                : 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400',
            ]"
          />
        </div>

        <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2">
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
          </svg>
          {{ loading ? "Enviando..." : "Enviar instrucciones" }}
        </BaseButton>
      </form>

      <div class="mt-6 text-center text-sm">
        <RouterLink to="/login" class="text-primary-600 dark:text-primary-400 hover:underline">
          Volver al login
        </RouterLink>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verificar en el preview**

Navega a `/forgot-password`. Antes usaba acento **azul** (`blue-600`); ahora debe verse índigo (`primary-600`), consistente con Login/Register. Sin errores de consola.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/auth/ForgotPasswordView.vue
git commit -m "feat(design): ForgotPasswordView unificado (antes usaba azul, no indigo)"
```

---

### Task 10: `ResetPasswordView.vue` a claro

**Files:**
- Modify: `frontend/src/views/auth/ResetPasswordView.vue`

**Interfaces:**
- Consumes: `BaseButton` (Task 3).

- [ ] **Step 1: Agregar import**

```ts
import BaseButton from "@/components/ui/BaseButton.vue";
```

- [ ] **Step 2: Actualizar `inputClass` (usaba `purple-500`, no `indigo`/`primary`)**

Buscar:
```ts
const inputClass = (valid: boolean, touched: boolean) => [
  "w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base",
  !touched || valid
    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
    : "border-red-400 focus:ring-2 focus:ring-red-400",
];
```

Reemplazar por:
```ts
const inputClass = (valid: boolean, touched: boolean) => [
  "w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white",
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400",
];
```

- [ ] **Step 3: Reemplazar el template completo**

```vue
<template>
  <div class="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 bg-gray-50 dark:bg-gray-950">
    <div class="w-full max-w-md bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
      <h1 class="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
        Nueva Contraseña
      </h1>

      <div
        v-if="success"
        role="status"
        aria-live="polite"
        class="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm text-center"
      >
        ✔ Contraseña actualizada. Redirigiendo al login...
      </div>

      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form v-if="!success && token" @submit.prevent="submit" class="space-y-4" novalidate>
        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            :class="inputClass(isPasswordValid, password.length > 0)"
          />
        </div>

        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Confirmar contraseña"
            :class="inputClass(passwordsMatch, confirmPassword.length > 0)"
          />
        </div>

        <p v-if="confirmPassword.length > 0 && !passwordsMatch" class="text-red-500 dark:text-red-400 text-xs">
          Las contraseñas no coinciden
        </p>

        <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
          </svg>
          {{ loading ? "Actualizando..." : "Restablecer contraseña" }}
        </BaseButton>
      </form>

      <div v-if="!token" class="text-center mt-4">
        <RouterLink to="/forgot-password" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">
          Solicitar nuevo enlace
        </RouterLink>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Verificar en el preview**

Navega a `/reset-password?token=x` (token inválido está bien, solo se verifica el estilo). Antes usaba **morado** (`purple-600`); ahora debe verse índigo (`primary-600`). Sin errores de consola.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/auth/ResetPasswordView.vue
git commit -m "feat(design): ResetPasswordView unificado (antes usaba morado, no indigo)"
```

---

### Task 11: `DemoLoginBot.vue` a claro

**Files:**
- Modify: `frontend/src/views/auth/DemoLoginBot.vue`

- [ ] **Step 1: Reemplazar las clases del panel inferior (oscuro → claro con `dark:`)**

Buscar:
```vue
        class="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-900/95 backdrop-blur-sm
               px-4 py-3.5 sm:px-6"
```

Reemplazar por:
```vue
        class="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
               px-4 py-3.5 sm:px-6"
```

- [ ] **Step 2: Reemplazar los colores de texto/badges dentro del panel**

Buscar:
```vue
            <div class="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center">
              <KeyIcon class="w-4 h-4 text-indigo-300" aria-hidden="true" />
            </div>
            <div>
              <p class="text-white text-sm font-medium leading-tight">Entorno de demostración</p>
              <p class="text-slate-400 text-xs leading-tight">Credenciales de solo lectura</p>
            </div>
```

Reemplazar por:
```vue
            <div class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/15 border border-primary-100 dark:border-primary-400/20 flex items-center justify-center">
              <KeyIcon class="w-4 h-4 text-primary-600 dark:text-primary-300" aria-hidden="true" />
            </div>
            <div>
              <p class="text-gray-900 dark:text-white text-sm font-medium leading-tight">Entorno de demostración</p>
              <p class="text-gray-500 dark:text-slate-400 text-xs leading-tight">Credenciales de solo lectura</p>
            </div>
```

- [ ] **Step 3: Reemplazar los 2 botones de credenciales (email/password)**

Buscar (aparece 2 veces con `sm:w-56` y `sm:w-44` respectivamente — reemplazar cada una manteniendo su ancho):
```vue
              class="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/10
                     rounded-lg px-3 py-2 text-left transition min-w-0 sm:w-56"
```
```vue
              class="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/10
                     rounded-lg px-3 py-2 text-left transition min-w-0 sm:w-44"
```

Reemplazar cada una por (mismo ancho, nuevo color):
```vue
              class="flex items-center justify-between gap-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10
                     rounded-lg px-3 py-2 text-left transition min-w-0 sm:w-56"
```
```vue
              class="flex items-center justify-between gap-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10
                     rounded-lg px-3 py-2 text-left transition min-w-0 sm:w-44"
```

Y dentro de esos botones, el texto:
```vue
              <span class="text-slate-300 text-xs font-mono truncate">{{ DEMO_CREDENTIALS.email }}</span>
              <span class="text-indigo-300 text-[11px] font-medium shrink-0">
```
```vue
              <span class="text-slate-300 text-xs font-mono truncate">{{ DEMO_CREDENTIALS.password }}</span>
              <span class="text-indigo-300 text-[11px] font-medium shrink-0">
```

Reemplazar cada `text-slate-300` → `text-gray-700 dark:text-slate-300` y cada `text-indigo-300` → `text-primary-600 dark:text-indigo-300` (2 ocurrencias de cada uno).

- [ ] **Step 4: Botón "Autocompletar" y botón cerrar**

Buscar:
```vue
              class="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium
                     px-4 py-2 rounded-lg transition active:scale-[0.98]"
```

Reemplazar por:
```vue
              class="flex-1 sm:flex-none bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white text-xs font-medium
                     px-4 py-2 rounded-lg transition active:scale-[0.98]"
```

Buscar:
```vue
              class="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
```

Reemplazar por:
```vue
              class="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
```

- [ ] **Step 5: Pill de reabrir**

Buscar:
```vue
        class="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700
               border border-white/10 text-slate-300 text-xs font-medium px-3 py-2 rounded-full
               shadow-lg backdrop-blur-sm transition"
      >
        <KeyIcon class="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
```

Reemplazar por:
```vue
        class="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-gray-50 dark:hover:bg-slate-700
               border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 text-xs font-medium px-3 py-2 rounded-full
               shadow-lg backdrop-blur-sm transition"
      >
        <KeyIcon class="w-3.5 h-3.5 text-primary-600 dark:text-indigo-300" aria-hidden="true" />
```

- [ ] **Step 6: Verificar en el preview**

En `/login`, espera 2 segundos (o recarga) — el widget de demo debe aparecer claro por defecto y oscuro si el tema está en oscuro. Prueba "Copiar" y "Autocompletar" — deben seguir funcionando igual. Sin errores de consola.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/auth/DemoLoginBot.vue
git commit -m "feat(design): DemoLoginBot unificado a la paleta clara con dark:"
```

---

## APLICACIÓN — DASHBOARD

### Task 12: `DashboardLayout.vue` — sidebar de oscura a clara + botón de toggle

**Files:**
- Modify: `frontend/src/layouts/DashboardLayout.vue`

**Interfaces:**
- Consumes: `useThemeStore` (Task 2).

- [ ] **Step 1: Agregar imports**

```ts
import { SunIcon, MoonIcon } from "@heroicons/vue/24/outline";
import { useThemeStore } from "@/stores/theme.store";
```

Y junto a `const auth = useAuthStore();`:
```ts
const theme = useThemeStore();
```

- [ ] **Step 2: Reemplazar el fondo general y el spinner de carga**

Buscar:
```vue
  <div class="min-h-screen flex bg-gray-50">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-500 text-sm">Cargando...</p>
      </div>
    </div>
```

Reemplazar por:
```vue
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-950">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
```

- [ ] **Step 3: Sidebar de escritorio — quitar el fondo oscuro y el glow, pasar a claro**

Buscar:
```vue
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
```

Reemplazar por:
```vue
      <aside class="hidden md:flex md:flex-col w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0">
        <div class="flex flex-col h-full">
          <div class="px-6 py-6 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
                <TicketIcon class="w-5 h-5 text-white" />
              </div>
              <div class="min-w-0">
                <span class="text-gray-900 dark:text-white font-semibold text-base tracking-tight block truncate">TicketFlow</span>
                <span class="text-gray-400 dark:text-gray-500 text-xs block truncate">Panel de control</span>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-500/20 border border-primary-100 dark:border-primary-400/30 text-primary-600 dark:text-primary-300 flex items-center justify-center font-semibold shrink-0">
              {{ auth.user?.name?.charAt(0) ?? "U" }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ displayRole }}</p>
            </div>
          </div>

          <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p class="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Solicitudes</p>
```

- [ ] **Step 4: Items de navegación (escritorio) — activo con `primary-50`/`primary-600` en vez de `indigo-600` sólido**

Buscar (aparece 2 veces en el bloque de escritorio: `navItems` y `adminItems`):
```vue
                :class="[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  (item.exact ? isExactActive : isActive)
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                ]"
```
```vue
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  ]"
```

Reemplazar cada una por (respetando si usa `item.exact ? isExactActive : isActive` o solo `isActive`):
```vue
                :class="[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  (item.exact ? isExactActive : isActive)
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                ]"
```
```vue
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  ]"
```

- [ ] **Step 5: Encabezado "Administración" y footer de logout (escritorio)**

Buscar:
```vue
              <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administración</p>
```
(dentro del bloque de escritorio, no el móvil — hay una ocurrencia idéntica en el bloque móvil que se trata en el Step 7)

Reemplazar por:
```vue
              <p class="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Administración</p>
```

Buscar:
```vue
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
```

Reemplazar por:
```vue
          <div class="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <button
              @click="theme.toggle"
              class="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <SunIcon v-if="theme.mode === 'dark'" class="w-4 h-4" />
              <MoonIcon v-else class="w-4 h-4" />
              {{ theme.mode === "dark" ? "Modo claro" : "Modo oscuro" }}
            </button>
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeftOnRectangleIcon class="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
```

(Nota: el botón de logout pasa de `bg-white/5` genérico a un rojo suave — antes se apoyaba en el fondo oscuro del sidebar para no destacar demasiado; en claro, un logout sin color de advertencia se confunde con el resto de botones secundarios, así que se le da tratamiento `danger` consistente con `BaseButton`.)

- [ ] **Step 6: Menú móvil — mismo criterio (oscuro → claro)**

Buscar:
```vue
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
```

Reemplazar por:
```vue
      <div v-if="mobileOpen" class="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="mobileOpen = false">
        <aside class="w-72 bg-white dark:bg-gray-900 h-full shadow-xl" @click.stop>
          <div class="flex flex-col h-full">
            <div class="p-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                  <TicketIcon class="w-4.5 h-4.5 text-white" />
                </div>
                <span class="text-gray-900 dark:text-white font-semibold">TicketFlow</span>
              </div>
              <button @click="mobileOpen = false" class="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
              <p class="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Solicitudes</p>
```

- [ ] **Step 7: Items de navegación móvil + encabezado admin + footer (mismo patrón que escritorio)**

Buscar (dentro del bloque móvil):
```vue
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    (item.exact ? isExactActive : isActive) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  ]"
```

Reemplazar por:
```vue
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    (item.exact ? isExactActive : isActive) ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  ]"
```

Buscar:
```vue
              <div v-if="showAdminSection" class="border-t border-white/10 pt-3 mt-3">
                <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administración</p>
```

Reemplazar por:
```vue
              <div v-if="showAdminSection" class="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                <p class="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Administración</p>
```

Buscar:
```vue
                    :class="[
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    ]"
```

Reemplazar por:
```vue
                    :class="[
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                      isActive ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    ]"
```

Buscar:
```vue
            <div class="p-4 border-t border-white/10">
              <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <ArrowLeftOnRectangleIcon class="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>
      </div>
```

Reemplazar por:
```vue
            <div class="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <button
                @click="theme.toggle"
                class="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <SunIcon v-if="theme.mode === 'dark'" class="w-4 h-4" />
                <MoonIcon v-else class="w-4 h-4" />
                {{ theme.mode === "dark" ? "Modo claro" : "Modo oscuro" }}
              </button>
              <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <ArrowLeftOnRectangleIcon class="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>
      </div>
```

- [ ] **Step 8: Topbar móvil y contenedor de contenido — claro + `max-w-7xl mx-auto` (pedido explícito del prompt)**

Buscar:
```vue
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

Reemplazar por:
```vue
      <main class="flex-1 flex flex-col min-w-0">
        <div class="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <button @click="mobileOpen = true" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Bars3Icon class="w-6 h-6" />
          </button>
          <div class="flex items-center gap-2">
            <div class="text-right min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ auth.user?.name ?? "TicketFlow" }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ displayRole }}</p>
            </div>
            <div class="h-8 w-8 rounded-full bg-primary-50 dark:bg-primary-500/20 border border-primary-100 dark:border-primary-400/30 text-primary-600 dark:text-primary-300 flex items-center justify-center font-semibold text-sm shrink-0">
              {{ auth.user?.name?.charAt(0) ?? "U" }}
            </div>
          </div>
        </div>

        <div class="flex-1 p-4 md:p-8">
          <div class="max-w-7xl mx-auto">
            <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 min-h-[80vh]">
              <router-view />
            </div>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>
```

- [ ] **Step 9: Verificar en el preview**

Login como admin. El dashboard debe abrir claro (sidebar blanco, item activo con fondo `primary-50` y texto índigo). Haz clic en "Modo oscuro" en el sidebar — todo debe pasar a oscuro (sidebar `gray-900`, contenido `gray-900`, texto blanco) y persistir al recargar. Vuelve a claro. Prueba el menú móvil (`resize_window` a mobile) — mismo comportamiento. Sin errores de consola.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/layouts/DashboardLayout.vue
git commit -m "feat(design): DashboardLayout a sidebar clara con toggle de tema"
```

---

### Task 13: `DashboardHome.vue` a claro + `max-w-7xl` en la grid de métricas

**Files:**
- Modify: `frontend/src/views/dashboard/DashboardHome.vue`

- [ ] **Step 1: Agregar `dark:` a las 4 stat cards**

Buscar cada una de las 4 ocurrencias de:
```vue
        <div v-if="isAdmin" class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-start justify-between">
```
(3 veces, para Usuarios/Roles/Permisos) y:
```vue
        <div class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-start justify-between">
```
(1 vez, para Solicitudes)

Reemplazar cada una por:
```vue
        <div v-if="isAdmin" class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-800 flex items-start justify-between">
```
y
```vue
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-800 flex items-start justify-between">
```
respectivamente.

Dentro de cada card, reemplazar `text-xs text-gray-400 font-medium` → sin cambio (ya funciona en oscuro por contraste suficiente), pero `text-2xl md:text-3xl font-bold text-gray-800 mt-1` → `text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1` (4 ocurrencias), y el ícono `bg-indigo-50 text-indigo-600` → `bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400` (4 ocurrencias).

- [ ] **Step 2: Sección "Activas / Resueltas / Rechazadas"**

Buscar los 3 contenedores con clase `bg-white rounded-2xl shadow-sm p-5 border-l-4` (o similar patrón ya usado para estas 3 cards) y agregar `dark:bg-gray-900` + `dark:text-white`/`dark:text-gray-400` a los textos internos, siguiendo el mismo criterio que el Step 1. (El contenido exacto de estas 3 cards no se tocó en el rediseño anterior — revisar el archivo actual y aplicar `dark:` de forma consistente con el resto: fondo `dark:bg-gray-900`, bordes `dark:border-gray-800`, texto principal `dark:text-white`, texto secundario `dark:text-gray-400`.)

- [ ] **Step 3: Sección "Solicitudes Recientes"**

Aplicar el mismo criterio `dark:` a la card contenedora y a cada fila de solicitud reciente (fondo, texto, `StatusBadge` ya trae su propio `dark:` desde el Task 6 — si esta vista todavía usa badges inline en vez de `<StatusBadge>`, reemplazarlos aquí también, ver Task 15 para el patrón exacto).

- [ ] **Step 4: Link "Ver todas las solicitudes"**

Buscar:
```vue
          class="block text-center text-sm md:text-base text-indigo-600 hover:text-indigo-700 font-medium"
```

Reemplazar por:
```vue
          class="block text-center text-sm md:text-base text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
```

- [ ] **Step 5: Verificar en el preview**

Navega a `/dashboard` como admin, en claro y en oscuro (toggle desde el sidebar). Las 4 stat cards, las 3 cards de resumen y la lista de recientes deben verse bien en ambos modos, con buen contraste. Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/dashboard/DashboardHome.vue
git commit -m "feat(design): DashboardHome con soporte dark: completo"
```

---

### Task 14: `UsersView.vue` — corrige el gap (todavía en `blue-600`) + claro/oscuro

**Files:**
- Modify: `frontend/src/views/dashboard/UsersView.vue`

**Interfaces:**
- Consumes: `BaseButton` (Task 3).

- [ ] **Step 1: Agregar import**

```ts
import BaseButton from "@/components/ui/BaseButton.vue";
```

- [ ] **Step 2: Tabla — fondo, bordes y texto con `dark:`**

Buscar:
```vue
      <table class="w-full bg-white rounded-2xl shadow border border-gray-100">
        <thead class="bg-gray-100 text-gray-700 text-sm">
```

Reemplazar por:
```vue
      <table class="w-full bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-100 dark:border-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
```

Buscar:
```vue
          <tr v-for="user in users" :key="user.id" class="border-t hover:bg-gray-50 transition">
            <td class="p-4 font-medium text-gray-800">{{ user.name }}</td>
            <td class="p-4 text-gray-600">{{ user.email }}</td>
```

Reemplazar por:
```vue
          <tr v-for="user in users" :key="user.id" class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <td class="p-4 font-medium text-gray-800 dark:text-white">{{ user.name }}</td>
            <td class="p-4 text-gray-600 dark:text-gray-400">{{ user.email }}</td>
```

- [ ] **Step 3: Reemplazar el botón "Editar" (`bg-blue-600` — el gap real) por `BaseButton`**

Buscar:
```vue
              <button @click="openEditModal(user)" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Editar</button>
              <button @click="deleteUser(user.id)" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition">Eliminar</button>
```

Reemplazar por:
```vue
              <BaseButton variant="primary" @click="openEditModal(user)" class="px-4 py-2 text-sm">Editar</BaseButton>
              <BaseButton variant="danger-solid" @click="deleteUser(user.id)" class="px-4 py-2 text-sm">Eliminar</BaseButton>
```

- [ ] **Step 4: Fecha de creación y `text-sm text-gray-500`**

Buscar:
```vue
            <td class="p-4 text-sm text-gray-500">{{ formatDate(user.created_at) }}</td>
```

Reemplazar por:
```vue
            <td class="p-4 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(user.created_at) }}</td>
```

- [ ] **Step 5: Modal de edición — fondo y campos con `dark:`, botón "Guardar" a `BaseButton`**

Buscar:
```vue
      <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" @click.stop>
        <h2 class="text-xl font-bold mb-6 text-gray-800">Editar Usuario</h2>
```

Reemplazar por:
```vue
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl" @click.stop>
        <h2 class="text-xl font-bold mb-6 text-gray-800 dark:text-white">Editar Usuario</h2>
```

Buscar (3 veces, para nombre/email/rol — inputs y select del modal):
```vue
            <label class="block text-sm font-medium text-gray-600 mb-1">Nombre</label>
            <input v-model="editForm.name" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
```

Reemplazar por:
```vue
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre</label>
            <input v-model="editForm.name" type="text" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
```

(Aplicar el mismo patrón — `dark:border-gray-600 dark:bg-gray-800 dark:text-white` + `focus:ring-primary-500` en vez de `focus:ring-blue-500` — a los campos de Email y al `<select>` de Rol, que siguen el mismo formato de clases en este archivo.)

Buscar:
```vue
          <button @click="updateUser" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Guardar</button>
          <button @click="closeEditModal" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
```

Reemplazar por:
```vue
          <BaseButton variant="primary" @click="updateUser" class="flex-1 py-2">Guardar</BaseButton>
          <BaseButton variant="secondary" @click="closeEditModal" class="flex-1 py-2">Cancelar</BaseButton>
```

- [ ] **Step 6: Verificar en el preview**

Navega a `/dashboard/users` como admin. La tabla y el botón "Editar" ya no deben verse azules genéricos — deben ser índigo, consistentes con Roles/Permisos/Solicitudes. Prueba abrir el modal de edición, y el toggle de tema. Sin errores de consola.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/dashboard/UsersView.vue
git commit -m "fix(design): UsersView corrige el gap de bg-blue-600 y agrega soporte dark:"
```

---

### Task 15: `RequestsView.vue` — `dark:`, `StatusBadge`/`PriorityBadge`, `BaseButton`

**Files:**
- Modify: `frontend/src/views/dashboard/RequestsView.vue`

**Interfaces:**
- Consumes: `StatusBadge`, `PriorityBadge` (Task 6), `BaseButton` (Task 3).

- [ ] **Step 1: Agregar imports y quitar los objetos de configuración duplicados**

Agregar:
```ts
import StatusBadge from "@/components/ui/StatusBadge.vue";
import PriorityBadge from "@/components/ui/PriorityBadge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
```

Eliminar del `<script setup>` los objetos `statusConfig` y `priorityConfig` (ya no se usan — la lógica vive ahora en los componentes).

- [ ] **Step 2: Reemplazar cada uso inline de badge de estado**

Buscar cualquier ocurrencia de:
```vue
              <span :class="statusConfig[r.status]?.color" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs">
                <span :class="statusConfig[r.status]?.dot" class="w-1.5 h-1.5 rounded-full"/>
                {{ statusConfig[r.status]?.label }}
              </span>
```
(o su variante equivalente en este archivo, con `r` como nombre de variable de la solicitud en el `v-for`)

Reemplazar por:
```vue
              <StatusBadge :status="r.status" />
```

- [ ] **Step 3: Reemplazar cada uso inline de badge de prioridad**

Buscar:
```vue
              <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs">
                {{ priorityConfig[r.priority]?.label }}
              </span>
```

Reemplazar por:
```vue
              <PriorityBadge :priority="r.priority" />
```

- [ ] **Step 4: Botones — reemplazar por `BaseButton` (Editar/Crear/Guardar en índigo, Eliminar en outline rojo)**

Reemplazar cada botón `bg-indigo-600 text-white ... hover:bg-indigo-700` (Editar en tabla/móvil, Crear en modal, Guardar en modal) por `<BaseButton variant="primary">`, manteniendo el resto de atributos (`@click`, `:disabled` si los hay) y el texto/slot interno.

- [ ] **Step 5: Fondos de card/tabla y textos — agregar `dark:` siguiendo el patrón ya usado en el resto del proyecto**

Para cada contenedor `bg-white rounded-2xl shadow-sm border border-gray-100` (tabla desktop, cards móvil, modales), agregar `dark:bg-gray-900 dark:border-gray-800`. Para cada `text-gray-800`/`text-gray-900` (texto principal), agregar `dark:text-white`. Para cada `text-gray-400`/`text-gray-500` (texto secundario), agregar `dark:text-gray-400` o `dark:text-gray-500` según el tono ya usado. Para el banner de error `bg-red-50 border-red-200 text-red-600`, agregar `dark:bg-red-950/40 dark:border-red-900 dark:text-red-400`.

- [ ] **Step 6: Verificar en el preview**

Como usuario regular: crear una solicitud, verla en la tabla con su `StatusBadge`/`PriorityBadge`, editarla, eliminarla — todo debe seguir funcionando igual, con badges visualmente idénticos a como se veían antes (el componente reproduce exactamente el mismo mapeo de colores). Probar en oscuro. Sin errores de consola.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/dashboard/RequestsView.vue
git commit -m "feat(design): RequestsView usa StatusBadge/PriorityBadge/BaseButton + dark:"
```

---

### Task 16: `ManageRequestsView.vue` — mismo patrón que Task 15

**Files:**
- Modify: `frontend/src/views/dashboard/ManageRequestsView.vue`

**Interfaces:**
- Consumes: `StatusBadge`, `PriorityBadge` (Task 6), `BaseButton` (Task 3).

- [ ] **Step 1: Agregar imports, quitar `statusConfig`/`priorityConfig` duplicados**

Mismo patrón que Task 15, Step 1.

- [ ] **Step 2: Reemplazar los usos de `statusConfig[...]`/`priorityConfig[...]` por `<StatusBadge>`/`<PriorityBadge>`**

Este archivo usa `statusConfig[current?.status ?? 'open']` en el modal de gestión y `priorityConfig[r.priority]` en la tabla/cards — reemplazar cada uno por `<StatusBadge :status="current?.status ?? 'open'" />` / `<PriorityBadge :priority="r.priority" />` según corresponda al contexto (tabla, card móvil, o modal de detalle).

- [ ] **Step 3: Botones — `BaseButton`**

Reemplazar "Gestionar" (índigo), "Guardar Cambios" (índigo), "Eliminar"/"Confirmar eliminación" (outline rojo en fila, sólido rojo en modal de confirmación) por las variantes correspondientes de `BaseButton`.

- [ ] **Step 4: Selects, textarea y focus rings — `primary` + `dark:`**

Reemplazar cada `focus:ring-2 focus:ring-indigo-400` por `focus:ring-2 focus:ring-primary-500`, y agregar `dark:bg-gray-800 dark:text-white dark:border-gray-600` a cada `<select>`/`<textarea>` del modal de gestión.

- [ ] **Step 5: Fondos, cards, contadores por estado — `dark:`**

Igual que Task 15 Step 5: agregar `dark:` a cada card/fondo/texto siguiendo el patrón ya establecido. Los 6 contadores de estado (Abiertas/En Progreso/Esperando/Resueltas/Cerradas/Rechazadas) ya usan los colores semánticos correctos (ámbar/azul/violeta/esmeralda/gris/rojo) — solo necesitan su par `dark:` (ej. `bg-amber-50` → agregar `dark:bg-amber-950/40`, etc.), no un componente nuevo (son contadores agregados, no badges de una solicitud individual).

- [ ] **Step 6: Verificar en el preview**

Como admin: abrir "Gestionar", filtrar por estado/prioridad, abrir un ticket, cambiar estado, guardar, ver historial, eliminar con motivo. Todo debe funcionar igual, en claro y oscuro. Sin errores de consola.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/dashboard/ManageRequestsView.vue
git commit -m "feat(design): ManageRequestsView usa StatusBadge/PriorityBadge/BaseButton + dark:"
```

---

### Task 17: `Deletedrequestsview.vue` — mismo patrón

**Files:**
- Modify: `frontend/src/views/dashboard/Deletedrequestsview.vue`

**Interfaces:**
- Consumes: `StatusBadge`, `PriorityBadge` (Task 6), `BaseButton` (Task 3).

- [ ] **Step 1: Agregar imports, quitar `statusConfig`/`priorityConfig` duplicados**

Mismo patrón que Task 15.

- [ ] **Step 2: Reemplazar usos inline por `<StatusBadge>`/`<PriorityBadge>`**

En la tabla, cards móvil, y el modal de detalle.

- [ ] **Step 3: Botón "Ver historial" a `BaseButton`**

Ya está en índigo desde el rediseño anterior — reemplazar la clase inline por `<BaseButton variant="primary">Ver historial</BaseButton>` para consistencia de componente (aunque visualmente no cambie el color).

- [ ] **Step 4: Fondos, cards, modal — `dark:`**

Mismo patrón. El bloque de "Motivo de eliminación" (`bg-red-50 border-red-200`) agrega `dark:bg-red-950/40 dark:border-red-900 dark:text-red-400`; el de "Resolución" (`bg-emerald-50`) agrega `dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400`.

- [ ] **Step 5: Verificar en el preview**

Navega a `/dashboard/deleted-requests` como admin, abre el detalle de una solicitud eliminada, revisa el historial. En claro y oscuro. Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/dashboard/Deletedrequestsview.vue
git commit -m "feat(design): Deletedrequestsview usa StatusBadge/PriorityBadge/BaseButton + dark:"
```

---

### Task 18: `RolesView.vue` — `dark:` + `BaseButton`/`BaseInput`

**Files:**
- Modify: `frontend/src/views/dashboard/RolesView.vue`

**Interfaces:**
- Consumes: `BaseButton` (Task 3), `BaseInput` (Task 4).

- [ ] **Step 1: Agregar imports**

```ts
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
```

- [ ] **Step 2: Formulario "Nuevo Rol" — inputs a `BaseInput`, botón a `BaseButton`**

Reemplazar los 2 `<input>` de nombre/descripción por `<BaseInput v-model="form.name" placeholder="Nombre del rol" />` y `<BaseInput v-model="form.description" placeholder="Descripción (opcional)" />`. Reemplazar el botón "Crear Rol" (`bg-indigo-600 ...`) por `<BaseButton variant="primary" @click="createRole" :disabled="!form.name || actionLoading">` conservando el spinner interno.

- [ ] **Step 3: Tabla, botones "Editar"/"Permisos"/"Eliminar"**

Agregar `dark:` a la card contenedora y a la tabla (mismo patrón que Task 14). Reemplazar "Editar" y "Permisos" (índigo/emerald respectivamente) por `<BaseButton variant="primary">`/`<BaseButton variant="secondary">` según corresponda al color ya usado, y "Eliminar" por `<BaseButton variant="danger">`.

- [ ] **Step 4: Modal de edición y modal de permisos — `BaseInput`/`BaseButton` + `dark:`**

Mismo criterio que Task 14 Step 5.

- [ ] **Step 5: Verificar en el preview**

Como admin: crear un rol de prueba, editarlo, asignar/quitar un permiso, eliminarlo. En claro y oscuro. Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/dashboard/RolesView.vue
git commit -m "feat(design): RolesView usa BaseButton/BaseInput + dark:"
```

---

### Task 19: `PermissionsView.vue` — `dark:` + `BaseButton`/`BaseInput`

**Files:**
- Modify: `frontend/src/views/dashboard/PermissionsView.vue`

**Interfaces:**
- Consumes: `BaseButton` (Task 3), `BaseInput` (Task 4).

- [ ] **Step 1: Agregar imports**

```ts
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
```

- [ ] **Step 2: Botón "+ Nuevo", badge de nombre de permiso (`font-mono`), tabla, paginación**

Reemplazar el botón "+ Nuevo" por `<BaseButton variant="primary">`. El badge `font-mono text-xs px-2.5 py-1 rounded-lg bg-primary-50 text-primary-600` (ya en índigo desde el rediseño anterior) agrega `dark:bg-primary-500/10 dark:text-primary-400`. La tabla y sus filas (incluida la fila "Sistema" con `bg-gray-50 text-gray-400`) agregan `dark:` siguiendo el patrón ya establecido. Los botones de paginación (activo `bg-primary-600 text-white`) agregan `dark:bg-primary-500`.

- [ ] **Step 3: Modal crear/editar — `BaseInput`/`BaseButton`**

Reemplazar los 2 inputs por `<BaseInput>` y el botón "Guardar" por `<BaseButton variant="primary">`.

- [ ] **Step 4: Verificar en el preview**

Como admin: crear un permiso, editarlo, confirmar que uno protegido (`is_protected`) sigue bloqueado, paginar. En claro y oscuro. Sin errores de consola.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/dashboard/PermissionsView.vue
git commit -m "feat(design): PermissionsView usa BaseButton/BaseInput + dark:"
```

---

## APLICACIÓN — ANALÍTICA

### Task 20: Componentes de gráficas (Chart.js) — colores dark-aware

**Files:**
- Modify: `frontend/src/components/analytics/StatusDonutChart.vue`
- Modify: `frontend/src/components/analytics/CategoryBarChart.vue`
- Modify: `frontend/src/components/analytics/MttrChart.vue`
- Modify: `frontend/src/components/analytics/TrendLineChart.vue`

**Interfaces:**
- Consumes: `useThemeStore` (Task 2).
- Produces: `chartOptions` computed que reacciona a `theme.mode`, consumido por el `<Doughnut>`/`<Bar>`/`<Line>` de cada componente.

**Nota técnica:** Chart.js pinta en `<canvas>` con colores JS — no hereda `dark:` de CSS. Cada componente ya tiene un `chartOptions` como constante; se convierte en `computed` que lee `theme.mode` y ajusta el color de texto de leyenda/ejes.

- [ ] **Step 1: `StatusDonutChart.vue` — leyenda dark-aware**

Agregar import:
```ts
import { useThemeStore } from "@/stores/theme.store";
```

Y dentro de `<script setup>`, antes de `chartData`:
```ts
const theme = useThemeStore();
```

Buscar:
```ts
const chartOptions = {
  responsive: true,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 10, font: { size: 11 } } } },
};
```

Reemplazar por:
```ts
const chartOptions = computed(() => ({
  responsive: true,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: { boxWidth: 10, font: { size: 11 }, color: theme.mode === "dark" ? "#d1d5db" : "#374151" },
    },
  },
}));
```

- [ ] **Step 2: `CategoryBarChart.vue` — ejes dark-aware**

Mismo import y `const theme = useThemeStore();`.

Buscar:
```ts
const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};
```

Reemplazar por:
```ts
const chartOptions = computed(() => {
  const gridColor = theme.mode === "dark" ? "#374151" : "#e5e7eb";
  const tickColor = theme.mode === "dark" ? "#9ca3af" : "#6b7280";
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, color: tickColor }, grid: { color: gridColor } },
      x: { ticks: { color: tickColor }, grid: { color: gridColor } },
    },
  };
});
```

- [ ] **Step 3: `MttrChart.vue` — mismo patrón (eje horizontal)**

Mismo import y `const theme = useThemeStore();`.

Buscar:
```ts
const chartOptions = {
  indexAxis: "y" as const,
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
};
```

Reemplazar por:
```ts
const chartOptions = computed(() => {
  const gridColor = theme.mode === "dark" ? "#374151" : "#e5e7eb";
  const tickColor = theme.mode === "dark" ? "#9ca3af" : "#6b7280";
  return {
    indexAxis: "y" as const,
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
      y: { ticks: { color: tickColor }, grid: { color: gridColor } },
    },
  };
});
```

- [ ] **Step 4: `TrendLineChart.vue` — leyenda + ejes dark-aware**

Mismo import; ya tiene `const store = useAnalyticsStore();` — agregar junto a esa línea `const theme = useThemeStore();`.

Buscar:
```ts
const chartOptions = {
  responsive: true,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 10, font: { size: 11 } } } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};
```

Reemplazar por:
```ts
const chartOptions = computed(() => {
  const gridColor = theme.mode === "dark" ? "#374151" : "#e5e7eb";
  const tickColor = theme.mode === "dark" ? "#9ca3af" : "#6b7280";
  return {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { boxWidth: 10, font: { size: 11 }, color: theme.mode === "dark" ? "#d1d5db" : "#374151" },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, color: tickColor }, grid: { color: gridColor } },
      x: { ticks: { color: tickColor }, grid: { color: gridColor } },
    },
  };
});
```

- [ ] **Step 5: Verificar en el preview**

Navega a `/dashboard/analytics`. En claro, las 4 gráficas deben verse igual que antes. Cambia a oscuro desde el sidebar — el texto de leyendas/ejes debe seguir siendo legible (gris claro sobre fondo oscuro), no negro invisible. Sin errores de consola.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/analytics/StatusDonutChart.vue frontend/src/components/analytics/CategoryBarChart.vue frontend/src/components/analytics/MttrChart.vue frontend/src/components/analytics/TrendLineChart.vue
git commit -m "feat(design): graficas de analitica con colores dark-aware (Chart.js no hereda dark: de CSS)"
```

---

### Task 21: Resto de componentes de analítica + `DashboardAnalyticsView.vue` — `dark:` + `BaseCard`

**Files:**
- Modify: `frontend/src/components/analytics/SlaSummaryCard.vue`
- Modify: `frontend/src/components/analytics/FirstResponseCard.vue`
- Modify: `frontend/src/components/analytics/AgentWorkloadTable.vue`
- Modify: `frontend/src/components/analytics/StatusDonutChart.vue`
- Modify: `frontend/src/components/analytics/CategoryBarChart.vue`
- Modify: `frontend/src/components/analytics/MttrChart.vue`
- Modify: `frontend/src/components/analytics/TrendLineChart.vue`
- Modify: `frontend/src/views/dashboard/DashboardAnalyticsView.vue`

**Interfaces:**
- Consumes: `BaseCard` (Task 5).

- [ ] **Step 1: En cada uno de los 7 componentes de analítica, envolver el contenido con `<BaseCard>` en vez del `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">` actual**

Cada componente sigue el mismo patrón: `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"> ... </div>`. Reemplazar la etiqueta contenedora por `<BaseCard>` (que ya trae `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6`), agregando el import correspondiente y quitando las clases redundantes del div (ahora en `BaseCard`). El contenido interno (título, skeleton de loading, mensajes de error/vacío) no cambia de estructura — solo agrega `dark:` a los textos: `text-gray-400` secundario ya funciona en oscuro sin cambio, `text-gray-800`/`text-gray-900` principal agrega `dark:text-white`.

- [ ] **Step 2: `DashboardAnalyticsView.vue` — inputs de fecha y botón "Aplicar" a `BaseInput`/`BaseButton`, título con `dark:`**

Agregar imports:
```ts
import BaseButton from "@/components/ui/BaseButton.vue";
```

Buscar:
```vue
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
```

Reemplazar por:
```vue
        <input
          v-model="dateFrom"
          type="date"
          class="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
        />
        <span class="text-gray-400 dark:text-gray-500 text-sm">a</span>
        <input
          v-model="dateTo"
          type="date"
          class="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
        />
        <BaseButton variant="primary" @click="applyFilters" class="px-4 py-1.5 text-sm">Aplicar</BaseButton>
```

Buscar:
```vue
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Analítica</h1>
        <p class="text-sm text-gray-400 mt-0.5">Indicadores de gestión de solicitudes</p>
```

Reemplazar por:
```vue
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Analítica</h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Indicadores de gestión de solicitudes</p>
```

- [ ] **Step 3: Verificar en el preview**

Navega a `/dashboard/analytics` en claro y oscuro. Todas las cards deben tener bordes/fondos consistentes con el resto del dashboard. El filtro de fechas y "Aplicar" deben seguir funcionando. Sin errores de consola.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/analytics/ frontend/src/views/dashboard/DashboardAnalyticsView.vue
git commit -m "feat(design): componentes de analitica usan BaseCard + dark: completo"
```

---

### Task 22: Verificación end-to-end final

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Recorrido completo en claro**

Con el preview corriendo: `/login` → `/register` → `/forgot-password` → `/reset-password` → login como admin → las 9 pantallas del dashboard (`/dashboard`, `/dashboard/requests`, `/dashboard/manage-requests`, `/dashboard/deleted-requests`, `/dashboard/users`, `/dashboard/roles`, `/dashboard/permissions`, `/dashboard/analytics`). Confirmar que todas se ven con la misma paleta clara (fondo `gray-50`, cards blancas, acento índigo `primary-600`) y que `read_console_messages` con `onlyErrors: true` está vacío en cada una.

- [ ] **Step 2: Toggle a oscuro y repetir el recorrido**

Activar el toggle desde el sidebar del dashboard (o desde el login). Confirmar que la preferencia persiste al navegar entre rutas (SPA) y al recargar la página (`localStorage`). Repetir la navegación por las 9 pantallas del dashboard y las 4 de auth en modo oscuro, confirmando contraste legible en cada una (texto, bordes, botones, badges, gráficas) y consola sin errores.

- [ ] **Step 3: Probar interacciones clave en ambos modos**

Crear/editar/eliminar una solicitud, crear un rol y un permiso de prueba (limpiar después), cambiar la granularidad de la gráfica de tendencia — confirmar que ninguna acción se rompió por los cambios de clases.

- [ ] **Step 4: Mobile**

`resize_window` a `mobile` (375×812). Repetir un recorrido corto (login, dashboard, una vista con tabla) en claro y oscuro, confirmando que el drawer móvil y las tablas responsive siguen funcionando.

- [ ] **Step 5: Captura de evidencia**

Screenshot de `/dashboard` en claro y en oscuro como evidencia final.

No requiere commit (tarea de verificación).
