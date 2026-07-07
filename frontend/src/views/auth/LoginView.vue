<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import {
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

const isValid = computed(() => {
  return email.value.includes("@") && password.value.length >= 6;
});

const submit = async () => {
  if (!isValid.value) return;

  try {
    loading.value = true;
    error.value = null;

    await auth.login({
      email: email.value,
      password: password.value,
    });

    router.push("/dashboard");
  } catch (err: any) {
    error.value = err?.response?.data?.message || "Credenciales inválidas";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6 py-8 bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900">
    <div class="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8">

      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">
        Iniciar Sesión
      </h1>

      <!-- ERROR -->
      <div
        v-if="error"
        class="mb-4 bg-red-100 text-red-600 text-sm p-3 rounded-lg border border-red-200"
      >
        {{ error }}
      </div>

      <form @submit.prevent="submit" class="space-y-4">

        <!-- EMAIL -->
        <div class="relative">
          <EnvelopeIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="email"
            type="email"
            placeholder="Correo electrónico"
            class="w-full pl-10 pr-4 py-2 border rounded-lg 
                   focus:ring-2 focus:ring-blue-500 outline-none
                   transition"
          />
        </div>

        <!-- PASSWORD -->
        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="password"
            type="password"
            placeholder="Contraseña"
            class="w-full pl-10 pr-4 py-2 border rounded-lg 
                   focus:ring-2 focus:ring-blue-500 outline-none
                   transition"
          />
        </div>

        <!-- BUTTON -->
        <button
          :disabled="!isValid || loading"
          class="w-full bg-blue-600 text-white py-2 rounded-lg 
                 hover:bg-blue-700 disabled:opacity-50
                 flex items-center justify-center gap-2 transition"
        >
          <svg
            v-if="loading"
            class="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="white"
              stroke-width="4"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="white"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>

          {{ loading ? "Entrando..." : "Entrar" }}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-600 space-y-2">
        <RouterLink to="/forgot-password" class="text-blue-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </RouterLink>

        <p>
          ¿No tienes cuenta?
          <RouterLink to="/register" class="text-blue-600 hover:underline">
            Regístrate
          </RouterLink>
        </p>
      </div>

    </div>
  </div>
</template>
