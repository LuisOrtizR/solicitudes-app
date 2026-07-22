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
