<script setup lang="ts">
import { ref, computed } from "vue";
import { EnvelopeIcon } from "@heroicons/vue/24/outline";
import { authApi } from "../../api/endpoints/auth.api";

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
  <div
    class="min-h-screen flex items-center justify-center px-6 py-8 bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900"
  >
    <div class="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">
        Recuperar Contraseña
      </h1>

      <!-- ÉXITO -->
      <div
        v-if="success"
        class="mb-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-lg text-sm"
      >
        ✔ Si el correo existe, recibirás instrucciones en tu bandeja de entrada.
      </div>

      <!-- ERROR -->
      <div
        v-if="error"
        class="mb-4 bg-red-100 border border-red-300 text-red-600 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form v-if="!success" @submit.prevent="submit" class="space-y-4">
        <div class="relative">
          <EnvelopeIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="email"
            type="email"
            placeholder="Correo electrónico"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition',
              isValid
                ? 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                : 'border-red-400 focus:ring-2 focus:ring-red-400',
            ]"
          />
        </div>

        <button
          :disabled="!isValid || loading"
          class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2 transition"
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
          {{ loading ? "Enviando..." : "Enviar instrucciones" }}
        </button>
      </form>

      <div class="mt-6 text-center text-sm">
        <RouterLink to="/login" class="text-blue-600 hover:underline">
          Volver al login
        </RouterLink>
      </div>
    </div>
  </div>
</template>