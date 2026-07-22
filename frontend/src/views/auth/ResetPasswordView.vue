<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { useRouter, useRoute } from "vue-router";
import { authApi } from "../../api/endpoints/auth.api";
import BaseButton from "@/components/ui/BaseButton.vue";

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

const inputClass = (valid: boolean, touched: boolean) => [
  "w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white",
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400",
];

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
