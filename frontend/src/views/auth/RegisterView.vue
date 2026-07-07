<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";

const name = ref("");
const email = ref("");
const password = ref("");

const error = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

const isValid = computed(() => {
  return (
    name.value.length >= 3 &&
    email.value.includes("@") &&
    password.value.length >= 6
  );
});

const submit = async () => {
  if (!isValid.value) return;

  try {
    loading.value = true;
    error.value = null;

    await auth.register({
      name: name.value,
      email: email.value,
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
  <div class="min-h-screen flex items-center justify-center px-6 py-8 bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900">
    <div class="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8">

      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">
        Crear Cuenta
      </h1>

      <!-- ERROR -->
      <div
        v-if="error"
        class="mb-4 bg-red-100 border border-red-300 text-red-600 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form @submit.prevent="submit" class="space-y-4">

        <!-- NAME -->
        <div class="relative">
          <UserIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="name"
            type="text"
            placeholder="Nombre completo"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition',
              name.length >= 3
                ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                : 'border-red-400 focus:ring-2 focus:ring-red-400'
            ]"
          />
        </div>

        <!-- EMAIL -->
        <div class="relative">
          <EnvelopeIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="email"
            type="email"
            placeholder="Correo electrónico"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition',
              email.includes('@')
                ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                : 'border-red-400 focus:ring-2 focus:ring-red-400'
            ]"
          />
        </div>

        <!-- PASSWORD -->
        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          <input
            v-model="password"
            type="password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            :class="[
              'w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition',
              password.length >= 6
                ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                : 'border-red-400 focus:ring-2 focus:ring-red-400'
            ]"
          />
        </div>

        <!-- BUTTON -->
        <button
          :disabled="!isValid || loading"
          class="w-full bg-indigo-600 text-white py-2 rounded-lg
                 hover:bg-indigo-700 disabled:opacity-50
                 flex justify-center items-center gap-2 transition"
        >
          <svg
            v-if="loading"
            class="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
          </svg>
          {{ loading ? "Creando..." : "Registrarse" }}
        </button>

      </form>

      <div class="mt-6 text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?
        <RouterLink to="/login" class="text-indigo-600 hover:underline">
          Inicia sesión
        </RouterLink>
      </div>

    </div>
  </div>
</template>
