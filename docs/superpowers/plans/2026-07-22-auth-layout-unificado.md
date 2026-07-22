# Auth Unificado — Layout Compartido de Dos Columnas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover el layout de dos columnas (branding + formulario) de `LoginView.vue` hacia `AuthLayout.vue`, para que Login/Register/ForgotPassword/ResetPassword compartan un único shell, con toggle de tema centralizado, transición entre vistas, y un `BaseInput` extendido con ícono reutilizado en los 4 formularios.

**Architecture:** `AuthLayout.vue` deja de ser un `<router-view/>` trivial y pasa a renderizar el panel izquierdo de branding (contenido fijo) + panel derecho (toggle de tema + `<router-view>` envuelto en `<transition>`). Cada vista de auth se reduce a únicamente su fragmento de formulario. `BaseInput.vue` gana un prop opcional `icon` que, si se pasa, renderiza el ícono absoluto a la izquierda y ajusta el padding — sin romper sus usos actuales sin ícono (Roles, Permisos).

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Tailwind CSS v4 (clases utilitarias únicamente, sin CSS custom), Pinia (`theme.store.ts` ya existente, sin cambios), Heroicons.

## Global Constraints

- Solo clases utilitarias de Tailwind — nada de CSS custom, archivos `.css` nuevos, ni estilos inline con objetos JS.
- Reutilizar componentes existentes (`BaseInput`, `BaseButton`) en vez de duplicar markup.
- No tocar lógica de negocio: validaciones (`isValid`, reglas de cada campo), llamadas a `auth.store`/`authApi`, ni el store `theme.store.ts`.
- No agregar rutas nuevas ni librerías nuevas.
- Verificación en cada tarea: `npm run type-check` (proyecto no tiene suite de tests automatizada; este es el único chequeo automatizado disponible) + verificación manual en el preview del navegador (claro y oscuro donde aplique).
- Commit por tarea, mensaje con prefijo `feat(auth):` o `refactor(auth):` según corresponda.

---

### Task 1: Extender `BaseInput.vue` con prop `icon`

**Files:**
- Modify: `frontend/src/components/ui/BaseInput.vue`

**Interfaces:**
- Consumes: nada nuevo (Vue `Component` type de `"vue"`).
- Produces: prop opcional `icon?: Component` en `BaseInput`. Cuando se pasa, el input reserva `pl-10` a la izquierda para el ícono; cuando no se pasa, se comporta exactamente igual que hoy (`pl-3`). Los usos existentes sin `icon` (en `RolesView.vue`, `PermissionsView.vue`) no requieren cambios.

- [ ] **Step 1: Leer el archivo actual para confirmar el estado exacto**

Contenido actual esperado (confirmado en el spec):
```vue
<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    label?: string;
    autocomplete?: string;
  }>(),
  { type: "text" }
);
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 w-full"
    />
  </div>
</template>
```
(Si el contenido real difiere ligeramente en clases, mantener las clases existentes tal cual y solo aplicar los cambios de los pasos 2-3.)

- [ ] **Step 2: Agregar el prop `icon` y ajustar el template**

Reemplazar el contenido completo por:

```vue
<script setup lang="ts">
import type { Component } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    label?: string;
    autocomplete?: string;
    icon?: Component;
  }>(),
  { type: "text" }
);
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">{{ label }}</label>
    <div class="relative">
      <component
        :is="icon"
        v-if="icon"
        class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
      />
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :class="[
          'border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg py-2.5 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 w-full',
          icon ? 'pl-10' : 'pl-3',
        ]"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores (el `Component` importado de `"vue"` es un tipo estándar, no requiere ajustes de `tsconfig`).

- [ ] **Step 4: Verificar que los usos existentes sin `icon` no se rompieron**

En el preview del navegador, abrir `/dashboard/roles` y `/dashboard/permissions`, abrir el modal de crear/editar (usa `BaseInput` sin `icon`), confirmar visualmente que el input se ve igual que antes (sin hueco a la izquierda, `pl-3`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/BaseInput.vue
git commit -m "feat(auth): BaseInput soporta prop icon opcional"
```

---

### Task 2: Reconstruir `AuthLayout.vue` como shell de dos columnas

**Files:**
- Modify: `frontend/src/layouts/AuthLayout.vue`

**Interfaces:**
- Consumes: `useThemeStore()` de `@/stores/theme.store` (ya existente, `mode` y `toggle()`).
- Produces: el shell visual completo (panel izquierdo + panel derecho + toggle + transición) que las vistas hijas (Task 3-6) asumen que ya existe — ellas ya NO deben renderizar su propio `min-h-screen`/fondo/card/toggle.

