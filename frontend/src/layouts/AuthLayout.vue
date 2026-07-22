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

        <router-view v-slot="{ Component, route }">
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-x-2"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-2"
            mode="out-in"
          >
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>
