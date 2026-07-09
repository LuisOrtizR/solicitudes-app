<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { XMarkIcon, KeyIcon } from "@heroicons/vue/24/outline";

const SHOW_BOT =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGIN === "true";

const DEMO_CREDENTIALS = {
  email: "admin@empresa.com",
  password: "Admin123*",
};

const AUTO_OPEN_DELAY_MS = 2000;

const emit = defineEmits<{
  (e: "autofill", payload: { email: string; password: string }): void;
}>();

const open = ref(false);
const dismissed = ref(false);
const copied = ref<"email" | "password" | null>(null);
let autoOpenTimer: ReturnType<typeof setTimeout> | null = null;

const clearAutoOpen = () => {
  if (autoOpenTimer) {
    clearTimeout(autoOpenTimer);
    autoOpenTimer = null;
  }
};

onMounted(() => {
  if (!SHOW_BOT) return;
  autoOpenTimer = setTimeout(() => {
    if (!dismissed.value) open.value = true;
  }, AUTO_OPEN_DELAY_MS);
});

onBeforeUnmount(clearAutoOpen);

const reopen = () => {
  clearAutoOpen();
  open.value = true;
  dismissed.value = false;
};

const close = () => {
  clearAutoOpen();
  open.value = false;
  dismissed.value = true;
};

const copy = async (field: "email" | "password") => {
  try {
    await navigator.clipboard.writeText(DEMO_CREDENTIALS[field]);
    copied.value = field;
    setTimeout(() => (copied.value = null), 1200);
  } catch {
    // Clipboard puede fallar en http:// o sin permisos; el valor sigue visible para copiar a mano.
  }
};

const autofill = () => {
  emit("autofill", DEMO_CREDENTIALS);
  close();
};
</script>

<template>
  <div v-if="SHOW_BOT">
    <!-- Barra inferior: no bloquea el centro de la pantalla -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-full"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-full"
    >
      <div
        v-if="open"
        role="dialog"
        aria-label="Credenciales de acceso de prueba"
        class="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-900/95 backdrop-blur-sm
               px-4 py-3.5 sm:px-6"
      >
        <div class="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <!-- Etiqueta -->
          <div class="flex items-center gap-2.5 shrink-0">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center">
              <KeyIcon class="w-4 h-4 text-indigo-300" aria-hidden="true" />
            </div>
            <div>
              <p class="text-white text-sm font-medium leading-tight">Entorno de demostración</p>
              <p class="text-slate-400 text-xs leading-tight">Credenciales de solo lectura</p>
            </div>
          </div>

          <!-- Credenciales -->
          <div class="flex flex-col sm:flex-row gap-2 flex-1 min-w-0" aria-live="polite">
            <button
              @click="copy('email')"
              class="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/10
                     rounded-lg px-3 py-2 text-left transition min-w-0 sm:w-56"
            >
              <span class="text-slate-300 text-xs font-mono truncate">{{ DEMO_CREDENTIALS.email }}</span>
              <span class="text-indigo-300 text-[11px] font-medium shrink-0">
                {{ copied === "email" ? "Copiado ✓" : "Copiar" }}
              </span>
            </button>

            <button
              @click="copy('password')"
              class="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/10
                     rounded-lg px-3 py-2 text-left transition min-w-0 sm:w-44"
            >
              <span class="text-slate-300 text-xs font-mono truncate">{{ DEMO_CREDENTIALS.password }}</span>
              <span class="text-indigo-300 text-[11px] font-medium shrink-0">
                {{ copied === "password" ? "Copiado ✓" : "Copiar" }}
              </span>
            </button>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="autofill"
              class="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium
                     px-4 py-2 rounded-lg transition active:scale-[0.98]"
            >
              Autocompletar
            </button>
            <button
              @click="close"
              aria-label="Cerrar aviso"
              class="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Pill discreto para reabrir, una vez cerrada -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
    >
      <button
        v-if="!open && dismissed"
        @click="reopen"
        aria-label="Mostrar credenciales de demo"
        class="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700
               border border-white/10 text-slate-300 text-xs font-medium px-3 py-2 rounded-full
               shadow-lg backdrop-blur-sm transition"
      >
        <KeyIcon class="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
        Demo
      </button>
    </Transition>
  </div>
</template>