- [ ] **Step 1: Reemplazar el contenido completo de `AuthLayout.vue`**

```vue
<script setup lang="ts">
import { TicketIcon, ClockIcon, UserGroupIcon, ChartBarIcon, SunIcon, MoonIcon } from "@heroicons/vue/24/outline";
import { useThemeStore } from "@/stores/theme.store";

const theme = useThemeStore();

const features = [
  { icon: TicketIcon, title: "Tickets centralizados", desc: "Todas las solicitudes en un solo flujo de trabajo." },
  { icon: ClockIcon, title: "SLA en tiempo real", desc: "Alertas automáticas antes de vencer un acuerdo de servicio." },
  { icon: UserGroupIcon, title: "Colaboración por equipos", desc: "Asigna, comenta y escala sin salir del ticket." },
  { icon: ChartBarIcon, title: "Métricas accionables", desc: "Visualiza carga, tiempos de respuesta y cuellos de botella." },
];
</script>

<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-950">
    <!-- PANEL IZQUIERDO — Branding (idéntico en las 4 pantallas) -->
    <div
      class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-50 dark:bg-gray-900 p-12 xl:p-16 flex-col justify-between border-r border-primary-100 dark:border-gray-800"
    >
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

        <router-view v-slot="{ Component }">
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-x-2"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-2"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: fallará o mostrará errores en `LoginView.vue`/`RegisterView.vue`/etc. si estas aún declaran su propio `min-h-screen` wrapper duplicado — eso es esperado, se corrige en las Tasks 3-6. Si el error es solo de esas vistas (no de `AuthLayout.vue` en sí), continuar; si `AuthLayout.vue` mismo tiene un error de tipos, corregirlo antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layouts/AuthLayout.vue
git commit -m "feat(auth): AuthLayout es el shell real de dos columnas con transicion"
```

(Nota: en este punto la app puede verse visualmente duplicada — panel de branding de `AuthLayout` + el viejo layout de `LoginView` anidado dentro — hasta completar la Task 3. Es un estado intermedio esperado dentro del mismo ciclo de tareas; no se navega a producción entre tareas.)

---

### Task 3: Reducir `LoginView.vue` a solo su formulario

**Files:**
- Modify: `frontend/src/views/auth/LoginView.vue`

**Interfaces:**
- Consumes: `AuthLayout.vue` (Task 2) ya provee el shell — `LoginView` ya no necesita `min-h-screen`, fondo, panel izquierdo, ni botón de toggle.
- Produces: nada consumido por otras vistas (es una hoja).

- [ ] **Step 1: Reemplazar el contenido completo de `LoginView.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import DemoLoginBot from "@/views/auth/DemoLoginBot.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

const isValid = computed(() => email.value.includes("@") && password.value.length >= 6);

const submit = async () => {
  if (!isValid.value) return;
  try {
    loading.value = true;
    error.value = null;
    await auth.login({ email: email.value, password: password.value });
    router.push("/dashboard");
  } catch (err: any) {
    error.value = err?.response?.data?.message || "Credenciales inválidas";
  } finally {
    loading.value = false;
  }
};

const handleAutofill = (payload: { email: string; password: string }) => {
  email.value = payload.email;
  password.value = payload.password;
};
</script>

<template>
  <div>
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
        <BaseInput v-model="email" type="email" autocomplete="email" placeholder="tu@empresa.com" :icon="EnvelopeIcon" />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-medium text-gray-600 dark:text-slate-300">Contraseña</label>
          <RouterLink to="/forgot-password" class="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition">
            ¿Olvidaste tu contraseña?
          </RouterLink>
        </div>
        <BaseInput v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" :icon="LockClosedIcon" />
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

    <DemoLoginBot @autofill="handleAutofill" />
  </div>
</template>
```

Nota: se mantiene el botón de submit nativo (no `BaseButton`) porque su estilo exacto (`bg-primary-600`, `hover:bg-primary-700 dark:hover:bg-primary-500`) ya coincide con la variante `primary` de `BaseButton` — se deja así para no ampliar el diff; es una decisión de bajo riesgo ya que el resultado visual es idéntico. (Si se prefiere usar `BaseButton` aquí también, es un cambio opcional de una línea, no bloqueante.)

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Verificar en el preview**

