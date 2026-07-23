<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ category?: string | null }>();

const config: Record<string, { color: string; label: string }> = {
  soporte_tecnico: { color: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400", label: "Soporte Técnico" },
  accesos_permisos: { color: "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400", label: "Accesos y Permisos" },
  hardware: { color: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400", label: "Hardware" },
  software: { color: "bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400", label: "Software" },
  otro: { color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300", label: "Otro" },
};

const current = computed(() => config[props.category ?? "otro"] ?? config.otro!);
</script>

<template>
  <span :class="current.color" class="px-2 py-0.5 rounded-lg text-xs">
    {{ current.label }}
  </span>
</template>
