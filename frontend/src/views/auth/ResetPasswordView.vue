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
  token.value = route.query.token as string;

  if (!token.value) {
    error.value = "Token inválido o expirado. Solicita un nuevo enlace.";
  }
});

const isValid = computed(
  () =>
    password.value.length >= 8 && password.value === confirmPassword.value
);

const submit = async () => {
  if (!isValid.value) {
    error.value = "Las contraseñas no coinciden o tienen menos de 8 caracteres";
    return;
  }

  if (!token.value) {
    error.value = "Token inválido o expirado. Solicita un nuevo enlace.";
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    await authApi.reset(token.value, password.value);

    success.value = true;

    setTimeout(() => router.push("/login"), 2000);
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || "Error al restablecer contraseña";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center px-6 py-8 bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900"
  >
    <div class="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">
        Nueva Contraseña
      </h1>

      <!-- ÉXITO -->
      <div
        v-if="success"
        class="mb-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-lg text-sm text-center"
      >
        ✔ Contraseña actualizada. Redirigiendo al login...
      </div>

      <!-- ERROR -->
      <div
        v-if="error"
        class="mb-4 bg-red-100 border border-red-300 text-red-600 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form v-if="!success && token" @submit.prevent="submit" class="space-y-4">
        <!-- NUEVA CONTRASEÑA -->
        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="password"
            type="password"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition',
              password.length >= 8
                ? 'border-gray-300 focus:ring-2 focus:ring-purple-500'
                : 'border-red-400 focus:ring-2 focus:ring-red-400',
            ]"
          />
        </div>

        <!-- CONFIRMAR CONTRASEÑA -->
        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirmar contraseña"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition',
              confirmPassword.length > 0 && password === confirmPassword
                ? 'border-gray-300 focus:ring-2 focus:ring-purple-500'
                : 'border-red-400 focus:ring-2 focus:ring-red-400',
            ]"
          />
        </div>

        <!-- INDICADOR -->
        <p
          v-if="confirmPassword.length > 0 && password !== confirmPassword"
          class="text-red-500 text-xs"
        >
          Las contraseñas no coinciden
        </p>

        <button
          :disabled="!isValid || loading"
          class="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2 transition"
        >
          <svg
            v-if="loading"
            class="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="white"
              stroke-width="4"
              fill="none"
              class="opacity-25"
            />
            <path
              fill="white"
              d="M4 12a8 8 0 018-8v8z"
              class="opacity-75"
            />
          </svg>
          {{ loading ? "Actualizando..." : "Restablecer contraseña" }}
        </button>
      </form>

      <!-- TOKEN INVÁLIDO -->
      <div v-if="!token" class="text-center mt-4">
        <RouterLink to="/forgot-password" class="text-blue-600 hover:underline text-sm">
          Solicitar nuevo enlace
        </RouterLink>
      </div>
    </div>
  </div>
</template>