Navegar a `/login`. Confirmar:
- Panel izquierdo de branding visible (desktop) con logo, headline, 4 bullets, copyright.
- Formulario con inputs de ícono (sobre + candado) usando `BaseInput`.
- Botón de toggle de tema visible arriba a la derecha del panel derecho — clic, confirmar que cambia a oscuro y el panel izquierdo también cambia de paleta.
- `DemoLoginBot` (widget flotante) sigue funcionando: autocompletar credenciales, hacer login.
- Sin errores nuevos en consola (comparar con el histórico ya conocido de 401/Network Error de sesiones previas).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/auth/LoginView.vue
git commit -m "refactor(auth): LoginView reducido a su formulario, usa BaseInput con icono"
```

---

### Task 4: Reducir `RegisterView.vue` a solo su formulario

**Files:**
- Modify: `frontend/src/views/auth/RegisterView.vue`

**Interfaces:**
- Consumes: `AuthLayout.vue` (Task 2), `BaseInput` con `icon` (Task 1).

- [ ] **Step 1: Reemplazar el contenido completo de `RegisterView.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { UserIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

const name = ref("");
const email = ref("");
const password = ref("");

const error = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

const isNameValid = computed(() => name.value.trim().length >= 3);
const isEmailValid = computed(() => /\S+@\S+\.\S+/.test(email.value));
const isPasswordValid = computed(() => password.value.length >= 6);
const isValid = computed(() => isNameValid.value && isEmailValid.value && isPasswordValid.value);

const inputBorderClass = (valid: boolean, touched: boolean) =>
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-red-400 focus:border-red-400";

const submit = async () => {
  if (!isValid.value || loading.value) return;

  try {
    loading.value = true;
    error.value = null;

    await auth.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
    });

    router.push("/dashboard");
  } catch (err: any) {
    error.value = err?.response?.data?.message || "Error al registrarse";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Crear Cuenta</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">Regístrate para empezar a gestionar tickets.</p>

    <div
      v-if="error"
      role="alert"
      aria-live="assertive"
      class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
    >
      {{ error }}
    </div>

    <form @submit.prevent="submit" class="space-y-4" novalidate>
      <BaseInput
        v-model="name"
        type="text"
        autocomplete="name"
        placeholder="Nombre completo"
        :icon="UserIcon"
        :class="inputBorderClass(isNameValid, name.length > 0)"
      />

      <BaseInput
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="Correo electrónico"
        :icon="EnvelopeIcon"
        :class="inputBorderClass(isEmailValid, email.length > 0)"
      />

      <BaseInput
        v-model="password"
        type="password"
        autocomplete="new-password"
        placeholder="Contraseña (mínimo 6 caracteres)"
        :icon="LockClosedIcon"
        :class="inputBorderClass(isPasswordValid, password.length > 0)"
      />

      <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
        <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
          <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
        </svg>
        {{ loading ? "Creando..." : "Registrarse" }}
      </BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      ¿Ya tienes cuenta?
      <RouterLink to="/login" class="text-primary-600 dark:text-primary-400 hover:underline font-medium">
        Inicia sesión
      </RouterLink>
    </p>
  </div>
</template>
```

**Nota técnica sobre `:class="inputBorderClass(...)"` en `BaseInput`:** `BaseInput` es un componente de un solo elemento raíz (`<div>` envolviendo label+input), por lo que el fallthrough automático de atributos de Vue 3 aplica la clase pasada al `<div>` raíz, **no** al `<input>` interno donde está el `border-*`. Esto es un cambio de comportamiento respecto al `<input>` nativo anterior (donde la clase sí pisaba el borde del input directamente). Para que el borde rojo de validación siga funcionando visualmente iguial que antes, es necesario que `BaseInput` reenvíe explícitamente los atributos de clase al `<input>` interno en vez de al wrapper. Ver Task 1 — Step 2b (a continuación, antes de continuar con este Task 4) para el ajuste necesario en `BaseInput.vue`.

- [ ] **Step 1b: (Depende de Task 1) Ajustar `BaseInput.vue` para reenviar `class` al `<input>` interno**

Volver a `frontend/src/components/ui/BaseInput.vue` (ya con el prop `icon` de la Task 1) y agregar `inheritAttrs: false` + `v-bind="$attrs"` en el `<input>`:

```vue
<script setup lang="ts">
import type { Component } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    label?: string;
    autocomplete?: string;
    icon?: Component;
  }>(),
  { type: "text" }
);
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">{{ label }}</label>
    <div class="relative">
      <component
        :is="icon"
        v-if="icon"
        class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
      />
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        v-bind="$attrs"
        :class="[
          'border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg py-2.5 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 w-full',
          icon ? 'pl-10' : 'pl-3',
        ]"
      />
    </div>
  </div>
