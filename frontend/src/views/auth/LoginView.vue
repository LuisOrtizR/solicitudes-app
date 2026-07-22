<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import {
  EnvelopeIcon,
  LockClosedIcon,
  TicketIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/vue/24/outline";
import DemoLoginBot from "@/views/auth/DemoLoginBot.vue";
import { useThemeStore } from "@/stores/theme.store";

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();

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

const features = [
  {
    icon: TicketIcon,
    title: "Tickets centralizados",
    desc: "Todas las solicitudes en un solo flujo de trabajo.",
  },
  {
    icon: ClockIcon,
    title: "SLA en tiempo real",
    desc: "Alertas automáticas antes de vencer un acuerdo de servicio.",
  },
  {
    icon: UserGroupIcon,
    title: "Colaboración por equipos",
    desc: "Asigna, comenta y escala sin salir del ticket.",
  },
  {
    icon: ChartBarIcon,
    title: "Métricas accionables",
    desc: "Visualiza carga, tiempos de respuesta y cuellos de botella.",
  },
];
</script>

<template>
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
