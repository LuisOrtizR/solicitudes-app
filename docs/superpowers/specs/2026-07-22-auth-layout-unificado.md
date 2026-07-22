# Auth Unificado — Layout Compartido de Dos Columnas — Diseño

## Contexto

Vía un prompt externo sobre "Auth unificado + Paginación real y filtros en TicketFlow", se identificaron dos frentes técnicamente independientes. Por decisión explícita del usuario, se abordan como dos ciclos spec→plan→ejecución separados. Este documento cubre **solo la Parte 1: unificación del layout de autenticación**. La Parte 2 (paginación real en backend + filtros) se especificará en un documento aparte una vez cerrada esta parte.

## Hallazgos de la inspección (Paso 0)

- `LoginView.vue` tiene **hardcodeado** el layout de dos columnas: panel izquierdo de branding (logo, headline, 4 bullets de features, copyright) y panel derecho (toggle de tema + formulario). Este layout no vive en ningún componente compartido.
- `AuthLayout.vue` es hoy solo un wrapper trivial: `<div class="auth-layout bg-gray-50 dark:bg-gray-950 min-h-screen"><router-view /></div>`. No aporta estructura visual real.
- `RegisterView.vue`, `ForgotPasswordView.vue` y `ResetPasswordView.vue` usan un patrón distinto entre sí y respecto a Login: card centrada de una columna (`min-h-screen flex items-center justify-center` + `bg-white dark:bg-gray-900 rounded-2xl border p-6/p-8`), sin panel de branding y **sin toggle de tema visible** (heredan el modo oscuro/claro global vía la clase en `<html>`, pero no tienen botón para cambiarlo).
- El toggle de tema (`SunIcon`/`MoonIcon` + `useThemeStore().toggle()`) está declarado únicamente dentro de `LoginView.vue`.
- Register/Forgot/Reset ya usan `BaseButton` para sus botones de submit (de la sesión de sistema de diseño), pero usan `<input>` nativo con ícono superpuesto en vez de `BaseInput`, por incompatibilidad de estilos con el ícono — decisión tomada en esa sesión anterior, ahora se revierte al extender `BaseInput`.
- `BaseInput.vue` actual: props `modelValue`, `type?`, `placeholder?`, `label?`, `autocomplete?`. No soporta ícono.
- `DemoLoginBot.vue` (widget flotante de credenciales demo) está anidado dentro del template de `LoginView.vue`, usa posicionamiento `fixed` y emite `@autofill` que `LoginView` escucha para rellenar sus propios `email`/`password` refs.
- El estado del tema (`theme.store.ts`, Pinia) ya persiste en `localStorage` y aplica la clase `dark` a `document.documentElement` de forma global — mover el botón de toggle a `AuthLayout` no requiere cambios en el store, solo reubicar el `<button>`.

## Decisiones

1. **`AuthLayout.vue` se convierte en el shell real de dos columnas.** El panel izquierdo (contenido fijo: logo, headline, 4 bullets, copyright) y el panel derecho (toggle de tema, logo mobile, contenedor del formulario) se mueven aquí desde `LoginView.vue`. El panel izquierdo es **idéntico en las 4 pantallas** — decisión explícita del usuario, no varía el copy por vista.
2. **Cada vista de auth se reduce a solo su formulario**: heading, banner de error/éxito, campos, botón de submit, link de navegación relacionado (ej. "¿No tienes cuenta?"). Sin `min-h-screen`, sin fondo propio, sin card propia, sin toggle propio.
3. **Se incluyen las 4 pantallas** (Login, Register, ForgotPassword, **ResetPassword**) — decisión explícita del usuario de incluir Reset aunque el prompt original solo mencionara 3, para no dejar la misma inconsistencia sin resolver en una pantalla del mismo flujo.
4. **`DemoLoginBot` se queda dentro de `LoginView.vue`**, sin cambios — solo aplica a login, y su posicionamiento `fixed` funciona igual sin importar en qué nivel del árbol de componentes esté anidado.
5. **Transición entre vistas hijas**: fade + slide corto (translate-x ~8px, 150ms, `mode="out-in"`) en el `<router-view>` de `AuthLayout`, usando `<transition>` de Vue. Las clases de cada fase se pasan directamente como props (`enter-active-class`, `enter-from-class`, etc.) con utilidades Tailwind puras (`transition`, `duration-150`, `opacity-0`, `translate-x-2`...) — sin bloque `<style>` ni selectores CSS custom (ver sección técnica).
6. **`BaseInput.vue` se extiende con un prop opcional `icon?: Component`.** Si se pasa, renderiza el ícono en posición absoluta a la izquierda (mismo padding/posición en las 4 pantallas) y ajusta el padding izquierdo del input (`pl-10`). Sin el prop, `BaseInput` se comporta exactamente igual que hoy (compatible con sus usos actuales en el resto del dashboard — Roles, Permisos — que no pasan ícono).
7. **Los 4 formularios usan `BaseInput` con `icon`** en vez de `<input>` nativo con ícono superpuesto — elimina la duplicación de estilos y garantiza consistencia real (mismo componente, no clases copiadas).
8. **Los estados de validación por campo (borde rojo si el campo fue tocado y es inválido) de Register/Forgot/Reset se conservan tal cual** — es UX de validación existente, no se toca. El prompt solo pide uniformar padding/radius/color primario/focus, no el comportamiento de validación.

