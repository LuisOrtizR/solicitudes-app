<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { UserIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import BaseButton from "@/components/ui/BaseButton.vue";

const name = ref("");
const email = ref("");
const password = ref("");

const error = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

const isNameValid = computed(() => name.value.trim().length >= 3);
const isEmailValid = computed(() => /\S+@\S+\.\S+/.test(email.value));
const isPasswordValid = computed(() => password.value.length >= 6);
const isValid = computed(() => isNameValid.value && isEmailValid.value && isPasswordValid.value);

const inputBorderClass = (valid: boolean, touched: boolean) =>
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-red-400 focus:border-red-400";

const submit = async () => {
  if (!isValid.value || loading.value) return;

  try {
    loading.value = true;
    error.value = null;

    await auth.register({
      name: name.value.trim(),
      email: email.value.trim(),
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
  <div class="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 bg-gray-50 dark:bg-gray-950">
    <div class="w-full max-w-md bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
      <div class="flex items-center justify-center gap-2.5 mb-6">
        <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <UserIcon class="w-4.5 h-4.5 text-white" />
        </div>
        <span class="text-gray-900 dark:text-white font-semibold text-base">TicketFlow</span>
      </div>

      <h1 class="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
        Crear Cuenta
      </h1>

      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <form @submit.prevent="submit" class="space-y-4" novalidate>
        <div class="relative">
          <UserIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="name"
            type="text"
            autocomplete="name"
            placeholder="Nombre completo"
            :class="[
              'w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white',
              inputBorderClass(isNameValid, name.length > 0),
            ]"
          />
        </div>

        <div class="relative">
          <EnvelopeIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="Correo electrónico"
            :class="[
              'w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white',
              inputBorderClass(isEmailValid, email.length > 0),
            ]"
          />
        </div>

        <div class="relative">
          <LockClosedIcon class="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500 z-10" />
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            :class="[
              'w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition text-sm sm:text-base dark:bg-gray-800 dark:text-white',
              inputBorderClass(isPasswordValid, password.length > 0),
            ]"
          />
        </div>

        <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
          </svg>
          {{ loading ? "Creando..." : "Registrarse" }}
        </BaseButton>
      </form>

      <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿Ya tienes cuenta?
        <RouterLink to="/login" class="text-primary-600 dark:text-primary-400 hover:underline font-medium">
          Inicia sesión
        </RouterLink>
      </div>
    </div>
  </div>
</template>
