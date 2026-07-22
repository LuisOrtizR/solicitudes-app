<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { UserIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

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
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Crear Cuenta</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">Regístrate para empezar a gestionar tickets.</p>

    <div
      v-if="error"
      role="alert"
      aria-live="assertive"
      class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
    >
      {{ error }}
    </div>

    <form @submit.prevent="submit" class="space-y-4" novalidate>
      <BaseInput
        v-model="name"
        type="text"
        autocomplete="name"
        placeholder="Nombre completo"
        :icon="UserIcon"
        :class="inputBorderClass(isNameValid, name.length > 0)"
      />

      <BaseInput
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="Correo electrónico"
        :icon="EnvelopeIcon"
        :class="inputBorderClass(isEmailValid, email.length > 0)"
      />

      <BaseInput
        v-model="password"
        type="password"
        autocomplete="new-password"
        placeholder="Contraseña (mínimo 6 caracteres)"
        :icon="LockClosedIcon"
        :class="inputBorderClass(isPasswordValid, password.length > 0)"
      />

      <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
        <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
          <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
        </svg>
        {{ loading ? "Creando..." : "Registrarse" }}
      </BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      ¿Ya tienes cuenta?
      <RouterLink to="/login" class="text-primary-600 dark:text-primary-400 hover:underline font-medium">
        Inicia sesión
      </RouterLink>
    </p>
  </div>
</template>