</template>
```

Nota: Vue 3 mezcla automáticamente cualquier `class` que llegue vía `v-bind="$attrs"` con el binding `:class` explícito del mismo elemento — ambas fuentes se concatenan, no se reemplazan entre sí, sin importar el orden en que aparezcan los bindings en el template.

Esto no rompe los usos existentes sin `class` extra (Roles, Permisos, Login, Forgot, Reset) — cuando no se pasa `class` desde el padre, `$attrs` simplemente no aporta nada adicional.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Verificar en el preview**

Navegar a `/register`. Confirmar:
- Mismo panel de branding que login (compartido vía `AuthLayout`).
- 3 campos con íconos (usuario, sobre, candado) vía `BaseInput`.
- Escribir un nombre de 1 carácter y luego borrar el foco (blur) — confirmar que el borde del input se pone rojo (validación existente sigue funcionando tras el cambio de Step 1b).
- Botón "Registrarse" usa `BaseButton` variant primary, mismo look que en login.
- Transición al navegar desde `/login` (clic en "Regístrate") — debe verse un fade+slide corto, no un salto.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/BaseInput.vue frontend/src/views/auth/RegisterView.vue
git commit -m "refactor(auth): RegisterView reducido a su formulario, BaseInput reenvia class al input interno"
```

---

### Task 5: Reducir `ForgotPasswordView.vue` a solo su formulario

**Files:**
- Modify: `frontend/src/views/auth/ForgotPasswordView.vue`

**Interfaces:**
- Consumes: `AuthLayout.vue` (Task 2), `BaseInput` con `icon` + reenvío de `class` (Task 1 + Task 4 Step 1b).

- [ ] **Step 1: Reemplazar el contenido completo de `ForgotPasswordView.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { EnvelopeIcon } from "@heroicons/vue/24/outline";
import { authApi } from "../../api/endpoints/auth.api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

const email = ref("");
const loading = ref(false);
const success = ref(false);
const error = ref<string | null>(null);

const isValid = computed(() => email.value.includes("@"));

const submit = async () => {
  if (!isValid.value) return;

  try {
    loading.value = true;
    error.value = null;

    await authApi.forgot(email.value);

    success.value = true;
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || "Error enviando instrucciones";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Recuperar Contraseña</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">Te enviaremos instrucciones para restablecerla.</p>

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
      class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
    >
      {{ error }}
    </div>

    <form v-if="!success" @submit.prevent="submit" class="space-y-4">
      <BaseInput
        v-model="email"
        type="email"
        placeholder="Correo electrónico"
        :icon="EnvelopeIcon"
        :class="isValid
          ? 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
          : 'border-red-400 dark:border-red-500 focus:ring-red-400'"
      />

      <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
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
</template>
```

Nota: la condición `isValid ? 'border-gray-300...' : 'border-red-400...'` es exactamente la misma que ya usa el archivo original (sin distinción de "campo tocado") — se conserva tal cual, sin alterar el comportamiento existente de mostrar el borde rojo desde que el campo está vacío.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Verificar en el preview**

