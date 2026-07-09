<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { useRouter, useRoute } from "vue-router";
import { authApi } from "../../api/endpoints/auth.api";

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
  "w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base",
  !touched || valid
    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
    : "border-red-400 focus:ring-2 focus:ring-red-400",
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
  <div class="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900">
    <div class="w-full max-w-md bg-white shadow-2xl rounded-2xl p-6 sm:p-8">
      <h1 class="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-6">
        Nueva Contraseña
      </h1>

      <div
        v-if="success"
        role="status"
        aria-live="polite"
        class="mb-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-lg text-sm text-center"
      >
        ✔ Contraseña actualizada. Redirigiendo al login...
      </div>

      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="mb-4 bg-red-100 border border-red-300 text-red-600 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form v-if="!success && token" @submit.prevent="submit" class="space-y-4" novalidate>
        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400" />
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            :class="inputClass(isPasswordValid, password.length > 0)"
          />
        </div>

        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400" />
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Confirmar contraseña"
            :class="inputClass(passwordsMatch, confirmPassword.length > 0)"
          />
        </div>

        <p v-if="confirmPassword.length > 0 && !passwordsMatch" class="text-red-500 text-xs">
          Las contraseñas no coinciden
        </p>

        <button
          :disabled="!isValid || loading"
          class="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium
                 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                 flex justify-center items-center gap-2 transition"
        >
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
          </svg>
          {{ loading ? "Actualizando..." : "Restablecer contraseña" }}
        </button>
      </form>

      <div v-if="!token" class="text-center mt-4">
        <RouterLink to="/forgot-password" class="text-blue-600 hover:underline text-sm">
          Solicitar nuevo enlace
        </RouterLink>
      </div>
    </div>
  </div>
</template>