<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { useRouter, useRoute } from "vue-router";
import { authApi } from "../../api/endpoints/auth.api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

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

const borderClass = (valid: boolean, touched: boolean) =>
  !touched || valid
    ? "border-gray-300 dark:border-gray-600 focus:ring-primary-500"
    : "border-red-400 dark:border-red-500 focus:ring-red-400";

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
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Nueva Contraseña</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">Elige una nueva contraseña para tu cuenta.</p>

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
      class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
    >
      {{ error }}
    </div>

    <form v-if="!success && token" @submit.prevent="submit" class="space-y-4" novalidate>
      <BaseInput
        v-model="password"
        type="password"
        autocomplete="new-password"
        placeholder="Nueva contraseña (mín. 8 caracteres)"
        :icon="LockClosedIcon"
        :class="borderClass(isPasswordValid, password.length > 0)"
      />

      <BaseInput
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        placeholder="Confirmar contraseña"
        :icon="LockClosedIcon"
        :class="borderClass(passwordsMatch, confirmPassword.length > 0)"
      />

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
</template>
