<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ priority: string }>();

const config: Record<string, { color: string; label: string }> = {
  low: { color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", label: "Baja" },
  medium: { color: "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400", label: "Media" },
  high: { color: "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400", label: "Alta" },
  urgent: {
    color: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-bold",
    label: "🔥 Urgente",
  },
};

const current = computed(() => config[props.priority] ?? config.medium!);
</script>

<template>
  <span :class="current.color" class="px-2 py-0.5 rounded-lg text-xs">
    {{ current.label }}
  </span>
</template>
