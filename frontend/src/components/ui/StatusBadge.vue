<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ status: string }>();

const config: Record<string, { color: string; dot: string; label: string }> = {
  open: {
    color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-900",
    dot: "bg-amber-400",
    label: "Abierta",
  },
  in_progress: {
    color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-900",
    dot: "bg-blue-400",
    label: "En Progreso",
  },
  waiting_user: {
    color: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-900",
    dot: "bg-violet-400",
    label: "Esp. Usuario",
  },
  resolved: {
    color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-900",
    dot: "bg-emerald-400",
    label: "Resuelta",
  },
  closed: {
    color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700",
    dot: "bg-gray-400",
    label: "Cerrada",
  },
  rejected: {
    color: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900",
    dot: "bg-red-400",
    label: "Rechazada",
  },
};

const current = computed(() => config[props.status] ?? config.open!);
</script>

<template>
  <span
    :class="current.color"
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
  >
    <span :class="current.dot" class="w-1.5 h-1.5 rounded-full shrink-0" />
    {{ current.label }}
  </span>
</template>
