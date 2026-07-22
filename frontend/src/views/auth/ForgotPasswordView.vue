<script setup lang="ts">
import { ref, computed } from "vue";
import { EnvelopeIcon } from "@heroicons/vue/24/outline";
import { authApi } from "../../api/endpoints/auth.api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";

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
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">Recuperar Contraseña</h1>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-8">Te enviaremos instrucciones para restablecerla.</p>

    <!-- ÉXITO -->
    <div
      v-if="success"
      class="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm"
    >
      ✔ Si el correo existe, recibirás instrucciones en tu bandeja de entrada.
    </div>

    <!-- ERROR -->
    <div
      v-if="error"
      class="mb-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-500/20"
    >
      {{ error }}
    </div>

    <form v-if="!success" @submit.prevent="submit" class="space-y-4">
      <BaseInput
        v-model="email"
        type="email"
        placeholder="Correo electrónico"
        :icon="EnvelopeIcon"
        :class="isValid
          ? 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
          : 'border-red-400 dark:border-red-500 focus:ring-red-400'"
      />

      <BaseButton variant="primary" :disabled="!isValid || loading" class="w-full py-2.5">
        <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25" />
          <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75" />
        </svg>
        {{ loading ? "Enviando..." : "Enviar instrucciones" }}
      </BaseButton>
    </form>

    <div class="mt-6 text-center text-sm">
      <RouterLink to="/login" class="text-primary-600 dark:text-primary-400 hover:underline">
        Volver al login
      </RouterLink>
    </div>
  </div>
</template>