Navegar a `/forgot-password` (desde el link "¿Olvidaste tu contraseña?" en login). Confirmar:
- Mismo panel de branding.
- Toggle de tema visible y funcional.
- Campo de correo con ícono de sobre.
- Enviar con un correo válido — confirmar que aparece el banner verde de éxito y el form se oculta.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/auth/ForgotPasswordView.vue
git commit -m "refactor(auth): ForgotPasswordView reducido a su formulario"
```

---

### Task 6: Reducir `ResetPasswordView.vue` a solo su formulario

**Files:**
- Modify: `frontend/src/views/auth/ResetPasswordView.vue`

**Interfaces:**
- Consumes: `AuthLayout.vue` (Task 2), `BaseInput` con `icon` + reenvío de `class` (Task 1 + Task 4 Step 1b).

- [ ] **Step 1: Reemplazar el contenido completo de `ResetPasswordView.vue`**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { useRouter, useRoute } from "vue-router";
import { authApi } from "../../api/endpoints/auth.api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

const password = ref("");
const confirmPassword = ref("");
const error = ref<string | null>(null);
const success = ref(false);
const loading = ref(false);
const token = ref<string | null>(null);

const router = useRouter();
const route = useRoute();

onMounted(() => {
  token.value = (route.query.token as string) || null;
  if (!token.value) {
    error.value = "Token inválido o expirado. Solicita un nuevo enlace.";
  }
});

const isPasswordValid = computed(() => password.value.length >= 8);
const passwordsMatch = computed(
  () => confirmPassword.value.length > 0 && password.value === confirmPassword.value
);
const isValid = computed(() => isPasswordValid.value && passwordsMatch.value);

const borderClass = (valid: boolean, touched: boolean) =>
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-red-400";

const submit = async () => {
  if (!isValid.value || !token.value || loading.value) return;

  try {
    loading.value = true;
    error.value = null;

    await authApi.reset(token.value, password.value);

    success.value = true;
    setTimeout(() => router.push("/login"), 2000);
  } catch (err: any) {
    error.value = err?.response?.data?.message || "Error al restablecer contraseña";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Nueva Contraseña</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">Elige una nueva contraseña para tu cuenta.</p>

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
      class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
    >
      {{ error }}
    </div>

    <form v-if="!success && token" @submit.prevent="submit" class="space-y-4" novalidate>
      <BaseInput
        v-model="password"
        type="password"
        autocomplete="new-password"
        placeholder="Nueva contraseña (mín. 8 caracteres)"
        :icon="LockClosedIcon"
        :class="borderClass(isPasswordValid, password.length > 0)"
      />

      <BaseInput
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        placeholder="Confirmar contraseña"
        :icon="LockClosedIcon"
        :class="borderClass(passwordsMatch, confirmPassword.length > 0)"
      />

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
</template>
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Verificar en el preview**

Navegar a `/reset-password` (sin `?token=`). Confirmar:
- Mismo panel de branding.
- Mensaje "Token inválido o expirado" visible, form oculto, link "Solicitar nuevo enlace" visible.
- Navegar a `/reset-password?token=cualquier-cosa` — confirmar que el form aparece con 2 campos de contraseña con ícono de candado.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/auth/ResetPasswordView.vue
git commit -m "refactor(auth): ResetPasswordView reducido a su formulario"
```

---

### Task 7: Verificación final end-to-end

**Files:** ninguno (solo verificación, sin cambios de código).

- [ ] **Step 1: Recorrido completo en modo claro**

En el preview del navegador, recorrer en orden: `/login` → clic "Regístrate" → `/register` → clic "Inicia sesión" → `/login` → clic "¿Olvidaste tu contraseña?" → `/forgot-password` → clic "Volver al login" → `/login`. Confirmar en cada paso:
- El panel izquierdo de branding NO desaparece ni parpadea entre navegaciones (permanece montado, solo cambia el panel derecho).
- Se percibe la transición fade+slide corta al cambiar de vista.
- Los 3 formularios tienen el mismo ancho, mismo padding de inputs, mismo radius, mismo color primario en focus.

- [ ] **Step 2: Toggle de tema persiste entre vistas**

Desde `/login`, activar modo oscuro con el botón toggle. Navegar a `/register`, `/forgot-password`, `/reset-password` (sin recargar la página, solo vía los links internos) — confirmar que el modo oscuro se mantiene activo en las 4 pantallas sin tener que volver a hacer clic en el toggle en cada una (el estado vive en `AuthLayout`/Pinia, no en cada vista hija).

- [ ] **Step 3: Recorrido completo en modo oscuro**

Repetir el Step 1 con el tema en oscuro. Confirmar que las 4 pantallas (incluyendo `/reset-password?token=x`) se ven correctamente oscuras: fondo `gray-950`, panel izquierdo `gray-900`, inputs `gray-800`, sin ningún bloque blanco residual.

- [ ] **Step 4: Mobile**

Redimensionar el preview a 375px de ancho. Confirmar en `/login` y `/register`:
- El panel izquierdo de branding está oculto (`hidden lg:flex`).
- El logo pequeño centrado aparece en su lugar.
- No hay overflow horizontal.
- El toggle de tema sigue siendo clickeable (arriba a la derecha).

- [ ] **Step 5: Consola sin errores nuevos**

Revisar `read_console_messages` en cada pantalla — comparar contra el histórico ya conocido de errores 401/Network Error de sesiones previas (no relacionados con este cambio). Confirmar que no aparecen errores nuevos de Vue (`[Vue warn]`, `Failed to resolve component`, etc.) introducidos por el refactor.

- [ ] **Step 6: Login funcional de extremo a extremo**

Usar `DemoLoginBot` en `/login` para autocompletar credenciales de admin y confirmar que el login real sigue funcionando (redirige a `/dashboard`).

(Sin commit en esta tarea — es solo verificación. Si se encuentra algún problema, corregirlo en el archivo correspondiente y hacer un commit de fix antes de continuar.)

---

## Cierre

Al completar la Task 7 sin hallazgos, invocar `superpowers:finishing-a-development-branch` (ya en `master`, sin worktree — ofrecer push a `origin/master` siguiendo el patrón establecido en esta sesión).