## Diseño técnico

### `AuthLayout.vue`

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
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-50 dark:bg-gray-900 p-12 xl:p-16 flex-col justify-between border-r border-primary-100 dark:border-gray-800">
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

    <!-- PANEL DERECHO -->
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
        <div class="flex lg:hidden items-center justify-center gap-2.5 mb-8">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <TicketIcon class="w-4.5 h-4.5 text-white" />
          </div>
          <span class="text-gray-900 dark:text-white font-semibold text-base">TicketFlow</span>
        </div>

        <router-view v-slot="{ Component }">
          <transition name="auth-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>
```

Transición vía clases Tailwind puras (sin `<style>` custom), usando los hooks de nombre `auth-fade-*` que Vue resuelve automáticamente y los `transition="..."` con clases utilitarias aplicadas por props explícitos de `<transition>` (`enter-active-class`, etc.), que sí acepta cadenas de clases Tailwind directamente:

```vue
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
```

(Se usan los props `enter-active-class`/etc. de `<transition>` en vez de un bloque `<style>` con selectores `.auth-fade-enter-from` — así todo queda en clases Tailwind inline, sin CSS personalizado, cumpliendo la restricción del prompt.)

### `BaseInput.vue` — prop `icon`

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
      <component :is="icon" v-if="icon" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :class="[
          'w-full py-2.5 pr-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 transition',
          icon ? 'pl-10' : 'pl-3',
        ]"
      />
    </div>
  </div>
</template>
```

Nota: la lógica de borde rojo en campo inválido-tocado que ya tienen Register/Forgot/Reset se aplica desde la vista consumidora vía una clase adicional pasada por prop `class` (Vue hace merge de clases en el elemento raíz), sin modificar la API interna de `BaseInput` para eso — se mantiene la separación entre "estilo base" (en el componente) y "estado de validación" (en cada vista, que ya lo calculaba).

### Vistas de auth — patrón resultante

Cada vista (`LoginView`, `RegisterView`, `ForgotPasswordView`, `ResetPasswordView`) queda reducida a:

```vue
<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">{{ /* título propio de cada vista */ }}</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">{{ /* subtítulo propio */ }}</p>

    <div v-if="error" role="alert" class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20">
      {{ error }}
    </div>

    <form @submit.prevent="submit" class="space-y-4" novalidate>
      <BaseInput v-model="email" type="email" :icon="EnvelopeIcon" placeholder="..." autocomplete="email" />
      <!-- ...resto de campos... -->
      <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">...</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">{{ /* link relacionado */ }}</p>
  </div>
</template>
```

`LoginView.vue` conserva además `<DemoLoginBot @autofill="handleAutofill" />` como segundo nodo raíz (Vue 3 permite múltiples raíces en `<template>`).

## Fuera de alcance

- No se toca la Parte 2 (paginación/filtros) — spec separado, después de esta.
- No se modifica el comportamiento de validación de formularios (reglas de `isValid`, mensajes de error) — solo el contenedor visual y el componente de input usado.
- No se agregan páginas ni rutas nuevas.
- `theme.store.ts` no cambia — solo se reubica el botón que llama a `toggle()`.
- No se toca `DemoLoginBot.vue` internamente.
